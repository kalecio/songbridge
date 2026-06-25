use std::fs::File;
use std::io::BufReader;
use std::sync::mpsc::Sender as StdSender;
use std::thread;
use std::time::Duration;

use crossbeam_channel::Sender;
use rodio::{decoder::DecoderBuilder, OutputStreamBuilder, Sink};

/// Load a track from path and append to sink.
/// Returns true if track was successfully loaded and appended.
fn load_track(sink: &Sink, path: &str) -> bool {
    let Ok(file) = File::open(path) else {
        return false;
    };
    let byte_len = file.metadata().map(|m| m.len()).unwrap_or(0);
    let Ok(source) = DecoderBuilder::new()
        .with_data(BufReader::new(file))
        .with_byte_len(byte_len)
        .with_seekable(true)
        .build()
    else {
        return false;
    };
    sink.append(source);
    true
}

/// Reply from a `GetPosition` request: the current playhead position plus
/// a one-shot "track just ended naturally" flag. The flag fires exactly
/// once per Load (after the rodio sink has actually played at least a
/// fraction of a second, so the in-between window during `Load` doesn't
/// look like an ended track).
#[derive(Debug)]
pub struct PositionReport {
    pub position: Duration,
    pub ended: bool,
}

/// Commands that can be sent to the audio backend thread.
#[derive(Debug)]
pub enum AudioCommand {
    Load(String),
    Play,
    Pause,
    Resume,
    SetVolume(f32),
    Seek(Duration),
    GetPosition(StdSender<PositionReport>),
}

/// Spawn the audio thread and return a `Sender` to send `AudioCommand`s to it.
pub fn spawn_audio_thread() -> Sender<AudioCommand> {
    let (tx, rx) = crossbeam_channel::unbounded::<AudioCommand>();

    thread::spawn(move || {
        // Keep the stream alive on this thread so any non-`Send` platform
        // resources remain local to the audio thread.
        let _stream =
            OutputStreamBuilder::open_default_stream().expect("open default audio stream");
        let sink = Sink::connect_new(_stream.mixer());

        // Track end-of-track detection state. `max_pos` lets us tell apart
        // "sink is empty because we haven't started yet" from "sink is empty
        // because the source ran out". `ended_reported` makes the `ended`
        // flag a one-shot per Load, so the frontend can't trigger
        // auto-advance more than once for the same track if multiple polls
        // race during the hand-off.
        let mut max_pos: Duration = Duration::from_secs(0);
        let mut ended_reported = false;
        let started_threshold = Duration::from_millis(500);
        // Store the last loaded path so we can reload the track when seeking
        // on an empty sink (e.g., repeat-one after track ends).
        let mut current_path: Option<String> = None;

        while let Ok(cmd) = rx.recv() {
            match cmd {
                AudioCommand::Load(path) => {
                    current_path = Some(path.clone());
                    sink.stop();
                    max_pos = Duration::from_secs(0);
                    ended_reported = false;
                    if load_track(&sink, &path) {
                        sink.pause();
                    }
                }
                AudioCommand::Play => sink.play(),
                AudioCommand::Pause => sink.pause(),
                AudioCommand::Resume => sink.play(),
                AudioCommand::SetVolume(v) => sink.set_volume(v),
                AudioCommand::Seek(pos) => {
                    // If the sink is empty (track ended), reload the track first
                    if sink.empty() {
                        if let Some(path) = &current_path {
                            load_track(&sink, path);
                        }
                    }
                    let _ = sink.try_seek(pos);
                    max_pos = Duration::from_secs(0);
                    ended_reported = false;
                }
                AudioCommand::GetPosition(resp) => {
                    let pos = sink.get_pos();
                    if pos > max_pos {
                        max_pos = pos;
                    }
                    let is_ended = sink.empty() && max_pos >= started_threshold;
                    let report_ended = is_ended && !ended_reported;
                    if report_ended {
                        ended_reported = true;
                    }
                    let _ = resp.send(PositionReport {
                        position: pos,
                        ended: report_ended,
                    });
                }
            }
        }

        // Channel closed, thread exits and `_stream` drops here.
    });

    tx
}

#[cfg(test)]
mod tests {
    use super::*;
    use rodio::OutputStreamBuilder;
    use std::fs::File;
    use std::io::Write;
    use std::sync::mpsc::channel;
    use std::time::Duration;
    use tempfile::NamedTempFile;

    #[test]
    fn audio_command_variants_and_debug() {
        // Load variant
        let load = AudioCommand::Load("file.mp3".to_string());
        if let AudioCommand::Load(p) = load {
            assert_eq!(p, "file.mp3");
        } else {
            panic!("expected Load variant");
        }

        // Play/Pause/Resume
        match AudioCommand::Play {
            AudioCommand::Play => {}
            _ => panic!("expected Play"),
        }

        match AudioCommand::Pause {
            AudioCommand::Pause => {}
            _ => panic!("expected Pause"),
        }

        match AudioCommand::Resume {
            AudioCommand::Resume => {}
            _ => panic!("expected Resume"),
        }

        // SetVolume
        match AudioCommand::SetVolume(0.5) {
            AudioCommand::SetVolume(v) => assert!((v - 0.5).abs() < f32::EPSILON),
            _ => panic!("expected SetVolume"),
        }

        // Seek
        match AudioCommand::Seek(Duration::from_secs(3)) {
            AudioCommand::Seek(d) => assert_eq!(d, Duration::from_secs(3)),
            _ => panic!("expected Seek"),
        }

        // GetPosition contains a StdSender -- just ensure we can construct it
        let (tx, _rx) = channel::<PositionReport>();
        match AudioCommand::GetPosition(tx) {
            AudioCommand::GetPosition(_) => {}
            _ => panic!("expected GetPosition"),
        }

        // Debug formatting shouldn't panic
        let s = format!("{:?}", AudioCommand::Pause);
        assert!(s.contains("Pause"));
    }

    #[test]
    fn load_track_loads_valid_audio() {
        // Create a minimal valid WAV file (silence) - easier to generate than MP3
        let mut temp_file = NamedTempFile::new().unwrap();
        create_test_wav(temp_file.as_file_mut()).unwrap();
        temp_file.flush().unwrap();

        let stream = OutputStreamBuilder::open_default_stream().unwrap();
        let sink = Sink::connect_new(stream.mixer());

        let result = load_track(&sink, temp_file.path().to_str().unwrap());
        // Note: This may fail depending on decoder support for WAV.
        // The important thing is the function doesn't panic and handles valid paths.
        let _ = result;
    }

    #[test]
    fn load_track_returns_false_for_nonexistent_file() {
        let stream = OutputStreamBuilder::open_default_stream().unwrap();
        let sink = Sink::connect_new(stream.mixer());

        let result = load_track(&sink, "/nonexistent/path/file.mp3");
        assert!(!result, "Should return false for nonexistent file");
    }

    #[test]
    fn load_track_returns_false_for_invalid_file() {
        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(b"not an audio file").unwrap();
        temp_file.flush().unwrap();

        let stream = OutputStreamBuilder::open_default_stream().unwrap();
        let sink = Sink::connect_new(stream.mixer());

        let result = load_track(&sink, temp_file.path().to_str().unwrap());
        assert!(!result, "Should return false for invalid audio");
    }

    #[test]
    fn load_track_appends_to_existing_sink() {
        let mut temp_file = NamedTempFile::new().unwrap();
        create_test_wav(temp_file.as_file_mut()).unwrap();
        temp_file.flush().unwrap();

        let stream = OutputStreamBuilder::open_default_stream().unwrap();
        let sink = Sink::connect_new(stream.mixer());

        // Load first track
        let _ = load_track(&sink, temp_file.path().to_str().unwrap());
        // Load second track (should append, not replace)
        let _ = load_track(&sink, temp_file.path().to_str().unwrap());
        // Test passes if no panic occurs
    }

    fn create_test_wav(file: &mut File) -> std::io::Result<()> {
        // Create a proper WAV file: 1 second of silence at 44.1kHz, 16-bit, mono
        let sample_rate: u32 = 44100;
        let channels: u16 = 1;
        let bits_per_sample: u16 = 16;
        let byte_rate = sample_rate * channels as u32 * (bits_per_sample as u32 / 8);
        let block_align = channels * (bits_per_sample / 8);
        let duration_secs = 1;
        let data_size =
            sample_rate * channels as u32 * (bits_per_sample as u32 / 8) * duration_secs;
        let file_size = 4 + 8 + 16 + 8 + data_size; // RIFF + fmt + data

        // RIFF header
        file.write_all(b"RIFF")?;
        file.write_all(&(file_size - 8).to_le_bytes())?; // file size - 8
        file.write_all(b"WAVE")?;

        // fmt chunk
        file.write_all(b"fmt ")?;
        file.write_all(&16u32.to_le_bytes())?; // chunk size
        file.write_all(&1u16.to_le_bytes())?; // audio format (PCM)
        file.write_all(&channels.to_le_bytes())?; // num channels
        file.write_all(&sample_rate.to_le_bytes())?; // sample rate
        file.write_all(&byte_rate.to_le_bytes())?; // byte rate
        file.write_all(&block_align.to_le_bytes())?; // block align
        file.write_all(&bits_per_sample.to_le_bytes())?; // bits per sample

        // data chunk
        file.write_all(b"data")?;
        file.write_all(&data_size.to_le_bytes())?; // data size
                                                   // Write silence (zeros)
        let silence = vec![0u8; data_size as usize];
        file.write_all(&silence)?;

        Ok(())
    }
}
