use crate::metadata::metadata::{AudioDuration, AudioMetadata};

#[tauri::command]
pub fn get_all_songs() -> Vec<AudioMetadata> {
    // Placeholder implementation
    vec![
        AudioMetadata::new(
            Some(String::from("Song 1")),
            Some(String::from("Artist X")),
            Some(String::from("Album A")),
            Some(String::from("2020")),
            AudioDuration::new(Some(240), Some(String::from("4:00"))),
            Some(String::from("/path/to/song1.mp3")),
            None,
        ),
        AudioMetadata::new(
            Some(String::from("Song 2")),
            Some(String::from("Artist Y")),
            Some(String::from("Album A")),
            Some(String::from("2020")),
            AudioDuration::new(Some(240), Some(String::from("4:00"))),
            Some(String::from("/path/to/song2.mp3")),
            None,
        ),
        AudioMetadata::new(
            Some(String::from("Song 3")),
            Some(String::from("Artist Z")),
            Some(String::from("Album B")),
            Some(String::from("2021")),
            AudioDuration::new(Some(180), Some(String::from("3:00"))),
            Some(String::from("/path/to/song3.mp3")),
            None,
        )
    ]
}

#[tauri::command]
pub fn get_all_albums() -> Vec<String> {
    // Placeholder implementation
    vec![
        String::from("Album A"),
        String::from("Album B"),
        String::from("Album C"),
    ]
}

#[tauri::command]
pub fn get_all_artists() -> Vec<String> {
    // Placeholder implementation
    vec![
        String::from("Artist X"),
        String::from("Artist Y"),
        String::from("Artist Z"),
    ]
}

#[tauri::command]
pub fn get_songs_by_albuns(artist: String) -> Vec<AudioMetadata> {
    // Placeholder implementation
    match artist.as_str() {
        "Artist X" => vec![AudioMetadata::new(
            Some(String::from("Song 1")),
            Some(String::from("Artist X")),
            Some(String::from("Album A")),
            Some(String::from("2020")),
            AudioDuration::new(Some(240), Some(String::from("4:00"))),
            Some(String::from("/path/to/song1.mp3")),
            None,
        )],
        "Artist Y" => vec![AudioMetadata::new(
            Some(String::from("Song 2")),
            Some(String::from("Artist Y")),
            Some(String::from("Album B")),
            Some(String::from("2021")),
            AudioDuration::new(Some(180), Some(String::from("3:00"))),
            Some(String::from("/path/to/song2.mp3")),
            None,
        )],
        "Artist Z" => vec![AudioMetadata::new(
            Some(String::from("Song 3")),
            Some(String::from("Artist Z")),
            Some(String::from("Album C")),
            Some(String::from("2022")),
            AudioDuration::new(Some(300), Some(String::from("5:00"))),
            Some(String::from("/path/to/song3.mp3")),
            None,
        )],
        _ => vec![],
    }
}

#[tauri::command]
pub fn get_albuns_by_artist(artist: String) -> Vec<String> {
    // Placeholder implementation
    match artist.as_str() {
        "Artist X" => vec![String::from("Album A")],
        "Artist Y" => vec![String::from("Album B")],
        "Artist Z" => vec![String::from("Album C")],
        _ => vec![],
    }
}