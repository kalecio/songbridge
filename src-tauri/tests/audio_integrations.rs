use std::sync::{Arc, Mutex};
use std::time::Duration;

use songbridge_lib::{get_audio_probe, calculate_track_duration, AudioState};

#[test]
fn probe_and_calculate_track_duration_from_sample_file() {
    // Path relative to crate root (src-tauri)
    let path = "music-files/Polygondwanaland.mp3";
    // Ensure probe can parse the file
    let probe = get_audio_probe(path);
    // calculate duration should return Some(u64) for a valid audio file
    let duration = calculate_track_duration(&probe);
    assert!(duration.is_some(), "expected some duration for sample file");
    let secs = duration.unwrap();
    assert!(secs > 0, "expected duration in seconds > 0");
}


#[test]
fn commands_integration_tests() {
    // Prepare shared AudioState
    let audio_state = Arc::new(Mutex::new(AudioState::new()));

    // Directly exercise the `AudioState` methods (these are what the command
    // handlers call internally). This avoids constructing `tauri::State` in an
    // integration test while still testing the end-to-end behavior.
    let path = "music-files/Polygondwanaland.mp3".to_string();

    // Load the song via the inner API and verify track_duration and path.
    {
        let mut s = audio_state.lock().unwrap();
        s.load_song(&path);
        assert_eq!(s.path, path);
        assert!(s.track_duration.duration_seconds.is_some());
    }

    // Play, pause and resume should send commands to backend (no panic).
    {
        let s = audio_state.lock().unwrap();
        s.play();
        s.pause();
        s.resume();
    }

    // Volume and mute behavior
    {
        let mut s = audio_state.lock().unwrap();
        s.set_volume(0.5);
        // We cannot inspect private fields from integration tests; just ensure
        // calling the setters and toggles doesn't panic.
        s.toggle_mute();
        s.toggle_mute();
    }

    // current_position should return a Duration
    {
        let s = audio_state.lock().unwrap();
        let _pos = s.current_position();
    }

    // Seek via the inner API
    {
        let mut s = audio_state.lock().unwrap();
        // Seek to 50% if duration known
        if let Some(duration) = s.track_duration.duration_seconds {
            let target_secs = (duration as f64 * 0.5) as u64;
            s.seek(Duration::from_secs(target_secs));
        }
    }
}
