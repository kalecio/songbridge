# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-05-03

### Added
- **Global search** — search songs, artists, and albums from the header bar; results are grouped by type, deduplicated, and reflect the in-memory library with no backend round-trip
- **Runtime theme switching** — choose between *Midnight* (dark, blue-primary) and *Pastel Colors* (original palette) from Settings → Appearance; selection persists across restarts via SQLite
- **Missing file indicator** — tracks that no longer exist on disk are dimmed in playlists with a warning icon; a trash button removes them from the playlist and persists the change to the database
- **React Error Boundary** — unhandled render errors are caught, displayed with a reload prompt, and written to the log file
- **Persistent file logging** — all errors and warnings are written to a rotating log file (`~/Library/Logs/com.songbridge.app/songbridge.log` on macOS) via `tauri-plugin-log`

### Changed
- Settings page gains an **Appearance** section at the top with the theme selector
- All `console.error` calls replaced with the structured logger
- Player layout refactored: search input and settings button moved to a shared `AppHeader` bar above all routes (previously search was in the sidebar)
- All styled-components now consume semantic theme tokens instead of hardcoded hex values

### Fixed
- `setPlaylists` context type corrected to accept both value and updater-function forms
- ESLint `no-empty-object-type` rule satisfied in `styled.d.ts` via inline disable comment

## [0.1.0] - 2024-01-01

### Added
- Initial release
- Music library scanning with metadata extraction (title, artist, album, duration, cover art)
- Audio playback with play/pause, seek, next/previous, shuffle, and repeat
- Volume control
- Persistent playback preferences (current track, playlist, repeat, shuffle) stored in SQLite
- Playlist management — create, rename, reorder songs, and delete playlists
- Artists and Albums views with hero sections and detail pages
- Songs list view
- Library path management in Settings with rescan support
- CI pipeline with Rust fmt/check/test/audit and frontend lint/typecheck/test
- Release workflow for macOS (universal), Linux (x86 + ARM), and Windows
