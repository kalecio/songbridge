use std::fs::File;
use std::io::BufReader;
use std::sync::mpsc::Sender as StdSender;
use std::time::Duration;
use std::thread;

use crossbeam_channel::Sender;
use rodio::{decoder::DecoderBuilder, OutputStreamBuilder, Sink};

/// Commands that can be sent to the audio backend thread.
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
        let _stream = OutputStreamBuilder::open_default_stream().expect("open default audio stream");
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
