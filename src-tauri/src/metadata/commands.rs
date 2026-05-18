use crate::db::state::DbState;
use crate::metadata::types::{AudioDuration, AudioMetadata};

use crate::audio::utils::{calculate_track_duration, format_duration, get_audio_probe};
use crate::metadata::utils::{
    apply_tags_from_revision, extract_album_art, extract_album_art_probed, process_cover_art,
    write_metadata_to_file, CoverArtUpdate,
};
use base64::Engine;
use tauri::State;

#[tauri::command]
pub fn get_track_image(path: &str) -> Result<Option<String>, String> {
    let mut probe = get_audio_probe(path)?;
    let image = extract_album_art(probe.format.as_mut())
        .or_else(|| extract_album_art_probed(&mut probe.metadata));
    Ok(image)
}

#[tauri::command]
pub fn get_metadata(path: &str) -> Result<AudioMetadata, String> {
    println!("Getting metadata for file: {}", path);
    let mut probe = get_audio_probe(path)?;
    let total_duration = calculate_track_duration(&probe);
    let formatted_duration = format_duration(total_duration);
    let duration = AudioDuration::new(total_duration, formatted_duration);
    let mut title = None;
    let mut artist = None;
    let mut album = None;
    let mut year = None;
    let mut track = None;

    // 1) Container metadata (works well for FLAC/OGG/etc).
    let mut meta = probe.format.metadata();
    let latest_opt = if let Some(cur) = meta.current() {
        Some(cur)
    } else {
        meta.skip_to_latest()
    };
    if let Some(latest) = latest_opt {
        apply_tags_from_revision(
            latest,
            &mut title,
            &mut artist,
            &mut album,
            &mut year,
            &mut track,
        );
    }

    // 2) Probed metadata (common for MP3 ID3 tags).
    if title.is_none() || artist.is_none() || album.is_none() || year.is_none() || track.is_none() {
        if let Some(mut meta) = probe.metadata.get() {
            if let Some(latest) = meta.skip_to_latest() {
                apply_tags_from_revision(
                    latest,
                    &mut title,
                    &mut artist,
                    &mut album,
                    &mut year,
                    &mut track,
                );
            }
        }
    }

    // Album art: prefer container art, fall back to probed art.
    let image = extract_album_art(probe.format.as_mut())
        .or_else(|| extract_album_art_probed(&mut probe.metadata));

    println!(
        "Title: {:?}, Artist: {:?}, Album: {:?}, Year: {:?}, Track: {:?}, Duration: {:?}",
        title, artist, album, year, track, duration
    );
    Ok(AudioMetadata {
        title,
        artist,
        album,
        year,
        track,
        duration,
        path: Some(path.to_string()),
        image,
    })
}

/// Returns a base64 data URL of the given image after resizing to max 800×800 px.
/// Used by the frontend to preview cover art before committing the edit.
#[tauri::command]
pub fn get_image_preview(path: &str) -> Result<String, String> {
    let jpeg = process_cover_art(path)?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&jpeg);
    Ok(format!("data:image/jpeg;base64,{}", b64))
}

/// Replace characters that are illegal in filenames on any major OS.
pub(crate) fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' | '\0' => '_',
            c => c,
        })
        .collect::<String>()
        .trim()
        .to_string()
}

#[tauri::command]
pub fn update_track_metadata(
    db_state: State<DbState>,
    path: String,
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    year: Option<String>,
    track: Option<u32>,
    cover_art_path: Option<String>,
    remove_cover_art: bool,
    // Base name (no extension) for the new filename, or null to keep existing.
    new_filename: Option<String>,
) -> Result<AudioMetadata, String> {
    // ── Cover art ────────────────────────────────────────────────────────────
    let cover_art_update = if remove_cover_art {
        CoverArtUpdate::Remove
    } else if let Some(ref art_path) = cover_art_path {
        let jpeg = process_cover_art(art_path)?;
        CoverArtUpdate::Replace(jpeg)
    } else {
        CoverArtUpdate::Keep
    };

    let new_image: Option<String> = match &cover_art_update {
        CoverArtUpdate::Replace(jpeg) => {
            let b64 = base64::engine::general_purpose::STANDARD.encode(jpeg);
            Some(format!("data:image/jpeg;base64,{}", b64))
        }
        CoverArtUpdate::Remove | CoverArtUpdate::Keep => None,
    };

    // ── DB: fetch duration early so file ops don't race with a DB lock ───────
    let conn = db_state.conn.lock().map_err(|e| e.to_string())?;
    let duration = crate::db::commands::get_track_by_path(&conn, &path)?
        .map(|m| m.duration)
        .unwrap_or_default();

    // ── File rename (if requested) ────────────────────────────────────────────
    let final_path: String = if let Some(ref base_name) = new_filename {
        let sanitized = sanitize_filename(base_name);
        if sanitized.is_empty() {
            return Err("Filename cannot be empty".to_string());
        }
        let old = std::path::Path::new(&path);
        let ext = old.extension().and_then(|e| e.to_str()).unwrap_or("");
        let parent = old.parent().ok_or("Cannot determine parent directory")?;
        let new_name = if ext.is_empty() {
            sanitized
        } else {
            format!("{}.{}", sanitized, ext)
        };
        let new_path = parent.join(&new_name);
        // Only rename if the name actually differs
        if new_path != old {
            if new_path.exists() {
                return Err(format!(
                    "A file named \"{}\" already exists in the same folder",
                    new_name
                ));
            }
            let new_path_str = new_path
                .to_str()
                .ok_or("New path contains invalid UTF-8")?
                .to_string();
            std::fs::rename(&path, &new_path_str).map_err(|e| e.to_string())?;
            new_path_str
        } else {
            path.clone()
        }
    } else {
        path.clone()
    };

    // ── Write metadata tags ───────────────────────────────────────────────────
    write_metadata_to_file(
        &final_path,
        title.as_deref(),
        artist.as_deref(),
        album.as_deref(),
        year.as_deref(),
        track,
        cover_art_update,
    )?;

    // ── mtime after write ─────────────────────────────────────────────────────
    let mtime = std::fs::metadata(&final_path)
        .and_then(|m| m.modified())
        .map(|t| {
            t.duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0)
        })
        .map_err(|e| e.to_string())?;

    // ── DB updates ────────────────────────────────────────────────────────────
    if final_path != path {
        crate::db::commands::rename_track_path(&conn, &path, &final_path)?;
    }

    let updated = AudioMetadata {
        title,
        artist,
        album,
        year,
        track,
        duration,
        path: Some(final_path),
        image: new_image,
    };

    crate::db::commands::upsert_track(&conn, &updated, mtime)?;

    Ok(updated)
}

// ── tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::state::DbState;
    use crate::metadata::types::{AudioDuration, AudioMetadata};

    // ── sanitize_filename ─────────────────────────────────────────────────────

    #[test]
    fn safe_name_is_unchanged() {
        assert_eq!(sanitize_filename("Artist - Song"), "Artist - Song");
    }

    #[test]
    fn illegal_chars_are_replaced_with_underscore() {
        let bad = r#"a/b\c:d*e?f"g<h>i|j"#;
        let sanitized = sanitize_filename(bad);
        assert!(!sanitized.contains('/'));
        assert!(!sanitized.contains('\\'));
        assert!(!sanitized.contains(':'));
        assert!(!sanitized.contains('*'));
        assert!(!sanitized.contains('?'));
        assert!(!sanitized.contains('"'));
        assert!(!sanitized.contains('<'));
        assert!(!sanitized.contains('>'));
        assert!(!sanitized.contains('|'));
        assert_eq!(sanitized.len(), bad.len());
    }

    #[test]
    fn null_byte_is_replaced_with_underscore() {
        let name = "track\0name";
        assert_eq!(sanitize_filename(name), "track_name");
    }

    #[test]
    fn leading_and_trailing_whitespace_is_trimmed() {
        assert_eq!(sanitize_filename("  song  "), "song");
    }

    #[test]
    fn all_illegal_chars_gives_all_underscores() {
        let only_bad = "///";
        assert_eq!(sanitize_filename(only_bad), "___");
    }

    // ── rename_track_path and get_track_by_path ───────────────────────────────

    fn make_meta(path: &str) -> AudioMetadata {
        AudioMetadata {
            path: Some(path.into()),
            title: Some("Title".into()),
            artist: Some("Artist".into()),
            album: Some("Album".into()),
            year: Some("2020".into()),
            track: Some(1),
            duration: AudioDuration::new(Some(120), Some("02:00".into())),
            image: None,
        }
    }

    #[test]
    fn get_track_by_path_returns_none_when_not_found() {
        let db = DbState::in_memory().unwrap();
        let conn = db.conn.lock().unwrap();
        let result = crate::db::commands::get_track_by_path(&conn, "/nonexistent.mp3").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn get_track_by_path_returns_track_after_upsert() {
        let db = DbState::in_memory().unwrap();
        let conn = db.conn.lock().unwrap();
        let meta = make_meta("/music/a.mp3");
        crate::db::commands::upsert_track(&conn, &meta, 9999).unwrap();

        let found = crate::db::commands::get_track_by_path(&conn, "/music/a.mp3")
            .unwrap()
            .unwrap();
        assert_eq!(found.path.as_deref(), Some("/music/a.mp3"));
        assert_eq!(found.title.as_deref(), Some("Title"));
    }

    #[test]
    fn rename_track_path_updates_tracks_table() {
        let db = DbState::in_memory().unwrap();
        let conn = db.conn.lock().unwrap();
        crate::db::commands::upsert_track(&conn, &make_meta("/old.mp3"), 1).unwrap();

        crate::db::commands::rename_track_path(&conn, "/old.mp3", "/new.mp3").unwrap();

        assert!(crate::db::commands::get_track_by_path(&conn, "/old.mp3")
            .unwrap()
            .is_none());
        let moved = crate::db::commands::get_track_by_path(&conn, "/new.mp3")
            .unwrap()
            .unwrap();
        assert_eq!(moved.path.as_deref(), Some("/new.mp3"));
    }

    #[test]
    fn rename_track_path_updates_playlist_songs_references() {
        let db = DbState::in_memory().unwrap();
        let conn = db.conn.lock().unwrap();

        crate::db::commands::upsert_track(&conn, &make_meta("/old.mp3"), 1).unwrap();
        crate::db::commands::upsert_playlist(
            &conn,
            "pl-1",
            "Test",
            &[crate::db::commands::DbSong {
                path: "/old.mp3".into(),
                title: None,
                artist: None,
            }],
        )
        .unwrap();

        crate::db::commands::rename_track_path(&conn, "/old.mp3", "/new.mp3").unwrap();

        let playlists = crate::db::commands::get_playlists(&conn).unwrap();
        assert_eq!(playlists[0].songs[0].path, "/new.mp3");
    }

    #[test]
    fn rename_track_path_on_missing_track_is_a_noop() {
        let db = DbState::in_memory().unwrap();
        let conn = db.conn.lock().unwrap();
        // Should not error even when path does not exist in DB
        assert!(crate::db::commands::rename_track_path(&conn, "/ghost.mp3", "/new.mp3").is_ok());
    }
}
