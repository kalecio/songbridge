use music_library::state::LibraryState;
use std::sync::{Arc, Mutex};
use tauri::Manager;
use tauri_plugin_log::{Target, TargetKind};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod audio;
mod db;
mod lyrics_api;
mod metadata;
mod music_library;
mod now_playing;

// Re-export a minimal API for integration tests and external callers.
pub use audio::utils::{calculate_track_duration, get_audio_probe};
// Re-export selected audio API for integration tests.
pub use audio::commands::{
    get_progress, load_song, pause, play_song, resume, seek, set_volume, toggle_mute,
};
pub use audio::state::AudioState;
// Re-export metadata utils for integration tests
pub use metadata::utils::apply_tags_from_revision;
pub use metadata::utils::{determine_mime_type, extract_album_art_probed};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let audio_state = Arc::new(Mutex::new(AudioState::new()));
    let library_state = Arc::new(Mutex::new(LibraryState::new()));
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::LogDir {
                        file_name: Some("songbridge".into()),
                    }),
                    Target::new(TargetKind::Stdout),
                ])
                .max_file_size(5_000_000) // 5 MB per file
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(audio_state)
        .manage(library_state)
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let db_path = data_dir.join("songbridge.db");
            log::info!("Opening database at {}", db_path.display());
            let db_state = db::state::DbState::new(&db_path)
                .map_err(|e| format!("Failed to open database: {e}"))?;
            app.manage(db_state);
            now_playing::init(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            audio::commands::load_song,
            audio::commands::play_song,
            audio::commands::pause,
            audio::commands::resume,
            audio::commands::toggle_mute,
            audio::commands::set_volume,
            audio::commands::seek,
            audio::commands::get_progress,
            metadata::commands::get_metadata,
            metadata::commands::get_track_image,
            metadata::commands::get_image_preview,
            metadata::commands::update_track_metadata,
            metadata::commands::read_lrc_file,
            metadata::commands::import_lrc_file,
            lyrics_api::commands::search_lrclib_lyrics,
            lyrics_api::commands::get_lrclib_lyrics_by_id,
            lyrics_api::commands::download_lrclib_lyrics,
            lyrics_api::commands::get_lrclib_lyrics_preview,
            music_library::commands::scan_music_library,
            music_library::commands::get_all_songs,
            music_library::commands::get_songs_by_album,
            music_library::commands::get_songs_by_artist,
            music_library::commands::check_paths_exist,
            db::commands::db_get_playlists,
            db::commands::db_upsert_playlist,
            db::commands::db_delete_playlist,
            db::commands::db_get_preferences,
            db::commands::db_save_preferences,
            db::commands::db_get_library_paths,
            db::commands::db_add_library_path,
            db::commands::db_remove_library_path,
            db::commands::db_load_tracks,
            now_playing::set_now_playing,
            now_playing::set_playback_state,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
