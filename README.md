![Songbridge Logo](src-tauri/icons/Square150x150Logo.png "Songbridge Logo")

# Songbridge

Songbridge is an open-source, cross-platform music player and library manager for local files.

[![CI](https://github.com/kalecio/songbridge/actions/workflows/ci.yml/badge.svg)](https://github.com/kalecio/songbridge/actions/workflows/ci.yml)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](./LICENSE)
[![Discord](https://img.shields.io/badge/Discord-%235865F2.svg?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/dEej9RPjPd)

---

## Features

- Browse and play music from your local library
- Organize tracks by artist and album
- Create and manage playlists
- Persistent playback queue
- Configurable library scan paths with manual rescan
- Metadata support: title, artist, album, cover art
- Persistent preferences and playlists via SQLite

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Tauri v2](https://v2.tauri.app/) |
| Frontend | React 18, TypeScript, styled-components |
| Audio engine | Rust (rodio + symphonia) |
| Database | SQLite (rusqlite) |
| Logging | tauri-plugin-log |

## Supported Platforms

- macOS (Apple Silicon and Intel)
- Linux (x86_64 and ARM)
- Windows

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) v22+
- [Rust](https://rustup.rs/) (stable toolchain via rustup)

Follow the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/) for your OS before continuing — it covers system-level dependencies.

### Recommended IDE

[VS Code](https://code.visualstudio.com/) with the following extensions:

- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### Running

```sh
npm install
npm run tauri dev
```

### Building

```sh
npm run tauri build
```

### Testing

```sh
# Frontend (Vitest)
npm test

# Rust unit tests
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

### Linting

```sh
npm run lint          # ESLint
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
```

---

## Troubleshooting

### Linux

If you encounter rendering issues, try setting one or both of these environment variables:

```sh
WEBKIT_DISABLE_DMABUF_RENDERER=1 WEBKIT_DISABLE_COMPOSITING_MODE=1 npm run tauri dev
```

For builds:

```sh
NO_STRIP=true npm run tauri build
```

### Log files

Songbridge writes timestamped logs to a file for debugging. The location depends on your OS:

| OS | Path |
|---|---|
| macOS | `~/Library/Logs/com.songbridge.app/songbridge.log` |
| Linux | `~/.local/share/com.songbridge.app/logs/songbridge.log` |
| Windows | `%APPDATA%\com.songbridge.app\logs\songbridge.log` |

When reporting a bug, attaching this log file helps us diagnose the issue faster.

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTORS.md](./CONTRIBUTORS.md) before opening a pull request.

## License

[CC BY-NC-SA 4.0](./LICENSE)
