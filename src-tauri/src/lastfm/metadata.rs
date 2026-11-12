use super::Service;
use base64::Engine;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{collections::BTreeMap, sync::Arc, time::Duration};
use tauri::Manager;

#[derive(Clone, Serialize, Deserialize)]
pub struct Match {
    pub name: String,
    pub artist: String,
    pub url: String,
}
#[derive(Serialize)]
pub struct Suggestion {
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub track: Option<u32>,
    pub artwork: Option<String>,
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
    value
        .as_array()?
        .iter()
        .rev()
        .filter_map(|v| v.get("#text").and_then(text))
        .find(|s| valid_art_url(s) && !s.contains("2a96cbd8b46e442fc41c2b86b821562f"))
}
fn valid_art_url(value: &str) -> bool {
    url::Url::parse(value).ok().is_some_and(|u| {
        u.scheme() == "https"
            && u.username().is_empty()
            && u.password().is_none()
            && u.port().is_none()
            && matches!(
                u.host_str(),
                Some(
                    "lastfm.freetls.fastly.net"
                        | "lastfm-img2.akamaized.net"
                        | "userserve-ak.last.fm"
                )
            )
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
    let values = &body["results"][format!("{kind}matches")][&kind];
    let rows = if let Some(a) = values.as_array() {
        a.clone()
    } else if values.is_object() {
        vec![values.clone()]
    } else {
        vec![]
    };
    Ok(rows
        .into_iter()
        .filter_map(|v| {
            Some(Match {
                name: text(&v["name"])?,
                artist: artist(&v["artist"]),
                url: source_url(&v["url"]),
            })
        })
        .collect())
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
    let v = &body[&kind];
    if !v.is_object() {
        return Err("no_results".into());
    }
    Ok(if kind == "album" {
        Suggestion {
            title: None,
            artist: Some(artist(&v["artist"])),
            album: text(&v["name"]),
            track: None,
            artwork: images(&v["image"]),
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
            url: source_url(&v["url"]),
        }
    })
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
    let _gate = service.gate.lock().await;
    service.session_key()?;
    if !valid_art_url(&url) {
        return Err("invalid_artwork".into());
    }
    let http = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .redirect(reqwest::redirect::Policy::none())
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
