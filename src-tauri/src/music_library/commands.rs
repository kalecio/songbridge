use crate::metadata::commands::get_metadata;
use crate::metadata::types::AudioMetadata;
use crate::music_library::state::LibraryState;
use std::path::Path;
use std::sync::{Arc, Mutex};
use tauri::State;
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

#[tauri::command]
pub fn scan_music_library(
    paths: Vec<String>,
    library: State<Arc<Mutex<LibraryState>>>,
) -> Result<Vec<AudioMetadata>, String> {
    let dirs = build_scan_dirs(paths, default_music_dir());

    log::info!(
        "Scanning {} director{}",
        dirs.len(),
        if dirs.len() == 1 { "y" } else { "ies" }
    );

    let songs: Vec<AudioMetadata> = dirs
        .iter()
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
                .filter_map(|e| {
                    e.path().to_str().and_then(|p| match get_metadata(p) {
                        Ok(meta) => Some(meta),
                        Err(err) => {
                            log::warn!("Failed to read metadata for '{}': {}", p, err);
                            None
                        }
                    })
                })
                .collect::<Vec<_>>()
        })
        .collect();

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
