use std::fs::File;
use std::io::BufReader;
use std::time::{Duration, Instant};
use rodio::{Decoder, Sink, OutputStreamBuilder};

pub struct AudioState {
    pub sink: Sink,
    original_volume: f32,
    is_muted: bool,
    start_time: Option<Instant>,
    total_pause_duration: Duration,
    pause_start_time: Option<Instant>,
    total_duration: Option<Duration>,
    is_paused: bool,
}


impl AudioState {
    pub fn new() -> Self {
        let stream = OutputStreamBuilder::open_default_stream().expect("open default audio stream");
        let sink = Sink::connect_new(&stream.mixer());
        // Leak the stream to keep it alive for the lifetime of the app
        // The stream is not Send/Sync, so we can't store it in AudioState
        // This is acceptable for a long-lived resource that lives for the entire app lifetime
        Box::leak(Box::new(stream));
        AudioState {
            sink,
            original_volume: 1.0,
            is_muted: false,
            start_time: None,
            total_pause_duration: Duration::ZERO,
            pause_start_time: None,
            total_duration: None,
            is_paused: false,
        }
    }

    pub fn play_new_song(&mut self, file_path: &str, duration_seconds: Option<u64>) {
        self.sink.stop();
        let file = File::open(file_path).expect("file open failed");
        let source = Decoder::new(BufReader::new(file)).expect("decode failed");

        self.sink.append(source);
        self.sink.play();
        
        // Reset tracking
        self.start_time = Some(Instant::now());
        self.total_pause_duration = Duration::ZERO;
        self.pause_start_time = None;
        self.is_paused = false;
        self.total_duration = duration_seconds.map(|s| Duration::from_secs(s));
    }

    pub fn pause(&mut self) {
        self.sink.pause();
        if !self.is_paused {
            self.pause_start_time = Some(Instant::now());
            self.is_paused = true;
        }
    }

    pub fn resume(&mut self) {
        self.sink.play();
        if self.is_paused {
            if let Some(pause_start) = self.pause_start_time {
                self.total_pause_duration += pause_start.elapsed();
                self.pause_start_time = None;
            }
            self.is_paused = false;
        }
    }

    pub fn get_progress(&self) -> f64 {
        if let Some(start) = self.start_time {
            let elapsed = if self.is_paused {
                // If paused, use the time when pause started
                if let Some(pause_start) = self.pause_start_time {
                    pause_start.duration_since(start) - self.total_pause_duration
                } else {
                    start.elapsed() - self.total_pause_duration
                }
            } else {
                start.elapsed() - self.total_pause_duration
            };
            
            if let Some(total) = self.total_duration {
                if total.as_secs_f64() > 0.0 {
                    let progress = elapsed.as_secs_f64() / total.as_secs_f64();
                    return progress.min(1.0).max(0.0);
                }
            }
        }
        0.0
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
}