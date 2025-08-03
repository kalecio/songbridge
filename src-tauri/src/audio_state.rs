use std::fs::File;
use std::time::Duration;
use std::io::BufReader;
use rodio::{decoder::DecoderBuilder, OutputStream, OutputStreamBuilder, Sink};
use symphonia::core::io::MediaSource;

use crate::audio_utils::{get_audio_probe, calculate_track_duration};

pub struct AudioState {
    pub file_path: String,
    pub sink: Sink,
    _stream: OutputStream,
    original_volume: f32,
    is_muted: bool,
    pub track_duration: Option<u64>
}


impl AudioState {
    pub fn new() -> Self {
        let _stream = OutputStreamBuilder::open_default_stream().expect("open default audio stream");
        let sink = Sink::connect_new(&_stream.mixer());
        AudioState {
            file_path: String::new(),
            sink,
            _stream,
            original_volume: 1.0,
            is_muted: false,
            track_duration: None
        }
    }

    pub fn load_song(&mut self, file_path: &str) {
        self.sink.stop();
        let file = File::open(file_path).expect("file open failed");
        let byte_len = file.byte_len().expect("file byte length failed");
        let source = DecoderBuilder::new()
            .with_data(BufReader::new(file))
            .with_byte_len(byte_len)
            .with_seekable(true)
            .build()
            .expect("decode failed");
        let probe = get_audio_probe(file_path);
        self.track_duration = calculate_track_duration(&probe);
        self.file_path = file_path.to_string();
        self.sink.append(source);
        self.sink.pause();
    }

    pub fn play(&self) {
        self.sink.play();
    }

    pub fn pause(&self) {
        self.sink.pause();
    }

    pub fn resume(&self) {
        self.sink.play();
    }

    pub fn mute(&mut self) {
        if !self.is_muted {
            self.original_volume = self.sink.volume();
            self.sink.set_volume(0.0);
            self.is_muted = true;
        }
    }

    pub fn unmute(&mut self) {
        if self.is_muted {
            self.sink.set_volume(self.original_volume);
            self.is_muted = false;
        }
    }

    pub fn toggle_mute(&mut self) {
        if self.is_muted {
            self.unmute();
        } else {
            self.mute();
        }
    }

    pub fn set_volume(&mut self, volume: f32) {
        self.sink.set_volume(volume);
        self.original_volume = volume;
    }

    pub fn current_position(&self) -> Duration {
        self.sink.get_pos()
    }

    pub fn seek(&mut self, position: Duration) {
        println!("Seeking to position: {:?}", position);
        if let Err(err) = self.sink.try_seek(position) {
            // Aqui você pode ignorar, ou sinalizar erro para o frontend.
            eprintln!("Erro ao tentar fazer seek: {:?}", err);
        }
    }
}