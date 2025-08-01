use std::fs::File;
use std::io::BufReader;
use rodio::{Decoder, OutputStream, OutputStreamBuilder, Sink};

pub struct AudioState {
    pub sink: Sink,
    _stream: OutputStream,
    original_volume: f32,
    is_muted: bool
}


impl AudioState {
    pub fn new() -> Self {
        let _stream = OutputStreamBuilder::open_default_stream().expect("open default audio stream");
        let sink = Sink::connect_new(&_stream.mixer());
        AudioState {
            sink,
            _stream,
            original_volume: 1.0,
            is_muted: false,
        }
    }

    pub fn play_new_song(&self, file_path: &str) {
        self.sink.stop();
        let file = File::open(file_path).expect("file open failed");
        let source = Decoder::new(BufReader::new(file)).expect("decode failed");

        self.sink.append(source);
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
    }
}