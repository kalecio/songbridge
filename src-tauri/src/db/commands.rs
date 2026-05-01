use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

use super::state::DbState;

#[derive(Serialize, Deserialize)]
pub struct DbPlaylist {
    pub id: String,
    pub name: String,
    pub song_paths: Vec<String>,
}

#[derive(Serialize, Deserialize)]
pub struct DbPreferences {
    pub current_path: Option<String>,
    pub current_playlist: Vec<String>,
    pub on_repeat: bool,
    pub on_shuffle: bool,
}

#[tauri::command]
pub fn db_get_playlists(state: State<DbState>) -> Result<Vec<DbPlaylist>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, name FROM playlists ORDER BY rowid")
        .map_err(|e| e.to_string())?;

    let playlists: Vec<(String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<_, _>>()
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for (id, name) in playlists {
        let mut song_stmt = conn
            .prepare("SELECT song_path FROM playlist_songs WHERE playlist_id = ? ORDER BY position")
            .map_err(|e| e.to_string())?;

        let song_paths: Vec<String> = song_stmt
            .query_map(params![id], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .collect::<Result<_, _>>()
            .map_err(|e| e.to_string())?;

        result.push(DbPlaylist {
            id,
            name,
            song_paths,
        });
    }

    Ok(result)
}

#[tauri::command]
pub fn db_upsert_playlist(
    state: State<DbState>,
    id: String,
    name: String,
    song_paths: Vec<String>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO playlists (id, name) VALUES (?1, ?2)
         ON CONFLICT(id) DO UPDATE SET name = ?2",
        params![id, name],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "DELETE FROM playlist_songs WHERE playlist_id = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;

    for (position, path) in song_paths.iter().enumerate() {
        conn.execute(
            "INSERT INTO playlist_songs (playlist_id, song_path, position) VALUES (?1, ?2, ?3)",
            params![id, path, position as i64],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn db_delete_playlist(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM playlists WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_get_preferences(state: State<DbState>) -> Result<DbPreferences, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let get = |key: &str| -> Option<String> {
        conn.query_row(
            "SELECT value FROM preferences WHERE key = ?1",
            params![key],
            |row| row.get(0),
        )
        .ok()
    };

    let current_path = get("current_path");
    let current_playlist = get("current_playlist")
        .and_then(|v| serde_json::from_str::<Vec<String>>(&v).ok())
        .unwrap_or_default();
    let on_repeat = get("on_repeat").map(|v| v == "true").unwrap_or(false);
    let on_shuffle = get("on_shuffle").map(|v| v == "true").unwrap_or(false);

    Ok(DbPreferences {
        current_path,
        current_playlist,
        on_repeat,
        on_shuffle,
    })
}

#[tauri::command]
pub fn db_save_preferences(
    state: State<DbState>,
    current_path: Option<String>,
    current_playlist: Vec<String>,
    on_repeat: bool,
    on_shuffle: bool,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let upsert = |key: &str, value: &str| {
        conn.execute(
            "INSERT INTO preferences (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = ?2",
            params![key, value],
        )
    };

    if let Some(path) = &current_path {
        upsert("current_path", path).map_err(|e| e.to_string())?;
    } else {
        conn.execute("DELETE FROM preferences WHERE key = 'current_path'", [])
            .map_err(|e| e.to_string())?;
    }

    let playlist_json = serde_json::to_string(&current_playlist).map_err(|e| e.to_string())?;
    upsert("current_playlist", &playlist_json).map_err(|e| e.to_string())?;
    upsert("on_repeat", if on_repeat { "true" } else { "false" }).map_err(|e| e.to_string())?;
    upsert("on_shuffle", if on_shuffle { "true" } else { "false" }).map_err(|e| e.to_string())?;

    Ok(())
}
