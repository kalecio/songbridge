use rusqlite::{Connection, Result};
use std::path::Path;
use std::sync::Mutex;

pub struct DbState {
    pub conn: Mutex<Connection>,
}

impl DbState {
    pub fn new(path: &Path) -> Result<Self> {
        let conn = Connection::open(path)?;
        Self::init(conn)
    }

    #[cfg(test)]
    pub fn in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        Self::init(conn)
    }

    fn init(conn: Connection) -> Result<Self> {
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS playlists (
                id   TEXT PRIMARY KEY,
                name TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS playlist_songs (
                playlist_id        TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
                song_path          TEXT NOT NULL,
                position           INTEGER NOT NULL,
                title              TEXT,
                artist             TEXT,
                image              TEXT,
                duration_seconds   REAL,
                duration_formatted TEXT
            );

            CREATE TABLE IF NOT EXISTS preferences (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS library_paths (
                path TEXT PRIMARY KEY
            );
            ",
        )?;
        // Migrate existing DBs that predate these columns
        let _ = conn.execute_batch("ALTER TABLE playlist_songs ADD COLUMN title TEXT;");
        let _ = conn.execute_batch("ALTER TABLE playlist_songs ADD COLUMN artist TEXT;");
        let _ = conn.execute_batch("ALTER TABLE playlist_songs ADD COLUMN image TEXT;");
        let _ = conn.execute_batch("ALTER TABLE playlist_songs ADD COLUMN duration_seconds REAL;");
        let _ =
            conn.execute_batch("ALTER TABLE playlist_songs ADD COLUMN duration_formatted TEXT;");
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_schema_on_init() {
        let db = DbState::in_memory().unwrap();
        let conn = db.conn.lock().unwrap();

        for table in &[
            "playlists",
            "playlist_songs",
            "preferences",
            "library_paths",
        ] {
            let count: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
                    rusqlite::params![table],
                    |row| row.get(0),
                )
                .unwrap();
            assert_eq!(count, 1, "table '{table}' should exist");
        }
    }

    #[test]
    fn foreign_keys_are_enabled() {
        let db = DbState::in_memory().unwrap();
        let conn = db.conn.lock().unwrap();
        let fk: i64 = conn
            .query_row("PRAGMA foreign_keys", [], |row| row.get(0))
            .unwrap();
        assert_eq!(fk, 1);
    }
}
