use std::fs::File;
use std::io::BufReader;
use std::sync::mpsc::Sender as StdSender;
<<<<<<< HEAD
use std::thread;
use std::time::Duration;
=======
use std::time::Duration;
use std::thread;
>>>>>>> fcb0617 (refactor: separated metadata concerns from audio)

use crossbeam_channel::Sender;
use rodio::{decoder::DecoderBuilder, OutputStreamBuilder, Sink};

/// Commands that can be sent to the audio backend thread.
<<<<<<< HEAD
#[derive(Debug)]
=======
>>>>>>> fcb0617 (refactor: separated metadata concerns from audio)
pub enum AudioCommand {
    Load(String),
    Play,
    Pause,
    Resume,
    SetVolume(f32),
    Seek(Duration),
    GetPosition(StdSender<Duration>),
}

/// Spawn the audio thread and return a `Sender` to send `AudioCommand`s to it.
pub fn spawn_audio_thread() -> Sender<AudioCommand> {
    let (tx, rx) = crossbeam_channel::unbounded::<AudioCommand>();

    thread::spawn(move || {
        // Keep the stream alive on this thread so any non-`Send` platform
        // resources remain local to the audio thread.
<<<<<<< HEAD
        let _stream =
            OutputStreamBuilder::open_default_stream().expect("open default audio stream");
=======
        let _stream = OutputStreamBuilder::open_default_stream().expect("open default audio stream");
>>>>>>> fcb0617 (refactor: separated metadata concerns from audio)
        let sink = Sink::connect_new(&_stream.mixer());

        while let Ok(cmd) = rx.recv() {
            match cmd {
                AudioCommand::Load(path) => {
                    sink.stop();
                    if let Ok(file) = File::open(&path) {
                        let byte_len = file.metadata().map(|m| m.len()).unwrap_or(0);
                        let source = DecoderBuilder::new()
                            .with_data(BufReader::new(file))
                            .with_byte_len(byte_len)
                            .with_seekable(true)
                            .build();
                        if let Ok(src) = source {
                            sink.append(src);
                            sink.pause();
                        }
                    }
                }
                AudioCommand::Play => sink.play(),
                AudioCommand::Pause => sink.pause(),
                AudioCommand::Resume => sink.play(),
                AudioCommand::SetVolume(v) => sink.set_volume(v),
                AudioCommand::Seek(pos) => {
                    let _ = sink.try_seek(pos);
                }
                AudioCommand::GetPosition(resp) => {
                    let _ = resp.send(sink.get_pos());
                }
            }
        }

        // Channel closed, thread exits and `_stream` drops here.
    });

    tx
}
<<<<<<< HEAD

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc::channel;
    use std::time::Duration;

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
        let (tx, _rx) = channel::<Duration>();
        match AudioCommand::GetPosition(tx) {
            AudioCommand::GetPosition(_) => {}
            _ => panic!("expected GetPosition"),
        }

        // Debug formatting shouldn't panic
        let s = format!("{:?}", AudioCommand::Pause);
        assert!(s.contains("Pause"));
    }
}
=======
>>>>>>> fcb0617 (refactor: separated metadata concerns from audio)
