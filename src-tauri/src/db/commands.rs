use rusqlite::{params, Connection};
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

// ── helpers (testable without Tauri State) ────────────────────────────────────

pub(crate) fn get_playlists(conn: &Connection) -> Result<Vec<DbPlaylist>, String> {
    let mut stmt = conn
        .prepare("SELECT id, name FROM playlists ORDER BY rowid")
        .map_err(|e| e.to_string())?;

    let rows: Vec<(String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<_, _>>()
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for (id, name) in rows {
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

pub(crate) fn upsert_playlist(
    conn: &Connection,
    id: &str,
    name: &str,
    song_paths: &[String],
) -> Result<(), String> {
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

pub(crate) fn delete_playlist(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM playlists WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub(crate) fn get_preferences(conn: &Connection) -> Result<DbPreferences, String> {
    let get = |key: &str| -> Option<String> {
        conn.query_row(
            "SELECT value FROM preferences WHERE key = ?1",
            params![key],
            |row| row.get(0),
        )
        .ok()
    };

    Ok(DbPreferences {
        current_path: get("current_path"),
        current_playlist: get("current_playlist")
            .and_then(|v| serde_json::from_str::<Vec<String>>(&v).ok())
            .unwrap_or_default(),
        on_repeat: get("on_repeat").map(|v| v == "true").unwrap_or(false),
        on_shuffle: get("on_shuffle").map(|v| v == "true").unwrap_or(false),
    })
}

pub(crate) fn save_preferences(
    conn: &Connection,
    current_path: Option<&str>,
    current_playlist: &[String],
    on_repeat: bool,
    on_shuffle: bool,
) -> Result<(), String> {
    let upsert = |key: &str, value: &str| {
        conn.execute(
            "INSERT INTO preferences (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = ?2",
            params![key, value],
        )
    };

    match current_path {
        Some(path) => {
            upsert("current_path", path).map_err(|e| e.to_string())?;
        }
        None => {
            conn.execute("DELETE FROM preferences WHERE key = 'current_path'", [])
                .map_err(|e| e.to_string())?;
        }
    }

    let playlist_json = serde_json::to_string(current_playlist).map_err(|e| e.to_string())?;
    upsert("current_playlist", &playlist_json).map_err(|e| e.to_string())?;
    upsert("on_repeat", if on_repeat { "true" } else { "false" }).map_err(|e| e.to_string())?;
    upsert("on_shuffle", if on_shuffle { "true" } else { "false" }).map_err(|e| e.to_string())?;

    Ok(())
}

// ── Tauri commands (thin wrappers) ────────────────────────────────────────────

#[tauri::command]
pub fn db_get_playlists(state: State<DbState>) -> Result<Vec<DbPlaylist>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    get_playlists(&conn)
}

#[tauri::command]
pub fn db_upsert_playlist(
    state: State<DbState>,
    id: String,
    name: String,
    song_paths: Vec<String>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    upsert_playlist(&conn, &id, &name, &song_paths)
}

#[tauri::command]
pub fn db_delete_playlist(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    delete_playlist(&conn, &id)
}

#[tauri::command]
pub fn db_get_preferences(state: State<DbState>) -> Result<DbPreferences, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    get_preferences(&conn)
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
    save_preferences(
        &conn,
        current_path.as_deref(),
        &current_playlist,
        on_repeat,
        on_shuffle,
    )
}

// ── tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::state::DbState;

    fn setup() -> DbState {
        DbState::in_memory().expect("in-memory db")
    }

    // ── playlists ──────────────────────────────────────────────────────────────

    #[test]
    fn get_playlists_returns_empty_on_fresh_db() {
        let db = setup();
        let conn = db.conn.lock().unwrap();
        let result = get_playlists(&conn).unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn upsert_and_get_playlist_roundtrip() {
        let db = setup();
        let conn = db.conn.lock().unwrap();
        let paths = vec!["/music/a.mp3".to_string(), "/music/b.mp3".to_string()];

        upsert_playlist(&conn, "pl-1", "Chill Vibes", &paths).unwrap();

        let playlists = get_playlists(&conn).unwrap();
        assert_eq!(playlists.len(), 1);
        assert_eq!(playlists[0].id, "pl-1");
        assert_eq!(playlists[0].name, "Chill Vibes");
        assert_eq!(playlists[0].song_paths, paths);
    }

    #[test]
    fn upsert_updates_name_on_conflict() {
        let db = setup();
        let conn = db.conn.lock().unwrap();

        upsert_playlist(&conn, "pl-1", "Old Name", &[]).unwrap();
        upsert_playlist(&conn, "pl-1", "New Name", &[]).unwrap();

        let playlists = get_playlists(&conn).unwrap();
        assert_eq!(playlists.len(), 1);
        assert_eq!(playlists[0].name, "New Name");
    }

    #[test]
    fn upsert_replaces_songs_on_conflict() {
        let db = setup();
        let conn = db.conn.lock().unwrap();

        upsert_playlist(
            &conn,
            "pl-1",
            "Mix",
            &["/a.mp3".to_string(), "/b.mp3".to_string()],
        )
        .unwrap();
        upsert_playlist(&conn, "pl-1", "Mix", &["/c.mp3".to_string()]).unwrap();

        let playlists = get_playlists(&conn).unwrap();
        assert_eq!(playlists[0].song_paths, vec!["/c.mp3"]);
    }

    #[test]
    fn songs_preserve_insertion_order() {
        let db = setup();
        let conn = db.conn.lock().unwrap();
        let paths: Vec<String> = (0..5).map(|i| format!("/track{i}.mp3")).collect();

        upsert_playlist(&conn, "pl-1", "Ordered", &paths).unwrap();

        let result = get_playlists(&conn).unwrap();
        assert_eq!(result[0].song_paths, paths);
    }

    #[test]
    fn delete_playlist_removes_it_and_its_songs() {
        let db = setup();
        let conn = db.conn.lock().unwrap();
        let paths = vec!["/a.mp3".to_string()];

        upsert_playlist(&conn, "pl-1", "To Delete", &paths).unwrap();
        delete_playlist(&conn, "pl-1").unwrap();

        assert!(get_playlists(&conn).unwrap().is_empty());

        // songs should be cascade-deleted
        let song_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM playlist_songs WHERE playlist_id = 'pl-1'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(song_count, 0);
    }

    #[test]
    fn delete_nonexistent_playlist_is_a_noop() {
        let db = setup();
        let conn = db.conn.lock().unwrap();
        assert!(delete_playlist(&conn, "ghost-id").is_ok());
    }

    #[test]
    fn multiple_playlists_are_returned_in_insertion_order() {
        let db = setup();
        let conn = db.conn.lock().unwrap();

        upsert_playlist(&conn, "pl-1", "First", &[]).unwrap();
        upsert_playlist(&conn, "pl-2", "Second", &[]).unwrap();
        upsert_playlist(&conn, "pl-3", "Third", &[]).unwrap();

        let playlists = get_playlists(&conn).unwrap();
        let names: Vec<&str> = playlists.iter().map(|p| p.name.as_str()).collect();
        assert_eq!(names, vec!["First", "Second", "Third"]);
    }

    // ── preferences ───────────────────────────────────────────────────────────

    #[test]
    fn get_preferences_returns_defaults_on_fresh_db() {
        let db = setup();
        let conn = db.conn.lock().unwrap();
        let prefs = get_preferences(&conn).unwrap();

        assert!(prefs.current_path.is_none());
        assert!(prefs.current_playlist.is_empty());
        assert!(!prefs.on_repeat);
        assert!(!prefs.on_shuffle);
    }

    #[test]
    fn save_and_get_preferences_roundtrip() {
        let db = setup();
        let conn = db.conn.lock().unwrap();
        let playlist = vec!["/a.mp3".to_string(), "/b.mp3".to_string()];

        save_preferences(&conn, Some("/music/song.mp3"), &playlist, true, false).unwrap();

        let prefs = get_preferences(&conn).unwrap();
        assert_eq!(prefs.current_path.as_deref(), Some("/music/song.mp3"));
        assert_eq!(prefs.current_playlist, playlist);
        assert!(prefs.on_repeat);
        assert!(!prefs.on_shuffle);
    }

    #[test]
    fn saving_none_path_clears_current_path() {
        let db = setup();
        let conn = db.conn.lock().unwrap();

        save_preferences(&conn, Some("/music/song.mp3"), &[], false, false).unwrap();
        save_preferences(&conn, None, &[], false, false).unwrap();

        let prefs = get_preferences(&conn).unwrap();
        assert!(prefs.current_path.is_none());
    }

    #[test]
    fn preferences_are_updated_on_repeated_saves() {
        let db = setup();
        let conn = db.conn.lock().unwrap();

        save_preferences(&conn, None, &[], false, false).unwrap();
        save_preferences(&conn, None, &[], true, true).unwrap();

        let prefs = get_preferences(&conn).unwrap();
        assert!(prefs.on_repeat);
        assert!(prefs.on_shuffle);
    }

    #[test]
    fn empty_current_playlist_is_persisted_correctly() {
        let db = setup();
        let conn = db.conn.lock().unwrap();

        save_preferences(&conn, None, &[], false, false).unwrap();

        let prefs = get_preferences(&conn).unwrap();
        assert!(prefs.current_playlist.is_empty());
    }
}
