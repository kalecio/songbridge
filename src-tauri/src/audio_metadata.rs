use serde::Serialize;

#[derive(Serialize)]
pub struct AudioMetadata {
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    year: Option<String>,
    duration_seconds: Option<String>
}

impl AudioMetadata {
    pub fn new(title: Option<String>, artist: Option<String>, album: Option<String>, year: Option<String>, duration_seconds: Option<String>) -> Self {
        AudioMetadata {
            title,
            artist,
            album,
            year,
            duration_seconds
        }
    }
}