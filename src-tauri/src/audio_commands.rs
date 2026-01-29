use base64::Engine;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use symphonia::core::meta::MetadataRevision;
use symphonia::core::meta::StandardTagKey;

use crate::audio_metadata::{AudioDuration, AudioMetadata};
use crate::audio_state::AudioState;
use crate::audio_utils::{calculate_track_duration, format_duration, get_audio_probe};

#[tauri::command]
pub fn load_song(state: tauri::State<Arc<Mutex<AudioState>>>, path: String) {
    println!("Loading song: {}", path);
    if let Ok(mut audio) = state.lock() {
        audio.load_song(&path);
    }
}

#[tauri::command]
pub fn play_song(state: tauri::State<Arc<Mutex<AudioState>>>) {
    println!("Playing audio...");
    if let Ok(audio) = state.lock() {
        audio.play();
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
    println!("Setting volume to: {}", volume);
    if let Ok(mut audio) = state.lock() {
        audio.set_volume(volume);
    }
}

#[tauri::command]
pub fn get_current_track_duration(state: tauri::State<Arc<Mutex<AudioState>>>) -> AudioDuration {
    if let Ok(audio) = state.lock() {
        println!("Track duration: {:?}", audio.track_duration);
        audio.track_duration.clone()
    } else {
        AudioDuration::default()
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
    println!("Seeking to {}% in file: {}", percent * 100.0, path);
    if let Ok(mut audio) = state.lock() {
        let track_duration = &audio.track_duration;
        if let Some(duration) = track_duration.duration_seconds {
            let target_secs = (duration as f64 * percent as f64) as u64;
            audio.seek(Duration::from_secs(target_secs));
        }
    }
}

#[tauri::command]
pub fn get_metadata(path: &str) -> AudioMetadata {
    println!("Getting metadata for file: {}", path);
    let mut probe = get_audio_probe(path);
    let total_duration = calculate_track_duration(&probe);
    let formatted_duration = format_duration(total_duration);
    let duration = AudioDuration::new(total_duration, formatted_duration);
    let mut title = None;
    let mut artist = None;
    let mut album = None;
    let mut year = None;

    // 1) Container metadata (works well for FLAC/OGG/etc).
    let mut meta = probe.format.metadata();
    let latest_opt = if let Some(cur) = meta.current() {
        Some(cur)
    } else {
        meta.skip_to_latest()
    };
    if let Some(latest) = latest_opt {
        apply_tags_from_revision(latest, &mut title, &mut artist, &mut album, &mut year);
    }

    // 2) Probed metadata (common for MP3 ID3 tags).
    if title.is_none() || artist.is_none() || album.is_none() || year.is_none() {
        if let Some(mut meta) = probe.metadata.get() {
            if let Some(latest) = meta.skip_to_latest() {
                apply_tags_from_revision(latest, &mut title, &mut artist, &mut album, &mut year);
            }
        }
    }

    // Album art: prefer container art, fall back to probed art.
    let image = extract_album_art(probe.format.as_mut())
        .or_else(|| extract_album_art_probed(&mut probe.metadata));

    println!(
        "Title: {:?}, Artist: {:?}, Album: {:?}, Year: {:?}, Duration: {:?}",
        title, artist, album, year, duration
    );
    AudioMetadata::new(title, artist, album, year, duration, image)
}

fn apply_tags_from_revision(
    revision: &MetadataRevision,
    title: &mut Option<String>,
    artist: &mut Option<String>,
    album: &mut Option<String>,
    year: &mut Option<String>,
) {
    for tag in revision.tags().iter() {
        println!("{:?}", tag);
        match tag.std_key {
            Some(StandardTagKey::TrackTitle) if title.is_none() => {
                *title = Some(tag.value.to_string())
            }
            Some(StandardTagKey::Artist) if artist.is_none() => *artist = Some(tag.value.to_string()),
            Some(StandardTagKey::Album) if album.is_none() => *album = Some(tag.value.to_string()),
            Some(StandardTagKey::Date) if year.is_none() => *year = Some(tag.value.to_string()),
            _ => {}
        }
    }
}

/// Extracts album art from the metadata and returns it as a base64-encoded string.
fn extract_album_art(format: &mut dyn symphonia::core::formats::FormatReader) -> Option<String> {
    // Access metadata - get visuals from latest revision
    let mut meta = format.metadata();
    let revision_opt = if let Some(cur) = meta.current() {
        Some(cur)
    } else {
        meta.skip_to_latest()
    };
    if let Some(revision) = revision_opt {
        // Get the first visual (typically album art/cover image)
        if let Some(visual) = revision.visuals().first() {
            let base64_image = base64::engine::general_purpose::STANDARD.encode(&visual.data);
            let mime_type = determine_mime_type(&visual.data);
            return Some(format!("data:{};base64,{}", mime_type, base64_image));
        }
    }

    None
}

fn extract_album_art_probed(
    metadata: &mut symphonia::core::probe::ProbedMetadata,
) -> Option<String> {
    if let Some(mut meta) = metadata.get() {
        if let Some(revision) = meta.skip_to_latest() {
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
