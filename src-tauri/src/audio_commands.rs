use std::fs::File;
use symphonia::core::formats::{FormatOptions, FormatReader};
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::{MetadataOptions, StandardTagKey};
use symphonia::core::probe::Hint;

use crate::audio_state::AudioState;
use crate::audio_metadata::AudioMetadata;

#[tauri::command]
pub fn play_new_song(state: tauri::State<'_, AudioState>) {
    println!("Playing audio...");
    let path = "music-files/Polygondwanaland.mp3";
    state.play_new_song(path);
}

#[tauri::command]
pub fn resume(state: tauri::State<'_, AudioState>) {
    println!("Resuming audio...");
    state.resume();
}

#[tauri::command]
pub fn pause(state: tauri::State<'_, AudioState>) {
    println!("Pausing audio...");
    state.pause();
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
    let duration_seconds = calculate_track_duration(format);

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
        title, artist, album, year, duration_seconds
    );

    AudioMetadata::new(title, artist, album, year, duration_seconds)
}

fn calculate_track_duration(format: Box<dyn FormatReader>) -> Option<f64> {
    let duration_seconds = if let Some(track) = format.default_track() {
        if let Some(n_frames) = track.codec_params.n_frames {
            if let Some(sample_rate) = track.codec_params.sample_rate {
                Some(n_frames as f64 / sample_rate as f64)
            } else {
                None
            }
        } else {
            None
        }
    } else {
        None
    };
    duration_seconds
}
