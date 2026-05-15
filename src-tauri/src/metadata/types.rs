use serde::Serialize;

#[derive(Debug, Default, Serialize, Clone)]
pub struct AudioDuration {
    pub duration_seconds: Option<u64>,
    duration_formatted: Option<String>,
}

impl AudioDuration {
    pub fn new(duration_seconds: Option<u64>, duration_formatted: Option<String>) -> Self {
        AudioDuration {
            duration_seconds,
            duration_formatted,
        }
    }
}

#[derive(Serialize, Clone)]
pub struct AudioMetadata {
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub year: Option<String>,
    pub track: Option<u32>,
    pub duration: AudioDuration,
    pub path: Option<String>,
    pub image: Option<String>,
}

impl AudioMetadata {
    pub fn new(
        title: Option<String>,
        artist: Option<String>,
        album: Option<String>,
        year: Option<String>,
        track: Option<u32>,
        duration: AudioDuration,
        path: Option<String>,
        image: Option<String>,
    ) -> Self {
        AudioMetadata {
            title,
            artist,
            album,
            year,
            track,
            duration,
            path,
            image,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn audio_duration_new_and_default() {
        let ad = AudioDuration::new(Some(120), Some("02:00".to_string()));
        assert_eq!(ad.duration_seconds, Some(120));
        assert_eq!(ad.duration_formatted.as_deref(), Some("02:00"));

        let def = AudioDuration::default();
        assert!(def.duration_seconds.is_none());
        assert!(def.duration_formatted.is_none());
    }

    #[test]
    fn audio_metadata_new_and_serialize() {
        let dur = AudioDuration::new(Some(100), Some("01:40".to_string()));
        let meta = AudioMetadata::new(
            Some("Title".into()),
            Some("Artist".into()),
            Some("Album".into()),
            Some("2020".into()),
            Some(3),
            dur,
            Some("path.mp3".into()),
            Some("imgdata".into()),
        );

        let s = serde_json::to_value(&meta).expect("serialize");
        assert_eq!(s["title"], json!("Title"));
        assert_eq!(s["artist"], json!("Artist"));
        assert_eq!(s["album"], json!("Album"));
        assert_eq!(s["year"], json!("2020"));
        assert_eq!(s["track"], json!(3));
        assert_eq!(s["duration"]["duration_seconds"], json!(100));
        assert_eq!(s["path"], json!("path.mp3"));
        assert_eq!(s["image"], json!("imgdata"));
    }
}
