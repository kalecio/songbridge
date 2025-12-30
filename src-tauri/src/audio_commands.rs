use std::fs::File;
use std::sync::{Arc, Mutex};
use base64::Engine;
use symphonia::core::formats::{FormatOptions, FormatReader};
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::{MetadataOptions, StandardTagKey};
use symphonia::core::probe::Hint;

use crate::audio_state::AudioState;
use crate::audio_metadata::{AudioDuration, AudioMetadata};

#[tauri::command]
pub fn play_new_song(state: tauri::State<Arc<Mutex<AudioState>>>, path: String, duration_seconds: Option<u64>) {
    println!("Playing audio...");
    if let Ok(mut audio) = state.lock() {
        audio.play_new_song(&path, duration_seconds);
    }
}

#[tauri::command]
pub fn resume(state: tauri::State<Arc<Mutex<AudioState>>>) {
    println!("Resuming audio...");
    if let Ok(mut audio) = state.lock() {
        audio.resume();
    }
}

#[tauri::command]
pub fn pause(state: tauri::State<Arc<Mutex<AudioState>>>) {
    println!("Pausing audio...");
    if let Ok(mut audio) = state.lock() {
        audio.pause();
    }
}

#[tauri::command]
pub fn get_progress(state: tauri::State<Arc<Mutex<AudioState>>>) -> f64 {
    if let Ok(audio) = state.lock() {
        audio.get_progress()
    } else {
        0.0
    }
}

#[tauri::command]
pub fn seek_to(state: tauri::State<Arc<Mutex<AudioState>>>, progress: f64) {
    if let Ok(mut audio) = state.lock() {
        audio.seek_to(progress);
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

/// Extracts metadata from an audio file, including album art.
/// Returns an error string if extraction fails.
#[tauri::command]
pub fn get_metadata(path: &str) -> Result<AudioMetadata, String> {
    let file = File::open(path)
        .map_err(|e| format!("Failed to open file '{}': {}", path, e))?;
    
    let mss = MediaSourceStream::new(Box::new(file), Default::default());
    let hint = Hint::new();

    let meta_opts: MetadataOptions = Default::default();
    let fmt_opts: FormatOptions = Default::default();
    
    let mut probed = symphonia::default::get_probe()
        .format(&hint, mss, &fmt_opts, &meta_opts)
        .map_err(|e| format!("Unsupported format or failed to probe file: {}", e))?;

    let format = probed.format;
    let duration = calculate_track_duration(&*format)?;

    let (title, artist, album, year) = extract_text_metadata(&mut probed.metadata);
    let image = extract_album_art(&mut probed.metadata);

    Ok(AudioMetadata::new(title, artist, album, year, duration, image))
}

/// Extracts text metadata (title, artist, album, year) from the metadata revision.
fn extract_text_metadata(
    metadata: &mut symphonia::core::probe::ProbedMetadata,
) -> (Option<String>, Option<String>, Option<String>, Option<String>) {
    let mut title = None;
    let mut artist = None;
    let mut album = None;
    let mut year = None;

    // Access metadata - get the latest revision
    if let Some(mut meta) = metadata.get() {
        if let Some(revision) = meta.skip_to_latest() {
            for tag in revision.tags() {
                match tag.std_key {
                    Some(StandardTagKey::TrackTitle) if title.is_none() => {
                        title = Some(tag.value.to_string());
                    }
                    Some(StandardTagKey::Artist) if artist.is_none() => {
                        artist = Some(tag.value.to_string());
                    }
                    Some(StandardTagKey::Album) if album.is_none() => {
                        album = Some(tag.value.to_string());
                    }
                    Some(StandardTagKey::Date) if year.is_none() => {
                        year = Some(tag.value.to_string());
                    }
                    _ => {}
                }
            }
        }
    }

    (title, artist, album, year)
}

/// Extracts album art from the metadata and returns it as a base64-encoded string.
fn extract_album_art(metadata: &mut symphonia::core::probe::ProbedMetadata) -> Option<String> {
    // Access metadata - get visuals from latest revision
    if let Some(mut meta) = metadata.get() {
        if let Some(revision) = meta.skip_to_latest() {
            // Get the first visual (typically album art/cover image)
            if let Some(visual) = revision.visuals().first() {
                let base64_image = base64::engine::general_purpose::STANDARD.encode(&visual.data);
                let mime_type = determine_mime_type(&visual.data);
                return Some(format!("data:{};base64,{}", mime_type, base64_image));
            }
        }
    }

    None
}

/// Determines the MIME type by inferring it from the image data's magic bytes.
fn determine_mime_type(data: &[u8]) -> String {
    // Infer MIME type from magic bytes
    if data.len() >= 4 {
        match &data[0..4] {
            [0xFF, 0xD8, 0xFF, _] => "image/jpeg",
            [0x89, 0x50, 0x4E, 0x47] => "image/png",
            [0x47, 0x49, 0x46, 0x38] => "image/gif",
            [0x52, 0x49, 0x46, 0x46] if data.len() >= 12 && &data[8..12] == b"WEBP" => "image/webp",
            _ => "image/jpeg", // Default fallback
        }
    } else {
        "image/jpeg"
    }
    .to_string()
}

/// Calculates the track duration from the format reader.
fn calculate_track_duration(format: &dyn FormatReader) -> Result<AudioDuration, String> {
    let duration_seconds = format
        .default_track()
        .and_then(|track| {
            let n_frames = track.codec_params.n_frames?;
            let sample_rate = track.codec_params.sample_rate?;
            Some(n_frames as f64 / sample_rate as f64)
        });

    let duration_formatted = duration_seconds.map(|d| {
        let total_seconds = d as u64;
        let hours = total_seconds / 3600;
        let minutes = (total_seconds % 3600) / 60;
        let seconds = total_seconds % 60;

        if hours > 0 {
            format!("{:02}:{:02}:{:02}", hours, minutes, seconds)
        } else {
            format!("{:02}:{:02}", minutes, seconds)
        }
    });

    Ok(AudioDuration::new(
        duration_seconds.map(|d| d as u64),
        duration_formatted,
    ))
}

