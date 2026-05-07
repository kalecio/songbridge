# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-05-07

### Added
- **Persistent library cache** — parsed track metadata is now stored in SQLite (`tracks` table, keyed by path with mtime). On launch the app hydrates instantly from cache instead of re-walking the filesystem
- **Incremental library sync** — rescans only re-parse files whose modification time changed and prune rows for files that no longer exist; unchanged files are skipped entirely
- **Scan progress UI** — a banner under the app header streams `{ current, total }` updates from a new `scan-progress` Tauri event so users can see what's happening during a sync
- **Lazy album art** — new `get_track_image` Tauri command and `useLazyAlbumArt` hook fetch cover art on demand and cache it at module level, keeping the SQLite database small (~2 MB for 4000 tracks instead of hundreds of megabytes of base64 blobs)
- **`db_load_tracks` Tauri command** — returns the cached metadata list (without art) for fast cold starts

### Changed
- `scan_music_library` is now async and runs inside `spawn_blocking`, so large libraries no longer freeze the WebView main thread on launch
- `App.tsx` now hydrates the library from the SQLite cache first, then triggers `scanLibrary` without awaiting so the UI stays responsive while the background sync runs
- `DbState.conn` is now `Arc<Mutex<Connection>>` so the scan task can hold a cheap clone for progressive upserts
- `AlbumImage`, `Albums/Detail`, `Artists/List`, `Artists/Detail`, and `Search` now thread a `coverPath` through to lazy-load art when no eager image is available
- Replaced the global `* { height: 100%; width: 100% }` CSS reset with explicit sizing on the components that actually need it (Player, Sidebar, Controls, ProgressBar, Slider, HeroSection, Search, Playlist styles)

### Fixed
- Player search debounce no longer navigates back to `/` every 300 ms when the input is empty — the effect bails out on empty input and only triggers navigation when the user actually types something
- Album art rendering and added artist art across Artists list, Search results, and album cards
- Scroll behavior on pages that render songlists (Album Detail, Artist Detail) so long playlists scroll independently of the hero section

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
