use serde::Serialize;

#[derive(Serialize)]
pub struct AudioMetadata {
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    year: Option<String>,
    duration_seconds: Option<f64>
}

impl AudioMetadata {
    pub fn new(title: Option<String>, artist: Option<String>, album: Option<String>, year: Option<String>, duration_seconds: Option<f64>) -> Self {
        AudioMetadata {
            title,
            artist,
            album,
            year,
            duration_seconds
        }
    }
}