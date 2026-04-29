const manifest = 'src-tauri/Cargo.toml';

export default {
  'src/**/*.{ts,tsx,json}': ['prettier --write', 'eslint --fix'],
  'src-tauri/src/**/*.rs': () => [
    `cargo fmt --manifest-path ${manifest}`,
    `cargo check --manifest-path ${manifest}`,
    `cargo test --manifest-path ${manifest}`,
    `cargo audit --file src-tauri/Cargo.lock`,
  ],
};
