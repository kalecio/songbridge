// Native "Now Playing" / media-key bridge built on top of `souvlaki`.
//
// On macOS this registers Songbridge with `MPRemoteCommandCenter` (so the
// hardware media keys, Bluetooth headsets, AirPods double-tap, and Control
// Center route to us instead of Apple Music) and publishes the current track
// to `MPNowPlayingInfoCenter` (so it shows on the lock screen and Control
// Center). On Windows it uses `SystemMediaTransportControls`; on Linux it
// publishes via MPRIS over D-Bus.
//
// Media-key presses are forwarded to the frontend as Tauri events:
//   - "media-key:play-pause"
//   - "media-key:next"
//   - "media-key:previous"

use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use base64::Engine;
use souvlaki::{MediaControlEvent, MediaControls, MediaMetadata, MediaPlayback, PlatformConfig};
use tauri::{AppHandle, Emitter, Manager};
use url::Url;

#[derive(Default, Clone, serde::Deserialize)]
pub struct NowPlayingPayload {
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub duration_seconds: Option<u64>,
    /// Album art as a "data:image/jpeg;base64,..." URL. Decoded to a temp
    /// file so we can hand the OS now-playing surface a file:// URL — most
    /// platforms reject long data URLs.
    pub cover_data_url: Option<String>,
}

#[derive(Default, Clone, serde::Deserialize)]
pub struct PlaybackStatePayload {
    pub is_playing: bool,
    pub elapsed_seconds: Option<f64>,
}

pub struct NowPlayingState(pub Arc<Mutex<Option<MediaControls>>>);

/// Parse a `data:image/<kind>;base64,<body>` URL into `(extension, bytes)`.
/// We only inspect the header for "png" — everything else is treated as
/// a JPEG, matching what `extract_album_art` produces on the Rust side.
fn parse_cover_data_url(data_url: &str) -> Option<(&'static str, Vec<u8>)> {
    let comma = data_url.find(',')?;
    let header = &data_url[..comma];
    let body = &data_url[comma + 1..];
    let ext = if header.contains("png") { "png" } else { "jpg" };
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(body.as_bytes())
        .ok()?;
    Some((ext, bytes))
}

/// Sniff the file's magic bytes to make sure we don't hand SMTC a payload
/// that decodes back to garbage (e.g. an MP3 ID3 tag whose APIC frame was
/// already mangled before it reached us). Returns the canonical extension
/// we should use when writing the file, or `None` if it isn't a supported
/// image format.
fn detect_image_kind(bytes: &[u8]) -> Option<&'static str> {
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some("jpg")
    } else if bytes.starts_with(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]) {
        Some("png")
    } else {
        None
    }
}

/// Reverse of `cover_path_to_url` — used by the diagnostic log to confirm the
/// file we just promised SMTC actually exists on disk.
fn file_url_to_path(url: &str) -> Option<PathBuf> {
    Url::parse(url).ok()?.to_file_path().ok()
}

/// Build a properly-formatted `file://` URL for an absolute filesystem path.
///
/// Hand-rolled `format!("file:///{}")` strings break on real-world paths that
/// contain spaces (`C:\Users\Maria José\…`), accents, `&`, `#`, `?`, `%`, or
/// any non-ASCII character. WinRT's `Uri::CreateUri` (used by SMTC under the
/// hood when souvlaki sets the cover) returns `ERROR_BAD_PATHNAME` in those
/// cases, surfacing as the cryptic
/// `HRESULT(0x800700A1) … "(UNABLE_TO_MASK_PATH) … 1440741640"`.
///
/// `Url::from_file_path` does the right thing on every platform: the path is
/// percent-encoded, backslashes become forward slashes on Windows, and we
/// always get the canonical three-slash `file:///` form.
fn cover_path_to_url(path: &Path) -> Option<String> {
    Url::from_file_path(path).ok().map(|u| u.to_string())
}

/// Resolve the temp-file path we write album art to.
///
/// The path embeds a content hash so each unique cover lands at a unique
/// filename. This is important on Windows: SMTC caches the thumbnail by
/// URL, so reusing the same filename means the OS keeps showing the
/// previous track's cover even after the bytes on disk change. Hashing
/// gives us free deduplication across an album as a bonus.
fn cover_temp_path(ext: &str, bytes: &[u8]) -> PathBuf {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    bytes.hash(&mut hasher);
    let hash = hasher.finish();
    std::env::temp_dir().join(format!("songbridge-cover-{:016x}.{}", hash, ext))
}

/// Decode a data URL into a temp file and return its `file://` URL.
fn write_cover_to_temp(data_url: &str) -> Option<String> {
    let (_header_ext, bytes) = parse_cover_data_url(data_url)?;
    // Trust the byte signature, not the data-URL header — a broken APIC
    // frame can claim `image/jpeg` while the body is garbage, and SMTC
    // surfaces that as a generic `BAD_PATHNAME` later on.
    let ext = detect_image_kind(&bytes)?;
    let path = cover_temp_path(ext, &bytes);
    // Reuse the file if a previous track already produced this exact cover
    // (e.g. another song from the same album). Saves both the disk write
    // and the SMTC re-decode.
    if !path.exists() {
        std::fs::write(&path, bytes).ok()?;
    }
    cover_path_to_url(&path)
}

pub fn init(app: &AppHandle) {
    let app_handle = app.clone();

    // souvlaki only needs the HWND on Windows; macOS / Linux can pass None.
    #[cfg(target_os = "windows")]
    let hwnd: Option<*mut std::ffi::c_void> = app
        .get_webview_window("main")
        .and_then(|w| w.hwnd().ok())
        .map(|h| h.0 as *mut _);
    #[cfg(not(target_os = "windows"))]
    let hwnd: Option<*mut std::ffi::c_void> = None;

    let config = PlatformConfig {
        dbus_name: "songbridge",
        display_name: "Songbridge",
        hwnd,
    };

    let controls = match MediaControls::new(config) {
        Ok(c) => c,
        Err(e) => {
            log::warn!("Failed to create media controls: {:?}", e);
            app.manage(NowPlayingState(Arc::new(Mutex::new(None))));
            return;
        }
    };

    let controls = Arc::new(Mutex::new(Some(controls)));

    {
        let app_for_handler = app_handle.clone();
        if let Some(ref mut c) = *controls.lock().unwrap() {
            if let Err(e) = c.attach(move |event: MediaControlEvent| match event {
                MediaControlEvent::Play | MediaControlEvent::Pause | MediaControlEvent::Toggle => {
                    let _ = app_for_handler.emit("media-key:play-pause", ());
                }
                MediaControlEvent::Next => {
                    let _ = app_for_handler.emit("media-key:next", ());
                }
                MediaControlEvent::Previous => {
                    let _ = app_for_handler.emit("media-key:previous", ());
                }
                MediaControlEvent::SetPosition(pos) => {
                    let secs = pos.0.as_secs_f64();
                    log::info!("media-key:seek received from OS at {:.2}s", secs);
                    let _ = app_for_handler.emit("media-key:seek", secs);
                }
                _ => {}
            }) {
                log::warn!("Failed to attach media controls handler: {:?}", e);
            }
        }
    }

    app.manage(NowPlayingState(controls));
}

#[tauri::command]
pub fn set_now_playing(state: tauri::State<NowPlayingState>, payload: NowPlayingPayload) {
    let mut guard = match state.0.lock() {
        Ok(g) => g,
        Err(e) => {
            log::warn!("now_playing lock poisoned: {}", e);
            return;
        }
    };
    let Some(controls) = guard.as_mut() else {
        return;
    };

    let cover_url = payload
        .cover_data_url
        .as_deref()
        .and_then(write_cover_to_temp);

    // Diagnostic — confirm the file SMTC will look up actually exists, and
    // log string byte-lengths so we can spot any field with a malformed /
    // megabyte-sized value sneaking in through an ID3 tag.
    let cover_exists = cover_url
        .as_deref()
        .and_then(file_url_to_path)
        .map(|p| p.exists());
    log::info!(
        "set_now_playing: title_len={} artist_len={} album_len={} duration_s={:?} cover_url={:?} cover_exists={:?}",
        payload.title.as_deref().map(str::len).unwrap_or(0),
        payload.artist.as_deref().map(str::len).unwrap_or(0),
        payload.album.as_deref().map(str::len).unwrap_or(0),
        payload.duration_seconds,
        cover_url,
        cover_exists,
    );

    let make_metadata = |include_cover: bool| MediaMetadata {
        title: payload.title.as_deref(),
        artist: payload.artist.as_deref(),
        album: payload.album.as_deref(),
        cover_url: if include_cover {
            cover_url.as_deref()
        } else {
            None
        },
        duration: payload.duration_seconds.map(Duration::from_secs),
    };

    match controls.set_metadata(make_metadata(true)) {
        Ok(()) => {}
        Err(e) => {
            log::warn!("set_metadata with cover failed: {:?}", e);
            // If a cover was provided, try once more without it — this both
            // gives users readable text on the OS now-playing card when the
            // cover is the offending part, and tells us in the next log
            // which side of the split caused the original failure.
            if cover_url.is_some() {
                match controls.set_metadata(make_metadata(false)) {
                    Ok(()) => log::info!(
                        "set_metadata without cover succeeded — the cover URL is the cause"
                    ),
                    Err(e2) => log::warn!("set_metadata without cover also failed: {:?}", e2),
                }
            }
        }
    }
}

#[tauri::command]
pub fn set_playback_state(state: tauri::State<NowPlayingState>, payload: PlaybackStatePayload) {
    let mut guard = match state.0.lock() {
        Ok(g) => g,
        Err(e) => {
            log::warn!("now_playing lock poisoned: {}", e);
            return;
        }
    };
    let Some(controls) = guard.as_mut() else {
        return;
    };

    let progress = payload
        .elapsed_seconds
        .map(Duration::from_secs_f64)
        .map(souvlaki::MediaPosition);
    let playback = if payload.is_playing {
        MediaPlayback::Playing { progress }
    } else {
        MediaPlayback::Paused { progress }
    };
    log::info!(
        "set_playback_state: is_playing={} elapsed_s={:?}",
        payload.is_playing,
        payload.elapsed_seconds,
    );
    if let Err(e) = controls.set_playback(playback) {
        log::warn!("Failed to set playback state: {:?}", e);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── parse_cover_data_url ────────────────────────────────────────────

    #[test]
    fn parses_a_png_data_url() {
        // base64("hello") = aGVsbG8=
        let url = "data:image/png;base64,aGVsbG8=";
        let (ext, bytes) = parse_cover_data_url(url).unwrap();
        assert_eq!(ext, "png");
        assert_eq!(bytes, b"hello");
    }

    #[test]
    fn defaults_unknown_mime_to_jpg() {
        let url = "data:image/jpeg;base64,aGVsbG8=";
        let (ext, _) = parse_cover_data_url(url).unwrap();
        assert_eq!(ext, "jpg");
    }

    #[test]
    fn returns_none_for_a_non_data_url() {
        assert!(parse_cover_data_url("not a data url").is_none());
    }

    #[test]
    fn returns_none_for_invalid_base64() {
        assert!(parse_cover_data_url("data:image/png;base64,!!!not-base64!!!").is_none());
    }

    // ── cover_path_to_url ───────────────────────────────────────────────
    //
    // These are the regressions for the Windows
    //   HRESULT(0x800700A1) "ERROR_BAD_PATHNAME"
    // crash that v0.4.0 shipped: any path containing a character that is
    // illegal in a URI (space, accents, `&`, `#`, `?`, `%`, …) used to be
    // shoved into the URL unencoded and SMTC's `Uri::CreateUri` rejected
    // it.

    #[test]
    fn produces_a_valid_file_url_for_a_simple_path() {
        let path = std::env::temp_dir().join("songbridge-cover.jpg");
        let url = cover_path_to_url(&path).unwrap();
        assert!(url.starts_with("file:///"), "got: {}", url);
        assert!(url.ends_with("songbridge-cover.jpg"));
    }

    #[test]
    fn percent_encodes_spaces_in_the_path() {
        let path = std::env::temp_dir()
            .join("Songbridge Test")
            .join("cover.jpg");
        let url = cover_path_to_url(&path).unwrap();
        assert!(
            url.contains("Songbridge%20Test"),
            "spaces must be percent-encoded; got: {}",
            url,
        );
        assert!(
            !url.contains("Songbridge Test"),
            "raw space leaked into URL: {}",
            url
        );
    }

    #[test]
    fn percent_encodes_non_ascii_characters() {
        // Common real-world case: usernames with accents.
        let path = std::env::temp_dir().join("Maria José").join("cover.jpg");
        let url = cover_path_to_url(&path).unwrap();
        // "é" UTF-8 is 0xC3 0xA9 → "%C3%A9" when percent-encoded.
        assert!(
            url.contains("%C3%A9"),
            "non-ASCII characters must be percent-encoded; got: {}",
            url,
        );
    }

    #[test]
    fn percent_encodes_uri_reserved_characters() {
        // `#`, `?`, and `%` would all break a URL parser if pasted in raw.
        let path = std::env::temp_dir()
            .join("Hits #1 & ?ish")
            .join("cover.jpg");
        let url = cover_path_to_url(&path).unwrap();
        assert!(!url.contains('#'), "`#` must be encoded; got: {}", url);
        assert!(!url.contains('?'), "`?` must be encoded; got: {}", url);
    }

    #[test]
    fn rejects_relative_paths() {
        // `Url::from_file_path` requires absolute paths, which is what
        // we want: a relative path would silently produce a bogus URL.
        let path = PathBuf::from("relative/path/cover.jpg");
        assert!(cover_path_to_url(&path).is_none());
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn windows_paths_use_forward_slashes_and_three_slashes() {
        let path = PathBuf::from(r"C:\Users\Foo\AppData\Local\Temp\songbridge-cover.jpg");
        let url = cover_path_to_url(&path).unwrap();
        assert!(url.starts_with("file:///C:/"), "got: {}", url);
        assert!(!url.contains('\\'), "got: {}", url);
    }

    // ── cover_temp_path ─────────────────────────────────────────────────
    //
    // Regression cover: SMTC on Windows caches the now-playing thumbnail
    // by URL string. If two different covers map to the same filename,
    // the second one is silently ignored. We hash the bytes into the
    // filename so distinct images land at distinct URLs.

    #[test]
    fn different_bytes_produce_different_filenames() {
        let a = cover_temp_path("jpg", b"album-art-A");
        let b = cover_temp_path("jpg", b"album-art-B");
        assert_ne!(a, b, "different cover bytes must produce different paths");
    }

    #[test]
    fn identical_bytes_produce_the_same_filename() {
        // Free deduplication across tracks of the same album.
        let a = cover_temp_path("jpg", b"album-art");
        let b = cover_temp_path("jpg", b"album-art");
        assert_eq!(a, b);
    }

    #[test]
    fn filename_carries_the_extension() {
        let path = cover_temp_path("png", b"x");
        let name = path.file_name().unwrap().to_string_lossy();
        assert!(name.starts_with("songbridge-cover-"));
        assert!(name.ends_with(".png"));
    }

    // ── detect_image_kind ───────────────────────────────────────────────

    #[test]
    fn recognises_jpeg_magic() {
        // SOI marker + APP0 segment start.
        let bytes = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10];
        assert_eq!(detect_image_kind(&bytes), Some("jpg"));
    }

    #[test]
    fn recognises_png_magic() {
        let bytes = [0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00];
        assert_eq!(detect_image_kind(&bytes), Some("png"));
    }

    #[test]
    fn rejects_unknown_image_bytes() {
        assert!(detect_image_kind(b"not actually an image").is_none());
    }

    #[test]
    fn rejects_truncated_png_magic() {
        // Real PNGs start with 8 magic bytes; anything shorter is not a PNG.
        assert!(detect_image_kind(&[0x89, b'P', b'N']).is_none());
    }

    // ── file_url_to_path ────────────────────────────────────────────────

    #[test]
    fn round_trips_a_file_url() {
        let path = std::env::temp_dir().join("songbridge-cover-test.jpg");
        let url = cover_path_to_url(&path).unwrap();
        let back = file_url_to_path(&url).unwrap();
        assert_eq!(back, path);
    }

    #[test]
    fn file_url_to_path_returns_none_for_a_non_file_url() {
        assert!(file_url_to_path("https://example.com/cover.jpg").is_none());
    }
}
