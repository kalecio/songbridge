use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct AudioDuration {
    pub duration_seconds: Option<u64>,
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

impl Default for AudioDuration {
    fn default() -> Self {
        AudioDuration {
            duration_seconds: None,
            duration_formatted: None
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