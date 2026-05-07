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

use std::sync::{Arc, Mutex};
use std::time::Duration;

use base64::Engine;
use souvlaki::{MediaControlEvent, MediaControls, MediaMetadata, MediaPlayback, PlatformConfig};
use tauri::{AppHandle, Emitter, Manager};

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

/// Decode a data URL into a temp file and return its `file://` URL.
/// We always write to the same path so we don't accumulate junk in /tmp;
/// the OS reads it synchronously inside `set_metadata`, so overwriting is safe.
fn write_cover_to_temp(data_url: &str) -> Option<String> {
    let comma = data_url.find(',')?;
    let header = &data_url[..comma];
    let body = &data_url[comma + 1..];
    let ext = if header.contains("png") { "png" } else { "jpg" };
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(body.as_bytes())
        .ok()?;
    let path = std::env::temp_dir().join(format!("songbridge-cover.{}", ext));
    std::fs::write(&path, bytes).ok()?;
    let s = path.to_str()?;
    // Windows file URIs need three slashes and forward slashes; SMTC
    // silently rejects backslash-style URLs. macOS / Linux take `file://`
    // followed by an absolute POSIX path as-is.
    if cfg!(target_os = "windows") {
        Some(format!("file:///{}", s.replace('\\', "/")))
    } else {
        Some(format!("file://{}", s))
    }
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
                    let _ = app_for_handler.emit("media-key:seek", pos.0.as_secs_f64());
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

    let metadata = MediaMetadata {
        title: payload.title.as_deref(),
        artist: payload.artist.as_deref(),
        album: payload.album.as_deref(),
        cover_url: cover_url.as_deref(),
        duration: payload.duration_seconds.map(Duration::from_secs),
    };
    if let Err(e) = controls.set_metadata(metadata) {
        log::warn!("Failed to set now-playing metadata: {:?}", e);
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
    if let Err(e) = controls.set_playback(playback) {
        log::warn!("Failed to set playback state: {:?}", e);
    }
}
