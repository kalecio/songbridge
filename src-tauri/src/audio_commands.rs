use std::fs::File;
use std::path;
use std::sync::{Arc, Mutex};
use symphonia::core::formats::{FormatOptions, FormatReader};
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::{MetadataOptions, StandardTagKey};
use symphonia::core::probe::Hint;

use crate::audio_state::AudioState;
use crate::audio_metadata::AudioMetadata;

#[tauri::command]
pub fn play_new_song(state: tauri::State<Arc<Mutex<AudioState>>>, path: String) {
    println!("Playing audio...");
    if let Ok(audio) = state.lock() {
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
pub fn get_metadata(file_path: &str) -> AudioMetadata {
    let file = File::open(file_path).expect("file open failed");
    let mss = MediaSourceStream::new(Box::new(file), Default::default());
    let hint = Hint::new();

    let meta_opts: MetadataOptions = Default::default();
    let fmt_opts: FormatOptions = Default::default();
    let mut probed = symphonia::default::get_probe()
        .format(&hint, mss, &fmt_opts, &meta_opts)
        .expect("unsupported format");

    let format = probed.format;
    let total_duration = calculate_track_duration(format);

    let mut title = None;
    let mut artist = None;
    let mut album = None;
    let mut year = None;

    // Access the metadata.
    if let Some(mut meta) = probed.metadata.get() {
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
        title, artist, album, year, total_duration
    );

    AudioMetadata::new(title, artist, album, year, total_duration)
}

fn calculate_track_duration(format: Box<dyn FormatReader>) -> Option<String> {
    let duration_seconds = format
        .default_track()
        .and_then(|track| {
            let n_frames = track.codec_params.n_frames?;
            let sample_rate = track.codec_params.sample_rate?;
            Some(n_frames as f64 / sample_rate as f64)
        });

    // format duration to 00:00
    duration_seconds.map(|d| {
        let hours = d as u64 / 3600;
        let minutes = d as u64 / 60;
        let seconds = d as u64 % 60;
        if hours > 0 {
            return format!("{:02}:{:02}:{:02}", hours, minutes % 60, seconds)
        } else {
            return format!("{:02}:{:02}", minutes, seconds)
        }
    })
}
