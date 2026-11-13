use serde::{Deserialize, Serialize};

#[derive(Clone, Default, Serialize, Deserialize)]
pub struct Track {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration: u64,
    pub track_number: Option<u32>,
}
impl Track {
    pub fn reason(&self) -> &'static str {
        if self.title.trim().is_empty() || self.artist.trim().is_empty() {
            "missing_metadata"
        } else if self.duration == 0 {
            "unknown_duration"
        } else if self.duration <= 30 {
            "too_short"
        } else {
            "listening"
        }
    }
    pub fn required(&self) -> f64 {
        (self.duration as f64 / 2.0).min(240.0)
    }
}

pub struct Tracker {
    pub listened: f64,
    previous: Option<(f64, bool, u64)>,
}
impl Tracker {
    pub fn new() -> Self {
        Self {
            listened: 0.0,
            previous: None,
        }
    }
    pub fn reset_baseline(&mut self) {
        self.previous = None;
    }
    // Both audio advancement and elapsed wall time are required. Jumps and
    // suspend gaps never count. Call reset_baseline after every seek.
    pub fn sample(&mut self, position: f64, playing: bool, utc_ms: u64, elapsed: f64) {
        if let Some((previous, was_playing, previous_utc)) = self.previous {
            let delta = position - previous;
            let wall = utc_ms.saturating_sub(previous_utc) as f64 / 1000.0;
            if was_playing && delta > 0.0 && elapsed <= 3.0 && wall <= 3.0 && delta <= elapsed + 0.5
            {
                self.listened += delta.min(elapsed).min(wall);
            }
        }
        self.previous = Some((position, playing, utc_ms));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn eligibility_boundaries() {
        let mut t = Track {
            title: "Song".into(),
            artist: "Artist".into(),
            duration: 30,
            ..Default::default()
        };
        assert_eq!(t.reason(), "too_short");
        t.duration = 31;
        assert_eq!(t.required(), 15.5);
        assert_eq!(t.reason(), "listening");
        t.duration = 1000;
        assert_eq!(t.required(), 240.0);
        t.artist.clear();
        assert_eq!(t.reason(), "missing_metadata");
    }
    #[test]
    fn seeks_pause_and_suspend_do_not_inflate_time() {
        let mut t = Tracker::new();
        t.sample(0.0, true, 1000, 0.0);
        t.sample(1.0, true, 2000, 1.0);
        t.reset_baseline();
        t.sample(150.0, true, 3000, 1.0);
        t.sample(151.0, false, 4000, 1.0);
        t.sample(151.0, false, 64000, 60.0);
        t.sample(151.0, true, 65000, 1.0);
        t.sample(152.0, true, 66000, 1.0);
        assert_eq!(t.listened, 3.0);
        t.sample(900.0, true, 900000, 834.0);
        assert_eq!(t.listened, 3.0);
    }
}
