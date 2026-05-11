# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.1] - 2026-05-11

### Fixed
- **Auto-advance to the next track works again for every track ending naturally.** When a song reached its end, rodio's sink would empty and `get_pos()` would reset to `0`, so the frontend's `progress >= duration` check silently failed and playback just stopped — most visible on short tracks. The audio thread now tracks a high-water mark on the playhead and emits a one-shot `ended` signal when the source runs out; `current_position` returns the track's known duration on that frame so the existing auto-advance logic fires exactly once per track (no cascading skips during the next-track hand-off).
- **Windows Now Playing failure** (`HRESULT(0x800700A1) ERROR_BAD_PATHNAME`) when the cover-art file path contained spaces, accents, or any character that's illegal in a raw URI. Replaced the hand-rolled `format!("file:///{}", …)` with `Url::from_file_path`, which percent-encodes path components and produces a canonical three-slash file URL on every platform
- **Stale cover art on Windows** — SMTC keys its thumbnail cache by URL, so reusing `songbridge-cover.jpg` across tracks left the OS showing the previous album's cover. Cover files are now keyed by a content hash; identical covers across an album share one file, distinct covers always get distinct URLs
- **Corrupt embedded covers no longer break the OS Now Playing card.** Cover bytes are now sniffed against JPEG (`FF D8 FF`) and PNG (`89 50 4E 47`) magic before being written to disk; a malformed APIC frame is skipped instead of being handed to SMTC and surfaced as a generic `BAD_PATHNAME`
- **Graceful fallback when SMTC still rejects the metadata** — if `set_metadata` fails with the cover URL attached, we retry without it, so title / artist / album / duration still appear on the OS now-playing surface even when the cover is the part that's tripping Windows

### Changed
- **Diagnostic logging around the OS Now Playing bridge** — `set_now_playing` logs metadata byte-lengths, the cover URL, and whether the cover file actually exists on disk; `set_playback_state` logs `is_playing` and `elapsed_seconds`; SMTC scrubber events are logged as `media-key:seek received from OS at <s>`. Helps narrow down platform-specific quirks without a debugger

### Added
- **`url` Rust dependency** for cross-platform file-URL formatting
- A sweep of Rust unit tests (`audio::state`, `now_playing`) covering end-of-track detection, data-URL parsing, file-URL encoding on POSIX and Windows (spaces, non-ASCII, reserved characters), hash-based filename uniqueness and dedup, JPEG/PNG magic-byte validation, and URL round-tripping

## [0.4.0] - 2026-05-07

### Added
- **Favourites playlist** — heart icon in the player toggles the current track into a built-in `favourites` playlist; the playlist is auto-created on first use, pinned to the top of the Sidebar and the Create-Playlist editor, shown with a heart thumb in place of album art, and protected against accidental rename / delete
- **Playlists in search results** — the global search now matches playlist names (titles only, not their songs) alongside artists / albums / songs; Favourites is pinned to the top of the playlist matches
- **Configurable keyboard shortcuts** — Play/Pause, Next, Previous, Toggle shuffle, Toggle repeat, Toggle mute, Open audio files, Focus search. Defaults: `Space`, `N`, `P`, `S`, `R`, `M`, `⌘O` / `Ctrl+O`, `⌘/` / `Ctrl+/`. Editable from Settings → Keyboard Shortcuts (click a key cap, press a key combo, ESC to cancel) and persisted in `localStorage` with a Reset-to-defaults link
- **Hardware media key + Now Playing integration** — via the `souvlaki` Rust crate: `MPRemoteCommandCenter` on macOS, `SystemMediaTransportControls` on Windows, and MPRIS over D-Bus on Linux. Hardware play/pause/next/prev keys (including AirPods double-tap and Bluetooth headset buttons) now control Songbridge instead of opening Apple Music. The current track is published to the OS now-playing surface with title, artist, album, cover art, and a draggable scrubber that seeks back into Songbridge
- **Eva01 theme** — deep purple base with the iconic Evangelion Unit-01 lime-green accent (`#1d1a2f`, `#965fd4`, `#734f9a`, `#8bd450`, `#3f6d4e`)
- **Headrest theme** — inspired by the Car Seat Headrest *How to Leave Town* cover: warm sunset glow fading into a near-black starry sky, with cream-tinted text
- **Filename fallback for missing track titles** — tracks with no ID3 title now display the filename without its extension everywhere they're rendered (Songs view, Sidebar queue, Search results, player-bar, Create-Playlist editor) instead of empty text or the raw filesystem path. Implemented in a shared `displayTitle` helper with full unit-test coverage
- **Clickable artist link in the player bar** — clicking the artist name under the now-playing track navigates to that artist's detail page; keyboard-accessible and skipped for the placeholder "no name" state
- **Cross-platform Now-Playing cover art** — base64 album art is decoded to a temp file and handed to the OS as a `file://` URL, with proper triple-slash + forward-slash formatting for SMTC on Windows

### Changed
- **Songs view virtualization** — the song list now uses `@tanstack/react-virtual` when it has more than 100 rows. Album / artist / playlist detail pages stay below the threshold and keep the simple flex layout; libraries with thousands of tracks now render in milliseconds with smooth scrolling
- **Search input ↔ URL sync** — typing in the header search input debounces into a `/search?q=` navigation, and navigating to any other route clears the input and cancels the pending debounce so users are no longer bounced back to `/search` after clicking a sidebar link
- **Now Playing playback state is split into two commands** — `set_now_playing` (metadata, fired only on track change so we don't re-encode the cover every second) and `set_playback_state` (`is_playing` + `elapsed_seconds`, fired on every progress tick so the OS scrubber slides during playback and stays put on pause)
- **Pastel theme registry key renamed** from `'Pastel Colors'` to `'Pastel'`. Users with the old preference saved will fall back to Midnight on next launch and can re-pick "Pastel" from Settings → Appearance
- Replaced the global `* { height: 100%; width: 100% }` CSS reset (already shipped in 0.3.0 release notes; this release continues to build on the explicit-sizing approach across new components)

### Fixed
- **Text overflow across the UI** — long artist / album / song titles now ellipsize with a native browser tooltip on hover instead of stretching cards, breaking layouts, or running off-screen. Touched: Artists list cards, Artists detail hero, Album detail hero, Albums grid (which previously had `align-items: flex-start` defeating its own ellipsis rule), song-list rows, Search results (artists / songs / albums / playlists), and the player-bar song metadata (now capped at `22rem` with `min-width: 0`)
- **Now Playing scrubber resets to 0 on pause** — `elapsed_seconds` was always sent as `null`. The frontend now computes `(progress / 100) × duration` and pushes it on every state change, so the OS bar reflects the real position during playback, on pause, and on resume
- **macOS clippy `needless_borrow`** — `app.handle()` already returns a reference, so the redundant `&` in `lib.rs` is gone. `cargo clippy -- -D warnings` is clean again

### Removed
- **`tauri-plugin-global-shortcut`** — replaced by `souvlaki` for hardware media keys (it couldn't capture them on macOS anyway, where Apple routes them via `MPRemoteCommandCenter`). The Rust crate, the `@tauri-apps/plugin-global-shortcut` JS package, the `.plugin(...)` registration, and the four `global-shortcut:*` capability entries are all gone. In-app keyboard shortcuts use a plain window `keydown` listener that doesn't need a plugin

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
