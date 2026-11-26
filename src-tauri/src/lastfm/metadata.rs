use super::Service;
use base64::Engine;
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::BTreeMap,
    sync::Arc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::Manager;
use tokio::task::JoinSet;

#[derive(Clone, Serialize, Deserialize)]
pub struct Match {
    pub name: String,
    pub artist: String,
    pub artwork: Option<String>,
    pub year: Option<String>,
    pub url: String,
}
#[derive(Serialize)]
pub struct Suggestion {
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub track: Option<u32>,
    pub artwork: Option<String>,
    pub year: Option<String>,
    pub url: String,
}
#[derive(Serialize)]
pub struct AlbumTrack {
    pub title: String,
    pub artist: String,
    pub track: u32,
}

fn text(value: &Value) -> Option<String> {
    value
        .as_str()
        .filter(|s| !s.trim().is_empty())
        .map(str::to_owned)
}
fn artist(value: &Value) -> String {
    text(value)
        .or_else(|| value.get("name").and_then(text))
        .unwrap_or_default()
}
fn images(value: &Value) -> Option<String> {
    let candidates: Vec<&Value> = if let Some(items) = value.as_array() {
        items.iter().rev().collect()
    } else if value.is_object() {
        vec![value]
    } else {
        return None;
    };
    candidates
        .into_iter()
        .filter_map(|v| {
            v.get("#text")
                .and_then(text)
                .or_else(|| v.get("url").and_then(text))
        })
        .find_map(|value| {
            normalize_art_url(&value)
                .filter(|url| !url.contains("2a96cbd8b46e442fc41c2b86b821562f"))
        })
}

const ARTWORK_CACHE_TTL_SECONDS: i64 = 30 * 24 * 60 * 60;
const NEGATIVE_ARTWORK_CACHE_TTL_SECONDS: i64 = 60 * 60;

fn artwork_artist_candidates(artist: &str) -> Vec<String> {
    let full_artist = artist.trim();
    let mut candidates = Vec::new();
    if !full_artist.is_empty() {
        candidates.push(full_artist.to_string());
    }

    // Audio tags sometimes contain the full performer credit, while Last.fm
    // indexes the album under the primary artist (for example,
    // "Papangu, Marco Mayer, ..." vs. "Papangu").
    if let Some(primary_artist) = full_artist
        .split([',', ';'])
        .next()
        .map(str::trim)
        .filter(|primary| !primary.is_empty() && !primary.eq_ignore_ascii_case(full_artist))
    {
        candidates.push(primary_artist.to_string());
    }

    candidates
}

async fn album_artwork_for_artist(service: &Service, artist: &str, album: &str) -> Option<String> {
    let response = match service
        .client
        .request(
            "album.getInfo",
            BTreeMap::from([
                ("artist".into(), artist.into()),
                ("album".into(), album.into()),
                ("autocorrect".into(), "0".into()),
            ]),
            None,
        )
        .await
    {
        Ok(response) => response,
        Err(error) => {
            log::debug!(
                "Discord artwork lookup failed: method=album.getInfo, artist_candidate_len={}, album_len={}, error={}",
                artist.len(),
                album.len(),
                error.code
            );
            return None;
        }
    };
    let details = &response["album"];
    if !details.is_object() {
        return None;
    }

    if let Some(artwork) = images(&details["image"]) {
        return Some(artwork);
    }

    let page = source_url(&details["url"]);
    if page == "https://www.last.fm/" {
        None
    } else {
        page_artwork(&page).await
    }
}

async fn album_search_artwork(
    service: &Service,
    artist_candidates: &[String],
    album: &str,
) -> Option<String> {
    let response = match service
        .client
        .request(
            "album.search",
            BTreeMap::from([("album".into(), album.into())]),
            None,
        )
        .await
    {
        Ok(response) => response,
        Err(error) => {
            log::debug!(
                "Discord artwork lookup failed: method=album.search, album_len={}, error={}",
                album.len(),
                error.code
            );
            return None;
        }
    };
    let rows = &response["results"]["albummatches"]["album"];
    let rows = if let Some(rows) = rows.as_array() {
        rows.iter().collect::<Vec<_>>()
    } else if rows.is_object() {
        vec![rows]
    } else {
        return None;
    };

    let album_name = album.trim();
    let result = rows.into_iter().find(|row| {
        let exact_album_match =
            text(&row["name"]).is_some_and(|name| name.eq_ignore_ascii_case(album_name));
        let result_artist = artist(&row["artist"]);
        exact_album_match
            && artist_candidates
                .iter()
                .any(|candidate| candidate.eq_ignore_ascii_case(&result_artist))
    })?;

    if let Some(artwork) = images(&result["image"]) {
        return Some(artwork);
    }
    let page = source_url(&result["url"]);
    if page == "https://www.last.fm/" {
        None
    } else {
        page_artwork(&page).await
    }
}

/// Resolve a public Last.fm album image for Discord and persist the URL so
/// subsequent tracks from the same album do not issue another API request.
pub(crate) async fn resolve_discord_artwork(
    service: &Service,
    artist: &str,
    album: &str,
) -> Option<String> {
    // Bump the key namespace when changing lookup behavior so cached misses
    // from an older resolver do not hide newly discoverable artwork.
    let artist_name = artist.trim();
    let album_name = album.trim();
    let artist_key = format!("discord-artwork-v2:{}", artist_name.to_lowercase());
    let album_key = album_name.to_lowercase();
    if artist_name.is_empty()
        || album_key.is_empty()
        || artist_name.len() > 500
        || album_key.len() > 500
    {
        return None;
    }

    let _lookup = service.artwork_gate.lock().await;
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
    let cached = {
        let conn = service.db.lock().ok()?;
        conn.query_row(
            "SELECT artwork_url, fetched_at FROM lastfm_album_artwork
             WHERE artist_key = ?1 AND album_key = ?2",
            params![artist_key, album_key],
            |row| Ok((row.get::<_, Option<String>>(0)?, row.get::<_, i64>(1)?)),
        )
        .optional()
        .ok()?
    };

    if let Some((artwork_url, fetched_at)) = cached {
        let ttl = if artwork_url.is_some() {
            ARTWORK_CACHE_TTL_SECONDS
        } else {
            NEGATIVE_ARTWORK_CACHE_TTL_SECONDS
        };
        if now.saturating_sub(fetched_at) < ttl {
            match artwork_url {
                Some(url) => {
                    if let Some(url) = normalize_art_url(&url) {
                        log::debug!("Discord artwork cache hit: result=found");
                        return Some(url);
                    }
                }
                None => {
                    log::debug!("Discord artwork cache hit: result=not_found");
                    return None;
                }
            }
        }
    }

    if !service.client.configured() {
        return None;
    }
    let artist_candidates = artwork_artist_candidates(artist);
    let mut artwork = None;
    for (index, candidate) in artist_candidates.iter().enumerate() {
        artwork = album_artwork_for_artist(service, candidate, album).await;
        if artwork.is_some() {
            log::info!(
                "Discord artwork resolved: source=album.getInfo, artist_candidate_index={index}, artist_candidates={}",
                artist_candidates.len()
            );
            break;
        }
    }
    if artwork.is_none() {
        artwork = album_search_artwork(service, &artist_candidates, album).await;
        if artwork.is_some() {
            log::info!("Discord artwork resolved: source=album.search");
        }
    }
    if artwork.is_none() {
        log::warn!(
            "Discord artwork unavailable from Last.fm: artist_candidates={}, album_len={}",
            artist_candidates.len(),
            album.len()
        );
    }

    {
        let conn = service.db.lock().ok()?;
        if let Err(error) = conn.execute(
            "INSERT INTO lastfm_album_artwork (artist_key, album_key, artwork_url, fetched_at)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(artist_key, album_key) DO UPDATE SET
                artwork_url = excluded.artwork_url,
                fetched_at = excluded.fetched_at",
            params![artist_key, album_key, artwork, now],
        ) {
            log::warn!("Failed to cache Last.fm album artwork: {error}");
        }
    }

    artwork
}
fn release_year(value: &Value) -> Option<String> {
    let raw = text(value)?;
    let bytes = raw.as_bytes();
    let start = bytes
        .windows(4)
        .position(|digits| digits.iter().all(u8::is_ascii_digit))?;
    raw.get(start..start + 4).map(str::to_owned)
}
fn html_attribute<'a>(tag: &'a str, name: &str) -> Option<&'a str> {
    let bytes = tag.as_bytes();
    let mut offset = 0;
    while offset < bytes.len() {
        while offset < bytes.len() && (bytes[offset].is_ascii_whitespace() || bytes[offset] == b'<')
        {
            offset += 1;
        }
        let start = offset;
        while offset < bytes.len()
            && !bytes[offset].is_ascii_whitespace()
            && bytes[offset] != b'='
            && bytes[offset] != b'>'
        {
            offset += 1;
        }
        if start == offset {
            offset += 1;
            continue;
        }
        let key = &tag[start..offset];
        while offset < bytes.len() && bytes[offset].is_ascii_whitespace() {
            offset += 1;
        }
        if offset >= bytes.len() || bytes[offset] != b'=' {
            continue;
        }
        offset += 1;
        while offset < bytes.len() && bytes[offset].is_ascii_whitespace() {
            offset += 1;
        }
        if offset >= bytes.len() {
            break;
        }
        let quote = if bytes[offset] == b'\'' || bytes[offset] == b'"' {
            let q = bytes[offset];
            offset += 1;
            Some(q)
        } else {
            None
        };
        let value_start = offset;
        if let Some(quote) = quote {
            while offset < bytes.len() && bytes[offset] != quote {
                offset += 1;
            }
        } else {
            while offset < bytes.len()
                && !bytes[offset].is_ascii_whitespace()
                && bytes[offset] != b'>'
            {
                offset += 1;
            }
        }
        if key.eq_ignore_ascii_case(name) {
            return tag.get(value_start..offset);
        }
        if quote.is_some() && offset < bytes.len() {
            offset += 1;
        }
    }
    None
}
async fn page_artwork(url: &str) -> Option<String> {
    let http = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .redirect(reqwest::redirect::Policy::custom(|attempt| {
            if attempt.previous().len() >= 3 || !valid_page_url(attempt.url().as_str()) {
                attempt.stop()
            } else {
                attempt.follow()
            }
        }))
        .user_agent(concat!("Songbridge/", env!("CARGO_PKG_VERSION")))
        .build()
        .ok()?;
    let response = http.get(url).send().await.ok()?.error_for_status().ok()?;
    const MAX_PAGE: usize = 2 * 1024 * 1024;
    if response
        .content_length()
        .is_some_and(|n| n > MAX_PAGE as u64)
    {
        return None;
    }
    let bytes = response.bytes().await.ok()?;
    if bytes.len() > MAX_PAGE {
        return None;
    }
    let html = String::from_utf8_lossy(&bytes);
    for tag in html.split('<').filter(|part| {
        part.get(..4)
            .is_some_and(|s| s.eq_ignore_ascii_case("meta"))
    }) {
        let tag = tag.split('>').next().unwrap_or_default();
        let property = html_attribute(tag, "property").or_else(|| html_attribute(tag, "name"));
        if property.is_some_and(|value| {
            value.eq_ignore_ascii_case("og:image") || value.eq_ignore_ascii_case("twitter:image")
        }) {
            if let Some(image) = html_attribute(tag, "content") {
                let image = image.replace("&amp;", "&");
                if let Some(image) = normalize_art_url(&image)
                    .filter(|url| !url.contains("2a96cbd8b46e442fc41c2b86b821562f"))
                {
                    return Some(image);
                }
            }
        }
    }
    None
}
pub(crate) fn valid_art_url(value: &str) -> bool {
    url::Url::parse(value).ok().is_some_and(|u| {
        u.scheme() == "https"
            && u.username().is_empty()
            && u.password().is_none()
            && u.port().is_none()
            && matches!(
                u.host_str(),
                Some(
                    "lastfm.freetls.fastly.net"
                        | "lastfm-img.freetls.fastly.net"
                        | "lastfm-img2.akamaized.net"
                        | "userserve-ak.last.fm"
                )
            )
    })
}
fn normalize_art_url(value: &str) -> Option<String> {
    let mut url = url::Url::parse(value).ok()?;
    if url.scheme() == "http" {
        // Older Last.fm API responses still return userserve-ak links over
        // HTTP. Upgrade only known image CDNs; downloads and redirects remain
        // HTTPS-only in valid_art_url.
        url.set_scheme("https").ok()?;
    }
    let normalized = url.to_string();
    valid_art_url(&normalized).then_some(normalized)
}
fn valid_page_url(value: &str) -> bool {
    url::Url::parse(value).ok().is_some_and(|url| {
        url.scheme() == "https"
            && url.username().is_empty()
            && url.password().is_none()
            && url.port().is_none()
            && matches!(url.host_str(), Some("www.last.fm" | "last.fm"))
    })
}
fn source_url(value: &Value) -> String {
    text(value)
        .and_then(|s| url::Url::parse(&s).ok())
        .filter(|u| {
            matches!(u.scheme(), "http" | "https")
                && u.username().is_empty()
                && u.password().is_none()
                && u.port().is_none()
                && matches!(u.host_str(), Some("www.last.fm" | "last.fm"))
        })
        .map(|mut u| {
            let _ = u.set_scheme("https");
            u.to_string()
        })
        .unwrap_or_else(|| "https://www.last.fm/".into())
}

#[tauri::command]
pub async fn lastfm_search(
    service: tauri::State<'_, Arc<Service>>,
    kind: String,
    query: String,
    artist_name: String,
) -> Result<Vec<Match>, String> {
    let _gate = service.gate.lock().await;
    service.session_key()?;
    if !matches!(kind.as_str(), "track" | "album")
        || query.trim().is_empty()
        || query.len() > 500
        || artist_name.len() > 500
    {
        return Err("invalid_request".into());
    }
    let mut params = BTreeMap::from([(kind.clone(), query), ("limit".into(), "15".into())]);
    if kind == "track" && !artist_name.trim().is_empty() {
        params.insert("artist".into(), artist_name);
    }
    let body = service
        .client
        .request(&format!("{kind}.search"), params, None)
        .await
        .map_err(|e| e.code)?;
    drop(_gate);
    let values = &body["results"][format!("{kind}matches")][&kind];
    let rows = if let Some(a) = values.as_array() {
        a.clone()
    } else if values.is_object() {
        vec![values.clone()]
    } else {
        vec![]
    };
    let mut matches: Vec<Match> = rows
        .into_iter()
        .filter_map(|v| {
            Some(Match {
                name: text(&v["name"])?,
                artist: artist(&v["artist"]),
                artwork: images(&v["image"]),
                year: release_year(&v["releasedate"]),
                url: source_url(&v["url"]),
            })
        })
        .collect();

    // Search responses frequently omit album art even when the album page has
    // it. Resolve missing images before returning so each result card can show
    // the cover without requiring the user to select the match first.
    let mut artwork_tasks = JoinSet::new();
    for (index, result) in matches.iter().enumerate() {
        if result.artwork.is_none() && result.url != "https://www.last.fm/" {
            let url = result.url.clone();
            artwork_tasks.spawn(async move { (index, page_artwork(&url).await) });
        }
    }
    while let Some(result) = artwork_tasks.join_next().await {
        if let Ok((index, Some(artwork))) = result {
            matches[index].artwork = Some(artwork);
        }
    }
    let cover_count = matches
        .iter()
        .filter(|result| result.artwork.is_some())
        .count();
    log::info!(
        "Last.fm search completed: kind={kind}, matches={}, covers={cover_count}",
        matches.len()
    );
    Ok(matches)
}

#[tauri::command]
pub async fn lastfm_details(
    service: tauri::State<'_, Arc<Service>>,
    kind: String,
    name: String,
    artist_name: String,
) -> Result<Suggestion, String> {
    let _gate = service.gate.lock().await;
    service.session_key()?;
    if !matches!(kind.as_str(), "track" | "album") || name.len() > 500 || artist_name.len() > 500 {
        return Err("invalid_request".into());
    }
    let body = service
        .client
        .request(
            &format!("{kind}.getInfo"),
            BTreeMap::from([
                (kind.clone(), name),
                ("artist".into(), artist_name),
                ("autocorrect".into(), "0".into()),
            ]),
            None,
        )
        .await
        .map_err(|e| e.code)?;
    drop(_gate);
    let v = &body[&kind];
    if !v.is_object() {
        return Err("no_results".into());
    }
    let mut suggestion = if kind == "album" {
        Suggestion {
            title: None,
            artist: Some(artist(&v["artist"])),
            album: text(&v["name"]),
            track: None,
            artwork: images(&v["image"]),
            year: release_year(&v["releasedate"]),
            url: source_url(&v["url"]),
        }
    } else {
        Suggestion {
            title: text(&v["name"]),
            artist: Some(artist(&v["artist"])),
            album: text(&v["album"]["title"]),
            track: v["album"]["@attr"]["position"]
                .as_str()
                .and_then(|s| s.parse().ok())
                .or_else(|| {
                    v["album"]["position"]
                        .as_u64()
                        .and_then(|n| n.try_into().ok())
                }),
            artwork: images(&v["album"]["image"]),
            year: release_year(&v["album"]["releasedate"]),
            url: source_url(&v["url"]),
        }
    };
    if suggestion.artwork.is_none() && suggestion.url != "https://www.last.fm/" {
        suggestion.artwork = page_artwork(&suggestion.url).await;
    }
    Ok(suggestion)
}

#[tauri::command]
pub async fn lastfm_album_tracks(
    service: tauri::State<'_, Arc<Service>>,
    album: String,
    artist_name: String,
) -> Result<Vec<AlbumTrack>, String> {
    let _gate = service.gate.lock().await;
    service.session_key()?;
    if album.trim().is_empty() || album.len() > 500 || artist_name.len() > 500 {
        return Err("invalid_request".into());
    }
    let body = service
        .client
        .request(
            "album.getInfo",
            BTreeMap::from([
                ("album".into(), album),
                ("artist".into(), artist_name),
                ("autocorrect".into(), "0".into()),
            ]),
            None,
        )
        .await
        .map_err(|error| error.code)?;
    let album_info = body.get("album").ok_or("no_results")?;
    let album_artist = artist(&album_info["artist"]);
    let rows = &album_info["tracks"]["track"];
    let rows = if let Some(rows) = rows.as_array() {
        rows.clone()
    } else if rows.is_object() {
        vec![rows.clone()]
    } else {
        return Err("no_results".into());
    };
    Ok(rows
        .into_iter()
        .enumerate()
        .filter_map(|(index, row)| {
            Some(AlbumTrack {
                title: text(&row["name"])?,
                artist: {
                    let track_artist = artist(&row["artist"]);
                    if track_artist.is_empty() {
                        album_artist.clone()
                    } else {
                        track_artist
                    }
                },
                track: row["@attr"]["rank"]
                    .as_str()
                    .and_then(|rank| rank.parse().ok())
                    .or_else(|| {
                        row["@attr"]["rank"]
                            .as_u64()
                            .and_then(|rank| rank.try_into().ok())
                    })
                    .unwrap_or(index as u32 + 1),
            })
        })
        .collect())
}

#[derive(Serialize)]
pub struct Artwork {
    pub path: String,
    pub preview: String,
}

#[tauri::command]
pub async fn lastfm_artwork(
    app: tauri::AppHandle,
    service: tauri::State<'_, Arc<Service>>,
    url: String,
) -> Result<Artwork, String> {
    service.session_key()?;
    let url = normalize_art_url(&url).ok_or("invalid_artwork")?;
    let http = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .redirect(reqwest::redirect::Policy::custom(|attempt| {
            if attempt.previous().len() >= 3 || !valid_art_url(attempt.url().as_str()) {
                attempt.stop()
            } else {
                attempt.follow()
            }
        }))
        .build()
        .map_err(|_| "offline")?;
    let mut response = http
        .get(url)
        .send()
        .await
        .map_err(|_| "offline")?
        .error_for_status()
        .map_err(|_| "invalid_artwork")?;
    const MAX: usize = 10 * 1024 * 1024;
    if response.content_length().is_some_and(|n| n > MAX as u64) {
        return Err("invalid_artwork".into());
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(|_| "offline")? {
        if bytes.len() + chunk.len() > MAX {
            return Err("invalid_artwork".into());
        }
        bytes.extend_from_slice(&chunk);
    }
    let dir = app
        .path()
        .app_cache_dir()
        .map_err(|_| "invalid_artwork")?
        .join("lastfm-artwork");
    tauri::async_runtime::spawn_blocking(move || {
        let mut reader = image::ImageReader::new(std::io::Cursor::new(bytes))
            .with_guessed_format()
            .map_err(|_| "invalid_artwork")?;
        let mut limits = image::Limits::default();
        limits.max_image_width = Some(8192);
        limits.max_image_height = Some(8192);
        limits.max_alloc = Some(64 * 1024 * 1024);
        reader.limits(limits);
        let image = reader
            .decode()
            .map_err(|_| "invalid_artwork")?
            .thumbnail(1500, 1500)
            .to_rgb8();
        let mut jpeg = Vec::new();
        image::codecs::jpeg::JpegEncoder::new_with_quality(&mut jpeg, 90)
            .encode_image(&image)
            .map_err(|_| "invalid_artwork")?;
        std::fs::create_dir_all(&dir).map_err(|_| "invalid_artwork")?;
        let path = dir.join(format!("{:x}.jpg", md5::compute(&jpeg)));
        std::fs::write(&path, &jpeg).map_err(|_| "invalid_artwork")?;
        // Keep only recent previews, with both count and byte limits.
        if let Ok(entries) = std::fs::read_dir(&dir) {
            let mut files: Vec<_> = entries
                .flatten()
                .filter_map(|e| {
                    let meta = e.metadata().ok()?;
                    if !meta.is_file() {
                        return None;
                    }
                    Some((e.path(), meta.modified().ok()?, meta.len()))
                })
                .collect();
            files.sort_by_key(|(_, modified, _)| std::cmp::Reverse(*modified));
            let mut bytes = 0;
            for (index, (file, modified, len)) in files.into_iter().enumerate() {
                bytes += len;
                if file != path
                    && (index >= 20
                        || bytes > 50 * 1024 * 1024
                        || modified
                            .elapsed()
                            .is_ok_and(|age| age > Duration::from_secs(86400)))
                {
                    let _ = std::fs::remove_file(file);
                }
            }
        }
        Ok(Artwork {
            path: path.to_string_lossy().into(),
            preview: format!(
                "data:image/jpeg;base64,{}",
                base64::engine::general_purpose::STANDARD.encode(jpeg)
            ),
        })
    })
    .await
    .map_err(|_| "invalid_artwork".to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn artwork_downloads_only_use_known_https_cdn_hosts() {
        assert!(valid_art_url(
            "https://lastfm.freetls.fastly.net/i/u/300x300/a.png"
        ));
        for url in [
            "http://lastfm.freetls.fastly.net/a",
            "https://localhost/a",
            "https://lastfm.freetls.fastly.net.evil.test/a",
            "file:///tmp/x",
            "https://user@lastfm.freetls.fastly.net/a",
        ] {
            assert!(!valid_art_url(url));
        }
    }
}
