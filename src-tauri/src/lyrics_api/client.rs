use once_cell::sync::Lazy;
use reqwest::{Client, ClientBuilder};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tokio::sync::{Mutex, RwLock};
use tokio::time::sleep;

const LRCLIB_BASE_URL: &str = "https://lrclib.net/api";

static HTTP_CLIENT: Lazy<Client> = Lazy::new(|| {
    ClientBuilder::new()
        .user_agent("SongBridge/0.5.0 (https://github.com/kalecio/songbridge)")
        .timeout(Duration::from_secs(10))
        .build()
        .expect("Failed to create HTTP client")
});

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LyricsTrackResponse {
    pub id: i64,
    #[serde(rename = "trackName")]
    pub track_name: Option<String>,
    #[serde(rename = "artistName")]
    pub artist_name: Option<String>,
    #[serde(rename = "albumName")]
    pub album_name: Option<String>,
    pub duration: Option<f64>,
    pub instrumental: bool,
    #[serde(rename = "plainLyrics")]
    pub plain_lyrics: Option<String>,
    #[serde(rename = "syncedLyrics")]
    pub synced_lyrics: Option<String>,
    #[serde(rename = "lyricsFile")]
    pub lyrics_file: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchQuery {
    pub q: Option<String>,
    #[serde(rename = "trackName")]
    pub track_name: Option<String>,
    #[serde(rename = "artistName")]
    pub artist_name: Option<String>,
    #[serde(rename = "albumName")]
    pub album_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedEntry {
    pub data: Vec<LyricsTrackResponse>,
    pub cached_at_secs: u64,
}

pub struct RateLimiter {
    requests: Arc<Mutex<Vec<Instant>>>,
    max_per_second: usize,
    max_per_minute: usize,
}

impl RateLimiter {
    pub fn new(max_per_second: usize, max_per_minute: usize) -> Self {
        Self {
            requests: Arc::new(Mutex::new(Vec::new())),
            max_per_second,
            max_per_minute,
        }
    }

    pub async fn wait_if_needed(&self) {
        loop {
            let now = Instant::now();
            let mut requests = self.requests.lock().await;

            requests.retain(|&t| now.duration_since(t) < Duration::from_secs(60));

            let recent_second = requests
                .iter()
                .filter(|&&t| now.duration_since(t) < Duration::from_secs(1))
                .count();
            let recent_minute = requests.len();

            if recent_second < self.max_per_second && recent_minute < self.max_per_minute {
                requests.push(now);
                return;
            }

            drop(requests);
            sleep(Duration::from_millis(100)).await;
        }
    }
}

pub struct LyricsCache {
    cache: Arc<RwLock<HashMap<String, CachedEntry>>>,
    ttl: Duration,
}

impl LyricsCache {
    pub fn new(ttl_hours: u64) -> Self {
        Self {
            cache: Arc::new(RwLock::new(HashMap::new())),
            ttl: Duration::from_secs(ttl_hours * 3600),
        }
    }

    pub async fn get(&self, key: &str) -> Option<Vec<LyricsTrackResponse>> {
        let cache = self.cache.read().await;
        if let Some(entry) = cache.get(key) {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();
            if now.saturating_sub(entry.cached_at_secs) < self.ttl.as_secs() {
                return Some(entry.data.clone());
            }
        }
        None
    }

    pub async fn set(&self, key: String, data: Vec<LyricsTrackResponse>) {
        let mut cache = self.cache.write().await;
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        cache.insert(
            key,
            CachedEntry {
                data,
                cached_at_secs: now,
            },
        );
    }

    #[allow(dead_code)]
    pub async fn clear_expired(&self) {
        let mut cache = self.cache.write().await;
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        cache.retain(|_, entry| now.saturating_sub(entry.cached_at_secs) < self.ttl.as_secs());
    }
}

pub struct LyricsApiClient {
    rate_limiter: Arc<RateLimiter>,
    cache: Arc<LyricsCache>,
    max_retries: u32,
}

impl LyricsApiClient {
    pub fn new() -> Self {
        Self {
            rate_limiter: Arc::new(RateLimiter::new(5, 50)),
            cache: Arc::new(LyricsCache::new(20)),
            max_retries: 3,
        }
    }

    async fn make_request_with_retry(&self, url: &str) -> Result<reqwest::Response, String> {
        let mut attempt = 0;
        let mut last_error = String::new();

        while attempt <= self.max_retries {
            self.rate_limiter.wait_if_needed().await;

            let response = match HTTP_CLIENT.get(url).send().await {
                Ok(resp) => resp,
                Err(e) => {
                    last_error = format!("Request failed: {}", e);
                    attempt += 1;
                    if attempt <= self.max_retries {
                        let backoff = Duration::from_millis(200 * (2_u64.pow(attempt - 1)));
                        sleep(backoff).await;
                        continue;
                    }
                    return Err(last_error);
                }
            };

            let status = response.status();

            if status == 429 {
                // Rate limited - check Retry-After header
                let retry_after = response
                    .headers()
                    .get("Retry-After")
                    .and_then(|h| h.to_str().ok())
                    .and_then(|s| s.parse::<u64>().ok())
                    .unwrap_or(1);

                let wait_time = Duration::from_secs(retry_after.min(60));
                sleep(wait_time).await;
                attempt += 1;
                continue;
            }

            if !status.is_success() {
                return Err(format!("API error: {}", status));
            }

            return Ok(response);
        }

        Err(last_error)
    }

    pub async fn search(&self, query: SearchQuery) -> Result<Vec<LyricsTrackResponse>, String> {
        let cache_key = format!(
            "search:{}:{}:{}:{}",
            query.q.as_deref().unwrap_or(""),
            query.track_name.as_deref().unwrap_or(""),
            query.artist_name.as_deref().unwrap_or(""),
            query.album_name.as_deref().unwrap_or("")
        );

        if let Some(cached) = self.cache.get(&cache_key).await {
            return Ok(cached);
        }

        let mut url = format!("{}/search", LRCLIB_BASE_URL);
        let mut params = Vec::new();
        if let Some(q) = &query.q {
            params.push(format!("q={}", urlencoding::encode(q)));
        }
        if let Some(track_name) = &query.track_name {
            params.push(format!("track_name={}", urlencoding::encode(track_name)));
        }
        if let Some(artist_name) = &query.artist_name {
            params.push(format!("artist_name={}", urlencoding::encode(artist_name)));
        }
        if let Some(album_name) = &query.album_name {
            params.push(format!("album_name={}", urlencoding::encode(album_name)));
        }
        if !params.is_empty() {
            url.push('?');
            url.push_str(&params.join("&"));
        }

        let response = self.make_request_with_retry(&url).await?;

        let tracks: Vec<LyricsTrackResponse> = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        self.cache.set(cache_key, tracks.clone()).await;

        Ok(tracks)
    }

    pub async fn get_by_id(&self, track_id: i64) -> Result<LyricsTrackResponse, String> {
        let cache_key = format!("get:{}", track_id);

        if let Some(cached) = self.cache.get(&cache_key).await {
            if let Some(track) = cached.first().cloned() {
                return Ok(track);
            }
        }

        let url = format!("{}/get/{}", LRCLIB_BASE_URL, track_id);

        let response = self.make_request_with_retry(&url).await?;

        let status = response.status();
        if status == 404 {
            return Err("Track not found".to_string());
        }

        let track: LyricsTrackResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        self.cache.set(cache_key, vec![track.clone()]).await;

        Ok(track)
    }
}

impl Default for LyricsApiClient {
    fn default() -> Self {
        Self::new()
    }
}

mod urlencoding {
    pub fn encode(s: &str) -> String {
        let mut result = String::with_capacity(s.len() * 3);
        for byte in s.bytes() {
            match byte {
                b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                    result.push(byte as char);
                }
                b' ' => result.push('+'),
                _ => {
                    result.push('%');
                    result.push_str(&format!("{:02X}", byte));
                }
            }
        }
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_url_encoding() {
        assert_eq!(urlencoding::encode("hello world"), "hello+world");
        assert_eq!(urlencoding::encode("hello%world"), "hello%25world");
        assert_eq!(urlencoding::encode("hello/world"), "hello%2Fworld");
    }

    #[tokio::test]
    async fn test_rate_limiter() {
        let limiter = RateLimiter::new(5, 50);
        for _ in 0..5 {
            limiter.wait_if_needed().await;
        }
        let start = Instant::now();
        limiter.wait_if_needed().await;
        assert!(start.elapsed() >= Duration::from_millis(900));
    }

    #[test]
    fn test_cache_key_generation() {
        let query = SearchQuery {
            q: Some("test query".to_string()),
            track_name: Some("Test Track".to_string()),
            artist_name: Some("Test Artist".to_string()),
            album_name: Some("Test Album".to_string()),
        };
        let cache_key = format!(
            "search:{}:{}:{}:{}",
            query.q.as_deref().unwrap_or(""),
            query.track_name.as_deref().unwrap_or(""),
            query.artist_name.as_deref().unwrap_or(""),
            query.album_name.as_deref().unwrap_or("")
        );
        assert_eq!(
            cache_key,
            "search:test query:Test Track:Test Artist:Test Album"
        );
    }
}
