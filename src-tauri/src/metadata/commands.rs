use crate::metadata::metadata::{AudioDuration, AudioMetadata};

use crate::audio::utils::{  
    calculate_track_duration,  
    format_duration,  
    get_audio_probe,  
};
use crate::metadata::utils::{
    extract_album_art,  
    apply_tags_from_revision,  
    extract_album_art_probed
};


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
    AudioMetadata::new(title, artist, album, year, duration, Some(path.to_string()), image)
}

