use serde_json::Value;
use std::{collections::BTreeMap, time::Duration};
use tokio::sync::Mutex;
use tokio::time::Instant;

#[derive(Debug)]
pub struct ApiError {
    pub code: String,
    pub retry_after: Option<u64>,
}
impl ApiError {
    pub fn new(code: &str) -> Self {
        Self {
            code: code.into(),
            retry_after: None,
        }
    }
}

pub struct Client {
    http: reqwest::Client,
    key: String,
    worker_url: String,
    next_request: Mutex<Instant>,
}

impl Client {
    pub fn new() -> Result<Self, reqwest::Error> {
        let key = option_env!("LASTFM_API_KEY").unwrap_or("").trim();
        let worker_url = option_env!("LASTFM_WORKER_URL").unwrap_or("").trim();
        log::info!(
            "Last.fm configuration at build time: api_key_present={}, worker_url_present={}",
            !key.is_empty(),
            !worker_url.is_empty()
        );
        Ok(Self {
            http: reqwest::Client::builder()
                .timeout(Duration::from_secs(20))
                .redirect(reqwest::redirect::Policy::none())
                .user_agent(concat!("Songbridge/", env!("CARGO_PKG_VERSION")))
                .build()?,
            key: key.into(),
            worker_url: worker_url.trim_end_matches('/').into(),
            next_request: Mutex::new(Instant::now()),
        })
    }
    pub fn configured(&self) -> bool {
        !self.key.is_empty()
            && url::Url::parse(&self.worker_url).is_ok_and(|url| {
                (url.scheme() == "https" && url.host_str().is_some())
                    || (url.scheme() == "http"
                        && matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "::1")))
            })
    }
    pub fn auth_url(&self, token: &str) -> String {
        let mut url = url::Url::parse("https://www.last.fm/api/auth/").expect("static URL");
        url.query_pairs_mut()
            .append_pair("api_key", &self.key)
            .append_pair("token", token);
        url.into()
    }
    pub async fn request(
        &self,
        method: &str,
        mut params: BTreeMap<String, String>,
        session: Option<&str>,
    ) -> Result<Value, ApiError> {
        if !self.configured() {
            return Err(ApiError::new("not_configured"));
        }
        if !allowed_method(method) {
            return Err(ApiError::new("invalid_request"));
        }
        // Local pacing policy, not a claimed Last.fm quota. All API calls share it.
        let mut next = self.next_request.lock().await;
        if *next > Instant::now() {
            let delay = next.saturating_duration_since(Instant::now());
            // Fail fast during server cooldowns so disconnect/settings do not
            // sit behind a sleeping API request. Normal one-second pacing waits.
            if delay > Duration::from_secs(1) {
                return Err(ApiError {
                    code: "rate_limited".into(),
                    retry_after: Some(delay.as_secs() + 1),
                });
            }
            tokio::time::sleep_until(*next).await;
        }
        *next = Instant::now() + Duration::from_secs(1);
        params.insert("method".into(), method.into());
        params.insert("api_key".into(), self.key.clone());
        if let Some(key) = session {
            params.insert("sk".into(), key.into());
        }
        params.insert("format".into(), "json".into());
        let response = self
            .http
            .post(&self.worker_url)
            .json(&serde_json::json!({ "params": params }))
            .send()
            .await
            .map_err(|error| {
                log::warn!(
                    "Last.fm request transport failure: method={}, timeout={}, connect={}",
                    method,
                    error.is_timeout(),
                    error.is_connect()
                );
                ApiError::new("offline")
            })?;
        let http_status = response.status();
        let retry_after = response
            .headers()
            .get("retry-after")
            .and_then(|s| s.to_str().ok())
            .and_then(|s| s.parse().ok());
        let body = response.json::<Value>().await.ok();
        let lastfm_body = body
            .as_ref()
            .and_then(|value| value.get("lastfm"))
            .or(body.as_ref());
        let api_error_code = lastfm_body.and_then(|value| {
            value.get("error").and_then(|error| {
                error
                    .as_u64()
                    .or_else(|| error.as_str()?.parse::<u64>().ok())
            })
        });
        let code = response_error(method, http_status.as_u16(), lastfm_body);
        log::info!(
            "Last.fm response: method={}, http_status={}, api_error_code={}, classification={}",
            method,
            http_status.as_u16(),
            api_error_code.map_or_else(|| "none".to_string(), |code| code.to_string()),
            code.unwrap_or("ok")
        );
        if let Some(code) = code {
            let retry_after = if code == "rate_limited" {
                let delay = retry_after.unwrap_or(60).clamp(60, u32::MAX as u64);
                *next = Instant::now() + Duration::from_secs(delay);
                Some(delay)
            } else {
                retry_after
            };
            return Err(ApiError {
                code: code.into(),
                retry_after,
            });
        }
        body.ok_or_else(|| ApiError::new("invalid_response"))
            .and_then(|response| {
                response
                    .get("lastfm")
                    .cloned()
                    .ok_or_else(|| ApiError::new("invalid_response"))
            })
    }
}

fn allowed_method(method: &str) -> bool {
    matches!(
        method,
        "auth.getToken"
            | "auth.getSession"
            | "track.updateNowPlaying"
            | "track.scrobble"
            | "track.search"
            | "album.search"
            | "track.getInfo"
            | "album.getInfo"
    )
}

fn response_error(method: &str, http_status: u16, body: Option<&Value>) -> Option<&'static str> {
    // Status still matters when the response is HTML or empty.
    if http_status == 429 {
        return Some("rate_limited");
    }
    let error = body
        .and_then(|b| b.get("error"))
        .and_then(|v| v.as_u64().or_else(|| v.as_str()?.parse().ok()));
    match error {
        Some(4 | 14) if method.starts_with("auth.") => Some("not_authorized"),
        Some(4 | 9 | 14) => Some("reauthenticate"),
        Some(15) => Some("token_expired"),
        Some(2 | 3 | 5 | 10 | 13 | 26 | 27) => Some("application_error"),
        Some(8 | 11 | 16) => Some("temporary"),
        Some(29) => Some("rate_limited"),
        Some(_) => Some("invalid_request"),
        None if http_status >= 500 => Some("temporary"),
        None if !(200..300).contains(&http_status) => Some("invalid_request"),
        None if !body.is_some_and(Value::is_object) => Some("invalid_response"),
        None => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn respects_errors_even_with_http_success_or_non_json_responses() {
        assert_eq!(
            response_error("track.scrobble", 429, None),
            Some("rate_limited")
        );
        assert_eq!(
            response_error("track.scrobble", 503, None),
            Some("temporary")
        );
        assert_eq!(
            response_error("track.scrobble", 200, None),
            Some("invalid_response")
        );
        for (code, reason) in [
            (4, "reauthenticate"),
            (9, "reauthenticate"),
            (26, "application_error"),
            (29, "rate_limited"),
            (16, "temporary"),
            (6, "invalid_request"),
        ] {
            assert_eq!(
                response_error(
                    "track.scrobble",
                    200,
                    Some(&serde_json::json!({"error":code}))
                ),
                Some(reason)
            );
        }
        assert_eq!(
            response_error(
                "auth.getSession",
                403,
                Some(&serde_json::json!({"error":14}))
            ),
            Some("not_authorized")
        );
        assert_eq!(
            response_error(
                "auth.getSession",
                200,
                Some(&serde_json::json!({"error":"15"}))
            ),
            Some("token_expired")
        );
    }
}
