use std::{time::Duration, sync::mpsc};
use crossbeam_channel::Sender;
use super::utils::{get_audio_probe, calculate_track_duration, format_duration};
use crate::audio::backend::{spawn_audio_thread, AudioCommand};
use crate::metadata::metadata::AudioDuration;

pub struct AudioState {
    pub path: String,
    audio_tx: Sender<AudioCommand>,
    original_volume: f32,
    is_muted: bool,
    pub track_duration: AudioDuration,
}

impl AudioState {
    pub fn new() -> Self {
        let audio_tx = spawn_audio_thread();
        AudioState {
            path: String::new(),
            audio_tx,
            original_volume: 1.0,
            is_muted: false,
            track_duration: AudioDuration::default(),
        }
    }

    pub fn load_song(&mut self, path: &str) {
        // Update metadata on the main thread and instruct the audio thread to load the file.
        let probe = get_audio_probe(path);
        let track_duration = calculate_track_duration(&probe);
        self.track_duration = AudioDuration::new(track_duration, format_duration(track_duration));
        self.path = path.to_string();
        let _ = self.audio_tx.send(AudioCommand::Load(path.to_string()));
    }

    pub fn play(&self) {
        let _ = self.audio_tx.send(AudioCommand::Play);
    }

    pub fn pause(&self) {
        let _ = self.audio_tx.send(AudioCommand::Pause);
    }

    pub fn resume(&self) {
        let _ = self.audio_tx.send(AudioCommand::Resume);
    }

    pub fn mute(&mut self) {
        if !self.is_muted {
            // We keep the last set volume in `original_volume` and instruct the
            // audio thread to set volume to 0.
            self.is_muted = true;
            let _ = self.audio_tx.send(AudioCommand::SetVolume(0.0));
        }
    }

    pub fn unmute(&mut self) {
        if self.is_muted {
            self.is_muted = false;
            let _ = self.audio_tx.send(AudioCommand::SetVolume(self.original_volume));
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
        self.original_volume = volume;
        let _ = self.audio_tx.send(AudioCommand::SetVolume(volume));
    }

    pub fn current_position(&self) -> Duration {
        let (tx, rx) = mpsc::channel();
        let _ = self.audio_tx.send(AudioCommand::GetPosition(tx));
        rx.recv().unwrap_or_else(|_| Duration::from_secs(0))
    }

    pub fn seek(&mut self, position: Duration) {
        let _ = self.audio_tx.send(AudioCommand::Seek(position));
    }
}
