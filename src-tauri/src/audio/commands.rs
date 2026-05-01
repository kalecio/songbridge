use std::sync::{Arc, Mutex};
use std::time::Duration;

use crate::audio::state::AudioState;

#[tauri::command]
pub fn load_song(state: tauri::State<Arc<Mutex<AudioState>>>, path: String) -> Result<(), String> {
    log::info!("Loading song: {}", path);
    if let Ok(mut audio) = state.lock() {
        audio.load_song(&path).map_err(|e| {
            log::error!("Failed to load song '{}': {}", path, e);
            e
        })?;
    }
    Ok(())
}

#[tauri::command]
pub fn play_song(state: tauri::State<Arc<Mutex<AudioState>>>) {
    log::info!("Playing audio");
    if let Ok(audio) = state.lock() {
        audio.play();
    }
}

#[tauri::command]
pub fn resume(state: tauri::State<Arc<Mutex<AudioState>>>) {
    log::info!("Resuming audio");
    if let Ok(audio) = state.lock() {
        audio.resume();
    }
}

#[tauri::command]
pub fn pause(state: tauri::State<Arc<Mutex<AudioState>>>) {
    log::info!("Pausing audio");
    if let Ok(audio) = state.lock() {
        audio.pause();
    }
}

#[tauri::command]
pub fn toggle_mute(state: tauri::State<Arc<Mutex<AudioState>>>) {
    log::info!("Toggling mute");
    if let Ok(mut audio) = state.lock() {
        audio.toggle_mute();
    }
}

#[tauri::command]
pub fn set_volume(state: tauri::State<Arc<Mutex<AudioState>>>, volume: f32) {
    log::info!("Setting volume to {:.2}", volume);
    if let Ok(mut audio) = state.lock() {
        audio.set_volume(volume);
    }
}

#[tauri::command]
pub fn get_progress(state: tauri::State<Arc<Mutex<AudioState>>>) -> u64 {
    if let Ok(audio) = state.lock() {
        audio.current_position().as_secs()
    } else {
        0
    }
}

#[tauri::command]
pub fn seek(state: tauri::State<Arc<Mutex<AudioState>>>, percent: f32, path: String) {
    log::info!("Seeking to {:.1}% in '{}'", percent * 100.0, path);
    if let Ok(mut audio) = state.lock() {
        let track_duration = &audio.track_duration;
        if let Some(duration) = track_duration.duration_seconds {
            let target_secs = (duration as f64 * percent as f64) as u64;
            audio.seek(Duration::from_secs(target_secs));
        }
    }
}
