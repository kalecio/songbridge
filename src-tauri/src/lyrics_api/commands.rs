use crate::lyrics_api::client::{LyricsApiClient, LyricsTrackResponse, SearchQuery};
use std::path::Path;
use tauri::command;

static API_CLIENT: std::sync::LazyLock<LyricsApiClient> =
    std::sync::LazyLock::new(LyricsApiClient::new);

#[command]
pub async fn search_lrclib_lyrics(
    track_name: Option<String>,
    artist_name: Option<String>,
    album_name: Option<String>,
    query: Option<String>,
) -> Result<Vec<LyricsTrackResponse>, String> {
    let search_query = SearchQuery {
        q: query,
        track_name,
        artist_name,
        album_name,
    };
    API_CLIENT.search(search_query).await
}

#[command]
pub async fn get_lrclib_lyrics_by_id(track_id: i64) -> Result<LyricsTrackResponse, String> {
    API_CLIENT.get_by_id(track_id).await
}

#[command]
pub async fn download_lrclib_lyrics(
    song_path: String,
    _track_id: i64,
    prefer_synced: bool,
    plain_lyrics: Option<String>,
    synced_lyrics: Option<String>,
) -> Result<(), String> {
    let lyrics_content = if prefer_synced {
        synced_lyrics
    } else {
        plain_lyrics
    };

    let Some(content) = lyrics_content else {
        return Err("Requested lyrics type not available".to_string());
    };

    let dest = Path::new(&song_path).with_extension("lrc");
    std::fs::write(&dest, content).map_err(|e| format!("Failed to write lyrics file: {}", e))?;

    Ok(())
}

#[command]
pub async fn get_lrclib_lyrics_preview(track_id: i64) -> Result<LyricsPreview, String> {
    let track = API_CLIENT.get_by_id(track_id).await?;
    Ok(LyricsPreview {
        has_synced: track.synced_lyrics.is_some(),
        has_plain: track.plain_lyrics.is_some(),
        instrumental: track.instrumental,
        duration: track.duration,
        track_name: track.track_name,
        artist_name: track.artist_name,
        album_name: track.album_name,
    })
}

#[derive(serde::Serialize)]
pub struct LyricsPreview {
    pub has_synced: bool,
    pub has_plain: bool,
    pub instrumental: bool,
    pub duration: Option<f64>,
    pub track_name: Option<String>,
    pub artist_name: Option<String>,
    pub album_name: Option<String>,
}
