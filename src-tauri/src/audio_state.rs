use std::fs::File;
use std::io::BufReader;
use rodio::{Decoder, OutputStream, OutputStreamBuilder, Sink};

pub struct AudioState {
    pub sink: Sink,
    _stream: OutputStream
}


impl AudioState {
    pub fn new() -> Self {
        let _stream = OutputStreamBuilder::open_default_stream().expect("open default audio stream");
        let sink = Sink::connect_new(&_stream.mixer());
        AudioState {
            sink,
            _stream,
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
}