use super::utils::{calculate_track_duration, format_duration, get_audio_probe};
use crate::audio::backend::{spawn_audio_thread, AudioCommand, PositionReport};
use crate::metadata::types::AudioDuration;
use crossbeam_channel::Sender;
use std::{sync::mpsc, time::Duration};

pub struct AudioState {
    pub path: String,
    audio_tx: Sender<AudioCommand>,
    original_volume: f32,
    is_muted: bool,
    pub track_duration: AudioDuration,
}

impl Default for AudioState {
    fn default() -> Self {
        Self::new()
    }
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

    pub fn load_song(&mut self, path: &str) -> Result<(), String> {
        let probe = get_audio_probe(path)?;
        let track_duration = calculate_track_duration(&probe);
        self.track_duration = AudioDuration::new(track_duration, format_duration(track_duration));
        self.path = path.to_string();
        let _ = self.audio_tx.send(AudioCommand::Load(path.to_string()));
        Ok(())
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
            let _ = self
                .audio_tx
                .send(AudioCommand::SetVolume(self.original_volume));
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
        let PositionReport { position, ended } = rx.recv().unwrap_or(PositionReport {
            position: Duration::from_secs(0),
            ended: false,
        });
        // When the rodio sink reports the source has finished, surface the
        // track's known duration instead of the (often-zero) position. This
        // is what makes the frontend's `progress >= duration` auto-advance
        // check fire even though rodio's `get_pos()` resets when the queue
        // empties.
        if ended {
            if let Some(d) = self.track_duration.duration_seconds {
                return Duration::from_secs(d);
            }
        }
        position
    }

    pub fn seek(&mut self, position: Duration) {
        let _ = self.audio_tx.send(AudioCommand::Seek(position));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crossbeam_channel::unbounded;
    use std::thread;
    use std::time::Duration as StdDuration;

    #[test]
    fn sends_play_pause_resume_commands() {
        let (tx, rx) = unbounded::<AudioCommand>();
        let state = AudioState {
            path: String::new(),
            audio_tx: tx,
            original_volume: 1.0,
            is_muted: false,
            track_duration: crate::metadata::types::AudioDuration::default(),
        };

        state.play();
        match rx.recv_timeout(StdDuration::from_millis(100)).unwrap() {
            AudioCommand::Play => {}
            other => panic!("expected Play, got {:?}", other),
        }

        state.pause();
        match rx.recv_timeout(StdDuration::from_millis(100)).unwrap() {
            AudioCommand::Pause => {}
            other => panic!("expected Pause, got {:?}", other),
        }

        state.resume();
        match rx.recv_timeout(StdDuration::from_millis(100)).unwrap() {
            AudioCommand::Resume => {}
            other => panic!("expected Resume, got {:?}", other),
        }
    }

    #[test]
    fn volume_and_mute_behaviour() {
        let (tx, rx) = unbounded::<AudioCommand>();
        let mut state = AudioState {
            path: String::new(),
            audio_tx: tx,
            original_volume: 1.0,
            is_muted: false,
            track_duration: crate::metadata::types::AudioDuration::default(),
        };

        state.set_volume(0.6);
        assert!((state.original_volume - 0.6).abs() < 1e-6);
        match rx.recv_timeout(StdDuration::from_millis(100)).unwrap() {
            AudioCommand::SetVolume(v) => assert!((v - 0.6).abs() < 1e-6),
            other => panic!("expected SetVolume, got {:?}", other),
        }

        state.mute();
        assert!(state.is_muted);
        match rx.recv_timeout(StdDuration::from_millis(100)).unwrap() {
            AudioCommand::SetVolume(v) => assert!((v - 0.0).abs() < 1e-6),
            other => panic!("expected SetVolume(0.0), got {:?}", other),
        }

        state.unmute();
        assert!(!state.is_muted);
        match rx.recv_timeout(StdDuration::from_millis(100)).unwrap() {
            AudioCommand::SetVolume(v) => assert!((v - 0.6).abs() < 1e-6),
            other => panic!("expected SetVolume(original), got {:?}", other),
        }
    }

    #[test]
    fn toggle_mute_toggles_state_and_sends_commands() {
        let (tx, rx) = unbounded::<AudioCommand>();
        let mut state = AudioState {
            path: String::new(),
            audio_tx: tx,
            original_volume: 0.8,
            is_muted: false,
            track_duration: crate::metadata::types::AudioDuration::default(),
        };

        state.toggle_mute();
        assert!(state.is_muted);
        match rx.recv_timeout(StdDuration::from_millis(100)).unwrap() {
            AudioCommand::SetVolume(v) => assert!((v - 0.0).abs() < 1e-6),
            other => panic!("expected SetVolume(0.0), got {:?}", other),
        }

        state.toggle_mute();
        assert!(!state.is_muted);
        match rx.recv_timeout(StdDuration::from_millis(100)).unwrap() {
            AudioCommand::SetVolume(v) => assert!((v - 0.8).abs() < 1e-6),
            other => panic!("expected SetVolume(original), got {:?}", other),
        }
    }

    #[test]
    fn current_position_requests_and_receives_position() {
        let (tx, rx) = unbounded::<AudioCommand>();
        let state = AudioState {
            path: String::new(),
            audio_tx: tx.clone(),
            original_volume: 1.0,
            is_muted: false,
            track_duration: crate::metadata::types::AudioDuration::default(),
        };

        // Spawn a small helper thread that will respond to GetPosition requests
        let responder = thread::spawn(move || {
            if let Ok(cmd) = rx.recv() {
                match cmd {
                    AudioCommand::GetPosition(resp) => {
                        let _ = resp.send(PositionReport {
                            position: StdDuration::from_secs(7),
                            ended: false,
                        });
                    }
                    other => panic!("expected GetPosition, got {:?}", other),
                }
            } else {
                panic!("did not receive audio command");
            }
        });

        let pos = state.current_position();
        assert_eq!(pos, StdDuration::from_secs(7));
        responder.join().unwrap();
    }

    #[test]
    fn current_position_returns_duration_when_track_has_ended() {
        let (tx, rx) = unbounded::<AudioCommand>();
        let state = AudioState {
            path: String::new(),
            audio_tx: tx.clone(),
            original_volume: 1.0,
            is_muted: false,
            track_duration: crate::metadata::types::AudioDuration::new(Some(82), None),
        };

        let responder = thread::spawn(move || {
            if let Ok(AudioCommand::GetPosition(resp)) = rx.recv() {
                // Simulates rodio's behaviour when the source has finished:
                // `get_pos()` returns 0 but the sink is empty. The backend
                // then sets `ended: true`, and `current_position` must
                // surface the track's duration so the frontend's
                // `progress >= duration` auto-advance check fires.
                let _ = resp.send(PositionReport {
                    position: StdDuration::from_secs(0),
                    ended: true,
                });
            } else {
                panic!("did not receive GetPosition command");
            }
        });

        let pos = state.current_position();
        assert_eq!(pos, StdDuration::from_secs(82));
        responder.join().unwrap();
    }

    #[test]
    fn current_position_returns_zero_when_ended_but_duration_unknown() {
        let (tx, rx) = unbounded::<AudioCommand>();
        let state = AudioState {
            path: String::new(),
            audio_tx: tx.clone(),
            original_volume: 1.0,
            is_muted: false,
            track_duration: crate::metadata::types::AudioDuration::default(),
        };

        let responder = thread::spawn(move || {
            if let Ok(AudioCommand::GetPosition(resp)) = rx.recv() {
                let _ = resp.send(PositionReport {
                    position: StdDuration::from_secs(0),
                    ended: true,
                });
            }
        });

        // Without a known duration we just return the position; the frontend
        // will not auto-advance, which is the safe fallback.
        let pos = state.current_position();
        assert_eq!(pos, StdDuration::from_secs(0));
        responder.join().unwrap();
    }
}
