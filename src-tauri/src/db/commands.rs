use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::State;

use super::state::DbState;
use crate::metadata::types::{AudioDuration, AudioMetadata};

#[derive(Serialize, Deserialize)]
pub struct DbSong {
    pub path: String,
    pub title: Option<String>,
    pub artist: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct DbPlaylist {
    pub id: String,
    pub name: String,
    pub songs: Vec<DbSong>,
}

#[derive(Serialize, Deserialize)]
pub struct DbPreferences {
    pub current_path: Option<String>,
    pub current_playlist: Vec<String>,
    pub on_repeat: bool,
    pub on_shuffle: bool,
    pub theme: String,
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
            .prepare(
                "SELECT song_path, title, artist FROM playlist_songs \
                 WHERE playlist_id = ? ORDER BY position",
            )
            .map_err(|e| e.to_string())?;

        let songs: Vec<DbSong> = song_stmt
            .query_map(params![id], |row| {
                Ok(DbSong {
                    path: row.get(0)?,
                    title: row.get(1)?,
                    artist: row.get(2)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<_, _>>()
            .map_err(|e| e.to_string())?;

        result.push(DbPlaylist { id, name, songs });
    }

    Ok(result)
}

pub(crate) fn upsert_playlist(
    conn: &Connection,
    id: &str,
    name: &str,
    songs: &[DbSong],
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

    for (position, song) in songs.iter().enumerate() {
        conn.execute(
            "INSERT INTO playlist_songs (playlist_id, song_path, position, title, artist) \
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, song.path, position as i64, song.title, song.artist],
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
        theme: get("theme").unwrap_or_else(|| "Midnight".to_string()),
    })
}

pub(crate) fn save_preferences(
    conn: &Connection,
    current_path: Option<&str>,
    current_playlist: &[String],
    on_repeat: bool,
    on_shuffle: bool,
    theme: &str,
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
    upsert("theme", theme).map_err(|e| e.to_string())?;

    Ok(())
}

pub(crate) fn get_library_paths(conn: &Connection) -> Result<Vec<String>, String> {
    let mut stmt = conn
        .prepare("SELECT path FROM library_paths ORDER BY path")
        .map_err(|e| e.to_string())?;

    let paths: Vec<String> = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<_, _>>()
        .map_err(|e| e.to_string())?;
    Ok(paths)
}

pub(crate) fn add_library_path(conn: &Connection, path: &str) -> Result<(), String> {
    conn.execute(
        "INSERT OR IGNORE INTO library_paths (path) VALUES (?1)",
        params![path],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub(crate) fn remove_library_path(conn: &Connection, path: &str) -> Result<(), String> {
    conn.execute("DELETE FROM library_paths WHERE path = ?1", params![path])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── tracks (cached library metadata, no album art) ───────────────────────────

pub(crate) fn get_cached_tracks(conn: &Connection) -> Result<Vec<AudioMetadata>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT path, title, artist, album, year, track_number, \
                    duration_seconds, duration_formatted \
             FROM tracks ORDER BY path",
        )
        .map_err(|e| e.to_string())?;

    let tracks: Vec<AudioMetadata> = stmt
        .query_map([], |row| {
            let path: String = row.get(0)?;
            let title: Option<String> = row.get(1)?;
            let artist: Option<String> = row.get(2)?;
            let album: Option<String> = row.get(3)?;
            let year: Option<String> = row.get(4)?;
            let track: Option<i64> = row.get(5)?;
            let duration_seconds: Option<i64> = row.get(6)?;
            let duration_formatted: Option<String> = row.get(7)?;
            Ok(AudioMetadata {
                title,
                artist,
                album,
                year,
                track: track.map(|n| n as u32),
                duration: AudioDuration::new(
                    duration_seconds.map(|n| n as u64),
                    duration_formatted,
                ),
                path: Some(path),
                image: None, // image is lazy-loaded on demand
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<_, _>>()
        .map_err(|e| e.to_string())?;

    Ok(tracks)
}

pub(crate) fn get_cached_track_mtimes(conn: &Connection) -> Result<HashMap<String, i64>, String> {
    let mut stmt = conn
        .prepare("SELECT path, mtime FROM tracks")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            let path: String = row.get(0)?;
            let mtime: i64 = row.get(1)?;
            Ok((path, mtime))
        })
        .map_err(|e| e.to_string())?;

    let mut map = HashMap::new();
    for row in rows {
        let (path, mtime) = row.map_err(|e| e.to_string())?;
        map.insert(path, mtime);
    }
    Ok(map)
}

pub(crate) fn upsert_track(
    conn: &Connection,
    meta: &AudioMetadata,
    mtime: i64,
) -> Result<(), String> {
    let path = meta.path.as_deref().ok_or("track missing path")?;
    let duration_seconds = meta.duration.duration_seconds.map(|n| n as i64);
    // Clone the formatted string out via serde since the field is private.
    let duration_formatted = serde_json::to_value(&meta.duration).ok().and_then(|v| {
        v.get("duration_formatted")
            .and_then(|s| s.as_str().map(String::from))
    });

    conn.execute(
        "INSERT INTO tracks
            (path, mtime, title, artist, album, year, track_number,
             duration_seconds, duration_formatted)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT(path) DO UPDATE SET
            mtime              = excluded.mtime,
            title              = excluded.title,
            artist             = excluded.artist,
            album              = excluded.album,
            year               = excluded.year,
            track_number       = excluded.track_number,
            duration_seconds   = excluded.duration_seconds,
            duration_formatted = excluded.duration_formatted",
        params![
            path,
            mtime,
            meta.title,
            meta.artist,
            meta.album,
            meta.year,
            meta.track.map(|n| n as i64),
            duration_seconds,
            duration_formatted,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Updates the `path` primary key for a track and all playlist_songs that reference it.
/// Called after a file rename so every reference stays consistent.
pub(crate) fn rename_track_path(
    conn: &Connection,
    old_path: &str,
    new_path: &str,
) -> Result<(), String> {
    conn.execute(
        "UPDATE tracks SET path = ?1 WHERE path = ?2",
        params![new_path, old_path],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE playlist_songs SET song_path = ?1 WHERE song_path = ?2",
        params![new_path, old_path],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub(crate) fn get_track_by_path(
    conn: &Connection,
    path: &str,
) -> Result<Option<AudioMetadata>, String> {
    let result = conn.query_row(
        "SELECT path, title, artist, album, year, track_number, duration_seconds, duration_formatted \
         FROM tracks WHERE path = ?1",
        params![path],
        |row| {
            let duration_seconds: Option<i64> = row.get(6)?;
            let duration_formatted: Option<String> = row.get(7)?;
            Ok(AudioMetadata {
                path: Some(row.get(0)?),
                title: row.get(1)?,
                artist: row.get(2)?,
                album: row.get(3)?,
                year: row.get(4)?,
                track: row.get::<_, Option<i64>>(5)?.map(|n| n as u32),
                duration: AudioDuration::new(
                    duration_seconds.map(|n| n as u64),
                    duration_formatted,
                ),
                image: None,
            })
        },
    );
    match result {
        Ok(meta) => Ok(Some(meta)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub(crate) fn delete_tracks(conn: &Connection, paths: &[String]) -> Result<(), String> {
    let mut stmt = conn
        .prepare("DELETE FROM tracks WHERE path = ?1")
        .map_err(|e| e.to_string())?;
    for path in paths {
        stmt.execute(params![path]).map_err(|e| e.to_string())?;
    }
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
    songs: Vec<DbSong>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    upsert_playlist(&conn, &id, &name, &songs)
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
    theme: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    save_preferences(
        &conn,
        current_path.as_deref(),
        &current_playlist,
        on_repeat,
        on_shuffle,
        &theme,
    )
}

#[tauri::command]
pub fn db_get_library_paths(state: State<DbState>) -> Result<Vec<String>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    get_library_paths(&conn)
}

#[tauri::command]
pub fn db_add_library_path(state: State<DbState>, path: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    add_library_path(&conn, &path)
}

#[tauri::command]
pub fn db_remove_library_path(state: State<DbState>, path: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    remove_library_path(&conn, &path)
}

#[tauri::command]
pub fn db_load_tracks(state: State<DbState>) -> Result<Vec<AudioMetadata>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    get_cached_tracks(&conn)
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

    fn make_songs(paths: &[&str]) -> Vec<DbSong> {
        paths
            .iter()
            .map(|p| DbSong {
                path: p.to_string(),
                title: None,
                artist: None,
            })
            .collect()
    }

    #[test]
    fn upsert_and_get_playlist_roundtrip() {
        let db = setup();
        let conn = db.conn.lock().unwrap();
        let songs = vec![
            DbSong {
                path: "/music/a.mp3".into(),
                title: Some("Track A".into()),
                artist: Some("Artist".into()),
            },
            DbSong {
                path: "/music/b.mp3".into(),
                title: None,
                artist: None,
            },
        ];

        upsert_playlist(&conn, "pl-1", "Chill Vibes", &songs).unwrap();

        let playlists = get_playlists(&conn).unwrap();
        assert_eq!(playlists.len(), 1);
        assert_eq!(playlists[0].id, "pl-1");
        assert_eq!(playlists[0].name, "Chill Vibes");
        assert_eq!(playlists[0].songs[0].path, "/music/a.mp3");
        assert_eq!(playlists[0].songs[0].title.as_deref(), Some("Track A"));
        assert_eq!(playlists[0].songs[0].artist.as_deref(), Some("Artist"));
        assert_eq!(playlists[0].songs[1].path, "/music/b.mp3");
        assert!(playlists[0].songs[1].title.is_none());
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

        upsert_playlist(&conn, "pl-1", "Mix", &make_songs(&["/a.mp3", "/b.mp3"])).unwrap();
        upsert_playlist(&conn, "pl-1", "Mix", &make_songs(&["/c.mp3"])).unwrap();

        let playlists = get_playlists(&conn).unwrap();
        assert_eq!(playlists[0].songs[0].path, "/c.mp3");
    }

    #[test]
    fn songs_preserve_insertion_order() {
        let db = setup();
        let conn = db.conn.lock().unwrap();
        let songs: Vec<DbSong> = (0..5)
            .map(|i| DbSong {
                path: format!("/track{i}.mp3"),
                title: None,
                artist: None,
            })
            .collect();

        upsert_playlist(&conn, "pl-1", "Ordered", &songs).unwrap();

        let result = get_playlists(&conn).unwrap();
        let got_paths: Vec<&str> = result[0].songs.iter().map(|s| s.path.as_str()).collect();
        assert_eq!(
            got_paths,
            vec![
                "/track0.mp3",
                "/track1.mp3",
                "/track2.mp3",
                "/track3.mp3",
                "/track4.mp3"
            ]
        );
    }

    #[test]
    fn delete_playlist_removes_it_and_its_songs() {
        let db = setup();
        let conn = db.conn.lock().unwrap();

        upsert_playlist(&conn, "pl-1", "To Delete", &make_songs(&["/a.mp3"])).unwrap();
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
        assert_eq!(prefs.theme, "Midnight");
    }

    #[test]
    fn save_and_get_preferences_roundtrip() {
        let db = setup();
        let conn = db.conn.lock().unwrap();
        let playlist = vec!["/a.mp3".to_string(), "/b.mp3".to_string()];

        save_preferences(
            &conn,
            Some("/music/song.mp3"),
            &playlist,
            true,
            false,
            "Pastel Colors",
        )
        .unwrap();

        let prefs = get_preferences(&conn).unwrap();
        assert_eq!(prefs.current_path.as_deref(), Some("/music/song.mp3"));
        assert_eq!(prefs.current_playlist, playlist);
        assert!(prefs.on_repeat);
        assert!(!prefs.on_shuffle);
        assert_eq!(prefs.theme, "Pastel Colors");
    }

    #[test]
    fn saving_none_path_clears_current_path() {
        let db = setup();
        let conn = db.conn.lock().unwrap();

        save_preferences(
            &conn,
            Some("/music/song.mp3"),
            &[],
            false,
            false,
            "Midnight",
        )
        .unwrap();
        save_preferences(&conn, None, &[], false, false, "Midnight").unwrap();

        let prefs = get_preferences(&conn).unwrap();
        assert!(prefs.current_path.is_none());
    }

    #[test]
    fn preferences_are_updated_on_repeated_saves() {
        let db = setup();
        let conn = db.conn.lock().unwrap();

        save_preferences(&conn, None, &[], false, false, "Midnight").unwrap();
        save_preferences(&conn, None, &[], true, true, "Pastel Colors").unwrap();

        let prefs = get_preferences(&conn).unwrap();
        assert!(prefs.on_repeat);
        assert!(prefs.on_shuffle);
        assert_eq!(prefs.theme, "Pastel Colors");
    }

    #[test]
    fn empty_current_playlist_is_persisted_correctly() {
        let db = setup();
        let conn = db.conn.lock().unwrap();

        save_preferences(&conn, None, &[], false, false, "Midnight").unwrap();

        let prefs = get_preferences(&conn).unwrap();
        assert!(prefs.current_playlist.is_empty());
    }

    // ── library paths ─────────────────────────────────────────────────────────

    #[test]
    fn get_library_paths_returns_empty_on_fresh_db() {
        let db = setup();
        let conn = db.conn.lock().unwrap();
        assert!(get_library_paths(&conn).unwrap().is_empty());
    }

    #[test]
    fn add_and_get_library_paths_roundtrip() {
        let db = setup();
        let conn = db.conn.lock().unwrap();

        add_library_path(&conn, "/music/rock").unwrap();
        add_library_path(&conn, "/music/jazz").unwrap();

        let paths = get_library_paths(&conn).unwrap();
        assert_eq!(paths.len(), 2);
        assert!(paths.contains(&"/music/jazz".to_string()));
        assert!(paths.contains(&"/music/rock".to_string()));
    }

    #[test]
    fn add_duplicate_path_is_a_noop() {
        let db = setup();
        let conn = db.conn.lock().unwrap();

        add_library_path(&conn, "/music/rock").unwrap();
        add_library_path(&conn, "/music/rock").unwrap();

        assert_eq!(get_library_paths(&conn).unwrap().len(), 1);
    }

    #[test]
    fn remove_library_path_deletes_it() {
        let db = setup();
        let conn = db.conn.lock().unwrap();

        add_library_path(&conn, "/music/rock").unwrap();
        remove_library_path(&conn, "/music/rock").unwrap();

        assert!(get_library_paths(&conn).unwrap().is_empty());
    }

    #[test]
    fn remove_nonexistent_library_path_is_a_noop() {
        let db = setup();
        let conn = db.conn.lock().unwrap();
        assert!(remove_library_path(&conn, "/does/not/exist").is_ok());
    }

    // ── tracks ────────────────────────────────────────────────────────────────

    fn make_meta(path: &str, title: &str, mtime_marker_artist: &str) -> AudioMetadata {
        AudioMetadata {
            title: Some(title.into()),
            artist: Some(mtime_marker_artist.into()),
            album: Some("Album".into()),
            year: Some("2024".into()),
            track: None,
            duration: AudioDuration::new(Some(180), Some("03:00".into())),
            path: Some(path.into()),
            image: None,
        }
    }

    fn make_meta_with_track(path: &str, title: &str, track: Option<u32>) -> AudioMetadata {
        AudioMetadata {
            title: Some(title.into()),
            artist: Some("Artist".into()),
            album: Some("Album".into()),
            year: Some("2024".into()),
            track,
            duration: AudioDuration::new(Some(180), Some("03:00".into())),
            path: Some(path.into()),
            image: None,
        }
    }

    #[test]
    fn cached_tracks_are_empty_on_fresh_db() {
        let db = setup();
        let conn = db.conn.lock().unwrap();
        assert!(get_cached_tracks(&conn).unwrap().is_empty());
        assert!(get_cached_track_mtimes(&conn).unwrap().is_empty());
    }

    #[test]
    fn upsert_and_get_cached_tracks_roundtrip() {
        let db = setup();
        let conn = db.conn.lock().unwrap();
        let meta = make_meta("/music/a.mp3", "Track A", "Artist A");

        upsert_track(&conn, &meta, 12345).unwrap();

        let cached = get_cached_tracks(&conn).unwrap();
        assert_eq!(cached.len(), 1);
        assert_eq!(cached[0].path.as_deref(), Some("/music/a.mp3"));
        assert_eq!(cached[0].title.as_deref(), Some("Track A"));
        assert_eq!(cached[0].artist.as_deref(), Some("Artist A"));
        assert_eq!(cached[0].duration.duration_seconds, Some(180));
        assert!(cached[0].image.is_none());

        let mtimes = get_cached_track_mtimes(&conn).unwrap();
        assert_eq!(mtimes.get("/music/a.mp3"), Some(&12345));
    }

    #[test]
    fn upsert_replaces_existing_row_on_conflict() {
        let db = setup();
        let conn = db.conn.lock().unwrap();

        upsert_track(&conn, &make_meta("/p.mp3", "Old", "Artist"), 1).unwrap();
        upsert_track(&conn, &make_meta("/p.mp3", "New", "Artist"), 2).unwrap();

        let cached = get_cached_tracks(&conn).unwrap();
        assert_eq!(cached.len(), 1);
        assert_eq!(cached[0].title.as_deref(), Some("New"));

        let mtimes = get_cached_track_mtimes(&conn).unwrap();
        assert_eq!(mtimes.get("/p.mp3"), Some(&2));
    }

    #[test]
    fn delete_tracks_removes_only_specified_paths() {
        let db = setup();
        let conn = db.conn.lock().unwrap();

        upsert_track(&conn, &make_meta("/a.mp3", "A", "Artist"), 1).unwrap();
        upsert_track(&conn, &make_meta("/b.mp3", "B", "Artist"), 1).unwrap();
        upsert_track(&conn, &make_meta("/c.mp3", "C", "Artist"), 1).unwrap();

        delete_tracks(&conn, &["/a.mp3".into(), "/c.mp3".into()]).unwrap();

        let remaining: Vec<String> = get_cached_tracks(&conn)
            .unwrap()
            .into_iter()
            .filter_map(|m| m.path)
            .collect();
        assert_eq!(remaining, vec!["/b.mp3".to_string()]);
    }

    #[test]
    fn track_number_roundtrips_through_upsert_and_read() {
        let db = setup();
        let conn = db.conn.lock().unwrap();
        upsert_track(&conn, &make_meta_with_track("/a.mp3", "A", Some(4)), 1).unwrap();
        upsert_track(&conn, &make_meta_with_track("/b.mp3", "B", None), 1).unwrap();

        let cached = get_cached_tracks(&conn).unwrap();
        let a = cached
            .iter()
            .find(|m| m.path.as_deref() == Some("/a.mp3"))
            .unwrap();
        let b = cached
            .iter()
            .find(|m| m.path.as_deref() == Some("/b.mp3"))
            .unwrap();
        assert_eq!(a.track, Some(4));
        assert_eq!(b.track, None);
    }
}
