use std::sync::{Arc, Mutex};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use crate::audio::state::AudioState;

mod audio;
mod metadata;

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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
