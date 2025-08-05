use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct AudioDuration {
    duration_seconds: Option<u64>,
    duration_formatted: Option<String>
}

impl AudioDuration {
    pub fn new(duration_seconds: Option<u64>, duration_formatted: Option<String>) -> Self {
        AudioDuration {
            duration_seconds,
            duration_formatted
        }
    }
    
}

#[derive(Serialize)]
pub struct AudioMetadata {
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    year: Option<String>,
    duration: AudioDuration
}

impl AudioMetadata {
    pub fn new(title: Option<String>, artist: Option<String>, album: Option<String>, year: Option<String>, duration: AudioDuration) -> Self {
        AudioMetadata {
            title,
            artist,
            album,
            year,
            duration
        }
    }
}