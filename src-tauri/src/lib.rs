// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use crate::audio_state::AudioState;
mod audio_state;
mod audio_metadata;
mod audio_commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let audio_state = AudioState::new();
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(audio_state)
        .invoke_handler(tauri::generate_handler![audio_commands::play_new_song, audio_commands::pause, audio_commands::resume, audio_commands::get_metadata])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
