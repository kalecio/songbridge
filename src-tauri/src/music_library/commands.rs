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

#[derive(Clone, Serialize)]
pub struct ScanRootStatus {
    pub path: String,
    pub success: bool,
    pub incomplete_paths: Vec<String>,
}

#[derive(Serialize)]
pub struct ScanResult {
    pub songs: Vec<AudioMetadata>,
    pub roots: Vec<ScanRootStatus>,
}

const SCAN_PROGRESS_EVENT: &str = "scan-progress";

fn collect_audio_files(
    dirs: &[std::path::PathBuf],
) -> (Vec<std::path::PathBuf>, Vec<ScanRootStatus>) {
    let mut files = Vec::new();
    let mut statuses = Vec::new();
    for dir in dirs {
        let mut incomplete_paths = Vec::new();
        for item in WalkDir::new(dir).follow_links(true) {
            match item {
                Ok(entry)
                    if entry.file_type().is_file()
                        && entry
                            .path()
                            .extension()
                            .and_then(|e| e.to_str())
                            .map(|e| AUDIO_EXTENSIONS.contains(&e.to_lowercase().as_str()))
                            .unwrap_or(false) =>
                {
                    files.push(entry.path().to_path_buf())
                }
                Ok(_) => {}
                Err(err) => {
                    let path = err.path().unwrap_or(dir).to_string_lossy().into_owned();
                    log::warn!("Directory walk error: {}", err);
                    incomplete_paths.push(path);
                }
            }
        }
        statuses.push(ScanRootStatus {
            path: dir.to_string_lossy().into_owned(),
            success: incomplete_paths.is_empty(),
            incomplete_paths,
        });
    }
    (files, statuses)
}

fn file_mtime(path: &Path) -> Option<i64> {
    let modified = std::fs::metadata(path).ok()?.modified().ok()?;
    let duration = modified
        .duration_since(std::time::UNIX_EPOCH)
        .ok()?
        .as_secs();
    Some(duration as i64)
}

fn is_successfully_covered(path: &str, roots: &[ScanRootStatus]) -> bool {
    let path = Path::new(path);
    roots.iter().any(|root| {
        let root_path = Path::new(&root.path);
        path.starts_with(root_path)
            && root
                .incomplete_paths
                .iter()
                .all(|failed| !path.starts_with(Path::new(failed)))
    })
}

#[tauri::command]
pub async fn scan_music_library(
    app: AppHandle,
    paths: Vec<String>,
    library: State<'_, Arc<Mutex<LibraryState>>>,
) -> Result<ScanResult, String> {
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

    let songs = tauri::async_runtime::spawn_blocking(move || -> Result<ScanResult, String> {
        let (files, root_statuses) = collect_audio_files(&dirs);
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

        // Prune only cached entries in successfully covered portions of roots.
        // Failed paths and their descendants remain covered by the cache.
        let to_delete: Vec<String> = cached_mtimes
            .keys()
            .filter(|p| !seen_paths.contains(*p))
            .filter(|p| is_successfully_covered(p, &root_statuses))
            .cloned()
            .collect();
        if !to_delete.is_empty() {
            let conn = conn_arc.lock().map_err(|e| e.to_string())?;
            if let Err(e) = delete_tracks(&conn, &to_delete) {
                log::warn!("Failed to prune {} stale tracks: {}", to_delete.len(), e);
            }
        }

        let mut songs = songs;
        for (path, meta) in cached_by_path {
            if root_statuses.iter().any(|root| {
                let cached_path = Path::new(&path);
                cached_path.starts_with(Path::new(&root.path))
                    && root
                        .incomplete_paths
                        .iter()
                        .any(|failed| cached_path.starts_with(Path::new(failed)))
            }) {
                songs.push(meta);
            }
        }
        Ok(ScanResult {
            songs,
            roots: root_statuses,
        })
    })
    .await
    .map_err(|e| {
        log::error!("Scan task failed: {}", e);
        e.to_string()
    })??;

    log::info!("Scan complete: {} tracks found", songs.songs.len());

    let mut locked = library.lock().map_err(|e| {
        log::error!("Failed to acquire library lock: {}", e);
        e.to_string()
    })?;
    locked.songs = songs.songs.clone();

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

    #[test]
    fn incomplete_roots_preserve_cached_tracks_but_readable_roots_are_prunable() {
        let roots = vec![
            ScanRootStatus {
                path: "/mnt/offline".into(),
                success: false,
                incomplete_paths: vec!["/mnt/offline".into()],
            },
            ScanRootStatus {
                path: "/music".into(),
                success: true,
                incomplete_paths: vec![],
            },
        ];
        assert!(!is_successfully_covered("/mnt/offline/old.mp3", &roots));
        assert!(is_successfully_covered("/music/deleted.mp3", &roots));
        assert!(!is_successfully_covered("/music-extra/track.mp3", &roots));
    }

    #[test]
    fn scan_errors_preserve_only_the_failed_subtree() {
        let roots = vec![ScanRootStatus {
            path: "/music".into(),
            success: false,
            incomplete_paths: vec!["/music/unreadable".into()],
        }];
        assert!(!is_successfully_covered(
            "/music/unreadable/old.mp3",
            &roots
        ));
        assert!(is_successfully_covered("/music/deleted.mp3", &roots));
    }
}
