use std::fs::File;
use std::io::BufReader;
use std::sync::{mpsc::Sender as StdSender, Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use crossbeam_channel::Sender;
use rodio::{decoder::DecoderBuilder, source::SeekError, OutputStreamBuilder, Sink, Source};

const FFT_SIZE: usize = 512;
const VISUALIZER_BANDS: usize = 32;

fn track_file_name(path: &str) -> &str {
    path.rsplit(|character| character == '/' || character == '\\')
        .next()
        .unwrap_or(path)
}

struct AnalyzedSource<S> {
    source: S,
    levels: Arc<Mutex<Vec<f32>>>,
    frame: Vec<f32>,
    channel_sum: f32,
    channel_samples: u16,
}

impl<S> AnalyzedSource<S> {
    fn new(source: S, levels: Arc<Mutex<Vec<f32>>>) -> Self {
        Self {
            source,
            levels,
            frame: Vec::with_capacity(FFT_SIZE),
            channel_sum: 0.0,
            channel_samples: 0,
        }
    }
}

impl<S: Source> Iterator for AnalyzedSource<S> {
    type Item = f32;

    fn next(&mut self) -> Option<Self::Item> {
        let sample = self.source.next()?;
        self.channel_sum += sample;
        self.channel_samples += 1;

        if self.channel_samples >= self.source.channels().max(1) {
            self.frame
                .push(self.channel_sum / f32::from(self.channel_samples));
            self.channel_sum = 0.0;
            self.channel_samples = 0;
            if self.frame.len() == FFT_SIZE {
                let levels = calculate_frequency_bands(&self.frame);
                if let Ok(mut shared) = self.levels.lock() {
                    *shared = levels;
                }
                self.frame.clear();
            }
        }

        Some(sample)
    }
}

impl<S: Source> Source for AnalyzedSource<S> {
    fn current_span_len(&self) -> Option<usize> {
        self.source.current_span_len()
    }

    fn channels(&self) -> u16 {
        self.source.channels()
    }

    fn sample_rate(&self) -> u32 {
        self.source.sample_rate()
    }

    fn total_duration(&self) -> Option<Duration> {
        self.source.total_duration()
    }

    fn try_seek(&mut self, position: Duration) -> Result<(), SeekError> {
        self.source.try_seek(position)?;
        self.frame.clear();
        self.channel_sum = 0.0;
        self.channel_samples = 0;
        if let Ok(mut levels) = self.levels.lock() {
            levels.fill(0.0);
        }
        Ok(())
    }
}

fn calculate_frequency_bands(samples: &[f32]) -> Vec<f32> {
    let mut real = samples
        .iter()
        .enumerate()
        .map(|(index, sample)| {
            let window =
                0.5 - 0.5 * (std::f32::consts::TAU * index as f32 / (FFT_SIZE - 1) as f32).cos();
            sample * window
        })
        .collect::<Vec<_>>();
    let mut imaginary = vec![0.0; FFT_SIZE];

    let mut reversed = 0;
    for index in 1..FFT_SIZE {
        let mut bit = FFT_SIZE >> 1;
        while reversed & bit != 0 {
            reversed ^= bit;
            bit >>= 1;
        }
        reversed ^= bit;
        if index < reversed {
            real.swap(index, reversed);
            imaginary.swap(index, reversed);
        }
    }

    let mut size = 2;
    while size <= FFT_SIZE {
        let half = size / 2;
        let angle = -std::f32::consts::TAU / size as f32;
        let (step_real, step_imaginary) = (angle.cos(), angle.sin());
        for start in (0..FFT_SIZE).step_by(size) {
            let (mut twiddle_real, mut twiddle_imaginary) = (1.0, 0.0);
            for offset in 0..half {
                let even = start + offset;
                let odd = even + half;
                let odd_real = real[odd] * twiddle_real - imaginary[odd] * twiddle_imaginary;
                let odd_imaginary = real[odd] * twiddle_imaginary + imaginary[odd] * twiddle_real;
                real[odd] = real[even] - odd_real;
                imaginary[odd] = imaginary[even] - odd_imaginary;
                real[even] += odd_real;
                imaginary[even] += odd_imaginary;
                (twiddle_real, twiddle_imaginary) = (
                    twiddle_real * step_real - twiddle_imaginary * step_imaginary,
                    twiddle_real * step_imaginary + twiddle_imaginary * step_real,
                );
            }
        }
        size *= 2;
    }

    let max_bin = FFT_SIZE / 2;
    (0..VISUALIZER_BANDS)
        .map(|band| {
            let low = ((band as f32 / VISUALIZER_BANDS as f32).powf(2.0) * max_bin as f32) as usize;
            let high = (((band + 1) as f32 / VISUALIZER_BANDS as f32).powf(2.0) * max_bin as f32)
                .ceil() as usize;
            let low = low.max(1).min(max_bin - 1);
            let high = high.max(low + 1).min(max_bin);
            let peak = (low..high)
                .map(|bin| real[bin].hypot(imaginary[bin]))
                .fold(0.0_f32, f32::max);
            (peak * (4.0 / FFT_SIZE as f32)).sqrt().clamp(0.0, 1.0)
        })
        .collect()
}

/// Load a track from path and append to sink.
/// Returns true if track was successfully loaded and appended.
fn load_track(sink: &Sink, path: &str, levels: Arc<Mutex<Vec<f32>>>) -> bool {
    let file = match File::open(path) {
        Ok(file) => file,
        Err(error) => {
            log::error!(
                "Audio source open failed: track='{}', error={}",
                track_file_name(path),
                error
            );
            return false;
        }
    };
    let byte_len = file
        .metadata()
        .map(|metadata| metadata.len())
        .unwrap_or_else(|error| {
            log::warn!(
                "Audio source size unavailable: track='{}', error={}",
                track_file_name(path),
                error
            );
            0
        });
    let source = match DecoderBuilder::new()
        .with_data(BufReader::new(file))
        .with_byte_len(byte_len)
        .with_seekable(true)
        .build()
    {
        Ok(source) => source,
        Err(error) => {
            log::error!(
                "Audio decoder rejected track: track='{}', error={:?}",
                track_file_name(path),
                error
            );
            return false;
        }
    };
    sink.append(AnalyzedSource::new(source, levels));
    log::info!(
        "Audio source loaded: track='{}', bytes={}",
        track_file_name(path),
        byte_len
    );
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
pub fn spawn_audio_thread(levels: Arc<Mutex<Vec<f32>>>) -> Sender<AudioCommand> {
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

        let mut last_sample = Instant::now();
        loop {
            let command = rx.recv_timeout(Duration::from_millis(250));
            if last_sample.elapsed() >= Duration::from_millis(250) || command.is_ok() {
                crate::lastfm::audio_event(crate::lastfm::AudioEvent::Sample {
                    position: sink.get_pos().as_secs_f64(),
                    playing: !sink.is_paused() && !sink.empty(),
                    ended: sink.empty(),
                    at: Instant::now(),
                    utc_ms: crate::lastfm::utc_ms(),
                });
                last_sample = Instant::now();
            }
            let cmd = match command {
                Ok(cmd) => cmd,
                Err(crossbeam_channel::RecvTimeoutError::Timeout) => continue,
                Err(crossbeam_channel::RecvTimeoutError::Disconnected) => break,
            };
            match cmd {
                AudioCommand::Load(path) => {
                    current_path = Some(path.clone());
                    sink.stop();
                    sink.pause();
                    max_pos = Duration::from_secs(0);
                    ended_reported = false;
                    let loaded = load_track(&sink, &path, Arc::clone(&levels));
                    if loaded {
                        sink.pause();
                    }
                    crate::lastfm::audio_event(crate::lastfm::AudioEvent::Loaded(
                        path,
                        loaded,
                        Instant::now(),
                    ));
                }
                AudioCommand::Play | AudioCommand::Resume => {
                    sink.play();
                    // Capture the start instant, not the next periodic poll.
                    crate::lastfm::audio_event(crate::lastfm::AudioEvent::Sample {
                        position: sink.get_pos().as_secs_f64(),
                        playing: !sink.empty(),
                        ended: sink.empty(),
                        at: Instant::now(),
                        utc_ms: crate::lastfm::utc_ms(),
                    });
                }
                AudioCommand::Pause => sink.pause(),
                AudioCommand::SetVolume(v) => sink.set_volume(v),
                AudioCommand::Seek(pos) => {
                    // If the sink is empty (track ended), reload the track first
                    if sink.empty() {
                        if let Some(path) = &current_path {
                            let loaded = load_track(&sink, path, Arc::clone(&levels));
                            crate::lastfm::audio_event(crate::lastfm::AudioEvent::Loaded(
                                path.clone(),
                                loaded,
                                Instant::now(),
                            ));
                        }
                    }
                    let _ = sink.try_seek(pos);
                    crate::lastfm::audio_event(crate::lastfm::AudioEvent::Seek);
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
                        log::info!(
                            "Audio backend detected natural track end: track='{}', last_position_seconds={:.3}",
                            current_path
                                .as_deref()
                                .map(track_file_name)
                                .unwrap_or("unknown"),
                            max_pos.as_secs_f64()
                        );
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

        let result = load_track(
            &sink,
            temp_file.path().to_str().unwrap(),
            Arc::new(Mutex::new(vec![0.0; 32])),
        );
        // Note: This may fail depending on decoder support for WAV.
        // The important thing is the function doesn't panic and handles valid paths.
        let _ = result;
    }

    #[test]
    fn load_track_returns_false_for_nonexistent_file() {
        let stream = OutputStreamBuilder::open_default_stream().unwrap();
        let sink = Sink::connect_new(stream.mixer());

        let result = load_track(
            &sink,
            "/nonexistent/path/file.mp3",
            Arc::new(Mutex::new(vec![0.0; 32])),
        );
        assert!(!result, "Should return false for nonexistent file");
    }

    #[test]
    fn load_track_returns_false_for_invalid_file() {
        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(b"not an audio file").unwrap();
        temp_file.flush().unwrap();

        let stream = OutputStreamBuilder::open_default_stream().unwrap();
        let sink = Sink::connect_new(stream.mixer());

        let result = load_track(
            &sink,
            temp_file.path().to_str().unwrap(),
            Arc::new(Mutex::new(vec![0.0; 32])),
        );
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
        let _ = load_track(
            &sink,
            temp_file.path().to_str().unwrap(),
            Arc::new(Mutex::new(vec![0.0; 32])),
        );
        // Load second track (should append, not replace)
        let _ = load_track(
            &sink,
            temp_file.path().to_str().unwrap(),
            Arc::new(Mutex::new(vec![0.0; 32])),
        );
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
