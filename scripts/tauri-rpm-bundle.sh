#!/usr/bin/env bash
set -euo pipefail

# tauri-action always appends "build" to tauriScript. This job has already
# built the app, so replace that subcommand with bundle and reuse its binary.
if [[ "${1:-}" == "build" ]]; then
  shift
fi

exec npm run tauri -- bundle "$@"
