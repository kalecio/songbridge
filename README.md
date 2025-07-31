# Songbridge

Songbridge is a open source cross-plataform music player and library manager for local files.

## Development
### Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### Prerequisites

Necessary requirements to develop the app:
* [Node.js](https://nodejs.org/en/download) version 22.17.1
* [Tauri](https://v2.tauri.app/) version 11.5.2
* [RustUp](https://rustup.rs/)

Make sure to follow the prerequisites in the [tauri documentation](https://v2.tauri.app/start/prerequisites) according to the OS you are using.

### Running the app

To run the app in development mode you can use:
```sh
npm run tauri dev 
```

To build the app use:
```sh
npm run tauri build 
```
### Trobleshoot
#### Running on Linux

Problems may happen while trying to run the commands above on linux, for that try using these enviroment variables `WEBKIT_DISABLE_DMABUF_RENDERER=1` and/or `WEBKIT_DISABLE_COMPOSITING_MODE=1` when executing the development mode and `NO_STRIP=true` when building the app.

Exemples:
```sh
WEBKIT_DISABLE_DMABUF_RENDERER=1 WEBKIT_DISABLE_COMPOSITING_MODE=1 npm run tauri dev
```
```sh
NO_STRIP=true npm run tauri build 
```

## Licence
[Lesser GLP](./LICENSE)