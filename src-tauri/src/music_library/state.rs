use crate::metadata::types::AudioMetadata;

pub struct LibraryState {
    pub songs: Vec<AudioMetadata>,
}

impl LibraryState {
    pub fn new() -> Self {
        Self { songs: Vec::new() }
    }
}
