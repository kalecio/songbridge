use std::sync::{Arc, Mutex};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod audio;
mod metadata;
mod music_library;

// Re-export a minimal API for integration tests and external callers.
pub use audio::utils::{calculate_track_duration, get_audio_probe};
// Re-export selected audio API for integration tests.
pub use audio::state::AudioState;
pub use audio::commands::{
    load_song, play_song, resume, pause, toggle_mute, set_volume, get_progress, seek,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let audio_state = Arc::new(Mutex::new(AudioState::new()));
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(audio_state)
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
            music_library::commands::get_all_songs,
            music_library::commands::get_all_albums,
            music_library::commands::get_all_artists,
            music_library::commands::get_songs_by_albuns,
            music_library::commands::get_albuns_by_artist,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
