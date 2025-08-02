use std::sync::{Arc, Mutex};
use std::time::Duration;
use symphonia::core::meta::StandardTagKey;

use crate::audio_state::AudioState;
use crate::audio_metadata::AudioMetadata;
use crate::audio_utils::{get_audio_probe, calculate_track_duration, format_duration};

#[tauri::command]
pub fn play_new_song(state: tauri::State<Arc<Mutex<AudioState>>>, path: String) {
    println!("Playing audio...");
    if let Ok(mut audio) = state.lock() {
        audio.play_new_song(&path);
    }
}

#[tauri::command]
pub fn resume(state: tauri::State<Arc<Mutex<AudioState>>>) {
    println!("Resuming audio...");
    if let Ok(audio) = state.lock() {
        audio.resume();
    }
}

#[tauri::command]
pub fn pause(state: tauri::State<Arc<Mutex<AudioState>>>) {
    println!("Pausing audio...");
    if let Ok(audio) = state.lock() {
        audio.pause();
    }
}

#[tauri::command]
pub fn toggle_mute(state: tauri::State<Arc<Mutex<AudioState>>>) {
    println!("Toggling mute...");
    if let Ok(mut audio) = state.lock() {
        audio.toggle_mute();
    }
}

#[tauri::command]
pub fn set_volume(state: tauri::State<Arc<Mutex<AudioState>>>, volume: f32) {
    if let Ok(mut audio) = state.lock() {
        audio.set_volume(volume);
    }
}

#[tauri::command]
pub fn get_current_track_duration(state: tauri::State<Arc<Mutex<AudioState>>>) -> Option<u64> {
    if let Ok(audio) = state.lock() {
        println!("Track duration: {:?}", audio.track_duration);
        audio.track_duration
    } else {
        None
    }
}

#[tauri::command]
pub fn get_progress(state: tauri::State<Arc<Mutex<AudioState>>>) -> Option<u64> {
    if let Ok(audio) = state.lock() {
        audio.current_position().as_secs().checked_mul(1000)
    } else {
        None
    }
}

#[tauri::command]
pub fn seek(state: tauri::State<Arc<Mutex<AudioState>>>, percent: f32, file_path: String) {
    if let Ok(mut audio) = state.lock() {
        if let Some(duration) = audio.track_duration {
            let target_secs = (duration as f64 * percent as f64) as u64;
            audio.seek(Duration::from_secs(target_secs));
        }
    }
}

#[tauri::command]
pub fn get_metadata(file_path: &str) -> AudioMetadata {
    let mut probe = get_audio_probe(file_path);
    let total_duration = calculate_track_duration(&probe);
    let formatted_duration = format_duration(total_duration);
    let mut title = None;
    let mut artist = None;
    let mut album = None;
    let mut year = None;
    if let Some(mut meta) = probe.metadata.get() {
        if let Some(latest) = meta.skip_to_latest() {
            for tag in latest.tags().iter() {
                // println!("{:?}", tag);
                match tag.std_key {
                    Some(StandardTagKey::TrackTitle) => title = Some(tag.value.to_string()),
                    Some(StandardTagKey::Artist) => artist = Some(tag.value.to_string()),
                    Some(StandardTagKey::Album) => album = Some(tag.value.to_string()),
                    Some(StandardTagKey::Date) => year = Some(tag.value.to_string()),
                    _ => {}
                }
            }
        }
    }
    println!(
        "Title: {:?}, Artist: {:?}, Album: {:?}, Year: {:?}, Duration: {:?}",
        title, artist, album, year, formatted_duration
    );
    AudioMetadata::new(title, artist, album, year, formatted_duration)
}
