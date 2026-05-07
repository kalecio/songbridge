use crate::db::commands::{
    delete_tracks, get_cached_track_mtimes, get_cached_tracks, upsert_track,
};
use crate::db::state::DbState;
use crate::metadata::commands::get_metadata;
use crate::metadata::types::AudioMetadata;
use crate::music_library::state::LibraryState;
use serde::Serialize;
use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};
use walkdir::WalkDir;

const AUDIO_EXTENSIONS: &[&str] = &[
    "mp3", "flac", "ogg", "wav", "aiff", "aif", "m4a", "aac", "opus",
];

fn default_music_dir() -> Option<std::path::PathBuf> {
    dirs::audio_dir()
}

pub(crate) fn build_scan_dirs(
    custom: Vec<String>,
    default_dir: Option<std::path::PathBuf>,
) -> Vec<std::path::PathBuf> {
    let mut dirs: Vec<std::path::PathBuf> =
        custom.into_iter().map(std::path::PathBuf::from).collect();
    if let Some(default) = default_dir {
        if !dirs.contains(&default) {
            dirs.push(default);
        }
    }
    dirs
}

#[derive(Clone, Serialize)]
pub struct ScanProgress {
    pub current: usize,
    pub total: usize,
}

const SCAN_PROGRESS_EVENT: &str = "scan-progress";

fn collect_audio_files(dirs: &[std::path::PathBuf]) -> Vec<std::path::PathBuf> {
    dirs.iter()
        .flat_map(|dir| {
            WalkDir::new(dir)
                .follow_links(true)
                .into_iter()
                .filter_map(|e| match e {
                    Ok(entry) => Some(entry),
                    Err(err) => {
                        log::warn!("Directory walk error: {}", err);
                        None
                    }
                })
                .filter(|e| e.file_type().is_file())
                .filter(|e| {
                    e.path()
                        .extension()
                        .and_then(|ext| ext.to_str())
                        .map(|ext| AUDIO_EXTENSIONS.contains(&ext.to_lowercase().as_str()))
                        .unwrap_or(false)
                })
                .map(|e| e.path().to_path_buf())
                .collect::<Vec<_>>()
        })
        .collect()
}

fn file_mtime(path: &Path) -> Option<i64> {
    let modified = std::fs::metadata(path).ok()?.modified().ok()?;
    let duration = modified
        .duration_since(std::time::UNIX_EPOCH)
        .ok()?
        .as_secs();
    Some(duration as i64)
}

#[tauri::command]
pub async fn scan_music_library(
    app: AppHandle,
    paths: Vec<String>,
    library: State<'_, Arc<Mutex<LibraryState>>>,
) -> Result<Vec<AudioMetadata>, String> {
    let dirs = build_scan_dirs(paths, default_music_dir());

    log::info!(
        "Scanning {} director{}",
        dirs.len(),
        if dirs.len() == 1 { "y" } else { "ies" }
    );

    // Snapshot what's already cached, indexed by path. The cached entries have
    // image: None — that's fine, the frontend lazy-loads art on demand.
    let db_state = app.state::<DbState>();
    let conn_arc = db_state.conn.clone();
    let (cached_mtimes, mut cached_by_path) = {
        let conn = conn_arc.lock().map_err(|e| e.to_string())?;
        let mtimes = get_cached_track_mtimes(&conn)?;
        let by_path: HashMap<String, AudioMetadata> = get_cached_tracks(&conn)?
            .into_iter()
            .filter_map(|m| m.path.clone().map(|p| (p, m)))
            .collect();
        (mtimes, by_path)
    };

    let songs =
        tauri::async_runtime::spawn_blocking(move || -> Result<Vec<AudioMetadata>, String> {
            let files = collect_audio_files(&dirs);
            let total = files.len();
            let _ = app.emit(SCAN_PROGRESS_EVENT, ScanProgress { current: 0, total });

            let emit_every = (total / 100).max(1);
            let mut seen_paths: std::collections::HashSet<String> =
                std::collections::HashSet::with_capacity(total);
            let mut songs: Vec<AudioMetadata> = Vec::with_capacity(total);

            for (idx, path) in files.iter().enumerate() {
                let path_str = match path.to_str() {
                    Some(s) => s.to_string(),
                    None => continue,
                };
                seen_paths.insert(path_str.clone());

                let mtime = file_mtime(path).unwrap_or(0);
                let cached_mtime = cached_mtimes.get(&path_str).copied();

                // Unchanged file → reuse the cached metadata (no parse, no DB write).
                if cached_mtime == Some(mtime) {
                    if let Some(meta) = cached_by_path.remove(&path_str) {
                        songs.push(meta);
                    }
                } else {
                    // New or modified → parse and upsert.
                    match get_metadata(&path_str) {
                        Ok(meta) => {
                            let conn = conn_arc.lock().map_err(|e| e.to_string())?;
                            if let Err(e) = upsert_track(&conn, &meta, mtime) {
                                log::warn!("Failed to cache '{}': {}", path_str, e);
                            }
                            drop(conn);
                            songs.push(meta);
                        }
                        Err(err) => {
                            log::warn!("Failed to read metadata for '{}': {}", path_str, err)
                        }
                    }
                }

                let current = idx + 1;
                if current == total || current % emit_every == 0 {
                    let _ = app.emit(SCAN_PROGRESS_EVENT, ScanProgress { current, total });
                }
            }

            // Files that exist in the cache but not on disk → drop from DB.
            let to_delete: Vec<String> = cached_mtimes
                .keys()
                .filter(|p| !seen_paths.contains(*p))
                .cloned()
                .collect();
            if !to_delete.is_empty() {
                let conn = conn_arc.lock().map_err(|e| e.to_string())?;
                if let Err(e) = delete_tracks(&conn, &to_delete) {
                    log::warn!("Failed to prune {} stale tracks: {}", to_delete.len(), e);
                }
            }

            Ok(songs)
        })
        .await
        .map_err(|e| {
            log::error!("Scan task failed: {}", e);
            e.to_string()
        })??;

    log::info!("Scan complete: {} tracks found", songs.len());

    let mut locked = library.lock().map_err(|e| {
        log::error!("Failed to acquire library lock: {}", e);
        e.to_string()
    })?;
    locked.songs = songs.clone();

    Ok(songs)
}

#[tauri::command]
pub fn get_all_songs(library: State<Arc<Mutex<LibraryState>>>) -> Vec<AudioMetadata> {
    library.lock().map(|l| l.songs.clone()).unwrap_or_default()
}

#[tauri::command]
pub fn get_songs_by_album(
    album: String,
    library: State<Arc<Mutex<LibraryState>>>,
) -> Vec<AudioMetadata> {
    library
        .lock()
        .map(|l| {
            l.songs
                .iter()
                .filter(|s| s.album.as_deref() == Some(album.as_str()))
                .cloned()
                .collect()
        })
        .unwrap_or_default()
}

#[tauri::command]
pub fn get_songs_by_artist(
    artist: String,
    library: State<Arc<Mutex<LibraryState>>>,
) -> Vec<AudioMetadata> {
    library
        .lock()
        .map(|l| {
            l.songs
                .iter()
                .filter(|s| s.artist.as_deref() == Some(artist.as_str()))
                .cloned()
                .collect()
        })
        .unwrap_or_default()
}

#[tauri::command]
pub fn check_paths_exist(paths: Vec<String>) -> Vec<String> {
    paths
        .into_iter()
        .filter(|p| !Path::new(p).exists())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn empty_custom_paths_with_default_returns_only_default() {
        let dirs = build_scan_dirs(vec![], Some(PathBuf::from("/default")));
        assert_eq!(dirs, vec![PathBuf::from("/default")]);
    }

    #[test]
    fn custom_paths_and_default_are_both_included() {
        let dirs = build_scan_dirs(
            vec!["/custom/music".to_string()],
            Some(PathBuf::from("/default")),
        );
        assert_eq!(dirs.len(), 2);
        assert!(dirs.contains(&PathBuf::from("/custom/music")));
        assert!(dirs.contains(&PathBuf::from("/default")));
    }

    #[test]
    fn default_is_not_duplicated_when_already_in_custom_paths() {
        let dirs = build_scan_dirs(
            vec!["/default".to_string()],
            Some(PathBuf::from("/default")),
        );
        assert_eq!(dirs.len(), 1);
        assert_eq!(dirs[0], PathBuf::from("/default"));
    }

    #[test]
    fn no_default_available_with_empty_custom_paths_gives_empty_list() {
        let dirs = build_scan_dirs(vec![], None);
        assert!(dirs.is_empty());
    }

    #[test]
    fn no_default_available_still_returns_custom_paths() {
        let dirs = build_scan_dirs(vec!["/custom/a".to_string(), "/custom/b".to_string()], None);
        assert_eq!(dirs.len(), 2);
    }

    #[test]
    fn multiple_custom_paths_preserve_order() {
        let dirs = build_scan_dirs(
            vec!["/c".to_string(), "/a".to_string(), "/b".to_string()],
            None,
        );
        assert_eq!(
            dirs,
            vec![
                PathBuf::from("/c"),
                PathBuf::from("/a"),
                PathBuf::from("/b")
            ]
        );
    }
}
