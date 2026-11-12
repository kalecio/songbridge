fn main() {
    println!("cargo:rerun-if-env-changed=LASTFM_API_KEY");
    println!("cargo:rerun-if-env-changed=LASTFM_WORKER_URL");
    tauri_build::build()
}
