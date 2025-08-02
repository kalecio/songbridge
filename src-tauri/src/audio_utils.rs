use std::fs::File;
use symphonia::core::{formats::FormatOptions, io::MediaSourceStream, meta::MetadataOptions, probe::{Hint, ProbeResult}};

pub fn get_audio_probe(file_path: &str) -> ProbeResult {
    let file = File::open(file_path).expect("file open failed");
    let mss = MediaSourceStream::new(Box::new(file), Default::default());
    let hint = Hint::new();

    let meta_opts: MetadataOptions = Default::default();
    let fmt_opts: FormatOptions = Default::default();
    let probe = symphonia::default::get_probe()
        .format(&hint, mss, &fmt_opts, &meta_opts)
        .expect("unsupported format");
    probe
}

pub fn calculate_track_duration(probe: &ProbeResult) -> Option<u64> {
    let format = &probe.format;
    let duration_seconds = format
        .default_track()
        .and_then(|track| {
            let n_frames = track.codec_params.n_frames?;
            let sample_rate = track.codec_params.sample_rate?;
            Some((n_frames as f64 / sample_rate as f64) as u64)
        });
    duration_seconds
}

pub fn format_duration(duration_seconds: Option<u64>) -> Option<String> {
    // format duration to 00:00:00 or 00:00
    duration_seconds.map(|d| {
        let hours = d / 3600;
        let minutes = d / 60;
        let seconds = d % 60;
        if hours > 0 {
            return format!("{:02}:{:02}:{:02}", hours, minutes % 60, seconds)
        } else {
            return format!("{:02}:{:02}", minutes, seconds)
        }
    })
}