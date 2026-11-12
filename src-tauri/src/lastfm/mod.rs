mod client;
pub mod metadata;
mod tracker;

use client::{ApiError, Client};
use once_cell::sync::OnceCell;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::BTreeMap,
    sync::{Arc, Mutex},
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::Manager;
use tracker::{Track, Tracker};

type Db = Arc<Mutex<Connection>>;
static EVENTS: OnceCell<tokio::sync::mpsc::UnboundedSender<AudioEvent>> = OnceCell::new();

pub enum AudioEvent {
    Loaded(String, bool, Instant),
    Seek,
    Sample {
        position: f64,
        playing: bool,
        ended: bool,
        at: Instant,
        utc_ms: u64,
    },
}
pub fn audio_event(event: AudioEvent) {
    if let Some(tx) = EVENTS.get() {
        let _ = tx.send(event);
    }
}
pub fn utc_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

#[derive(Clone, Serialize, Deserialize)]
struct Session {
    name: String,
    key: String,
}
#[derive(Clone, Serialize, Deserialize)]
pub struct Play {
    id: String,
    path: String,
    track: Track,
    timestamp: u64,
    listened: f64,
    required: f64,
    status: String,
}
struct Active {
    play: Play,
    tracker: Tracker,
    last_tick: Instant,
    recorded: bool,
    playing: bool,
}
struct Inner {
    session: Option<Session>,
    pending_token: Option<(String, Instant)>,
    pending_session: Option<Session>,
    enabled: bool,
    persistent: bool,
    error: Option<String>,
    active: Option<Active>,
    now_playing: Option<Play>,
    cooldown: Instant,
    failures: u32,
    sequence: u64,
    tracking_since: Instant,
}
pub struct Service {
    client: Client,
    db: Db,
    inner: Mutex<Inner>,
    // Serializes account lifecycle with requests; no submission can outlive a
    // completed disconnect or accidentally be sent with a different account.
    gate: tokio::sync::Mutex<()>,
}

#[derive(Serialize)]
pub struct Status {
    configured: bool,
    connected: bool,
    username: Option<String>,
    enabled: bool,
    persistent: bool,
    authorizing: bool,
    error: Option<String>,
    current: Option<Play>,
    pending: i64,
    history: Vec<Play>,
}

fn credential() -> Result<keyring::Entry, String> {
    keyring::Entry::new("com.songbridge.lastfm", "session").map_err(|_| "secure_storage".into())
}

fn init_db(db: &Db) -> Result<(), String> {
    db.lock()
        .map_err(|_| "database")?
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS lastfm_plays (
            id TEXT PRIMARY KEY, account TEXT NOT NULL, payload TEXT NOT NULL,
            status TEXT NOT NULL, created INTEGER NOT NULL);
         CREATE INDEX IF NOT EXISTS lastfm_pending ON lastfm_plays(account, status, created);
         UPDATE lastfm_plays SET status='interrupted' WHERE status='listening';",
        )
        .map_err(|_| "database".into())
}

impl Service {
    fn save(&self, play: &Play, account: &str) -> Result<(), String> {
        let payload = serde_json::to_string(play).map_err(|_| "database")?;
        let conn = self.db.lock().map_err(|_| "database")?;
        conn.execute("INSERT INTO lastfm_plays(id, account, payload, status, created) VALUES (?1,?2,?3,?4,?5)
            ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,status=excluded.status",
            params![play.id, account, payload, play.status, play.timestamp as i64]).map_err(|_| "database")?;
        // Bound the outbox without silently presenting discarded entries as sent.
        conn.execute("UPDATE lastfm_plays SET status='queue_full' WHERE status='queued' AND id NOT IN
            (SELECT id FROM lastfm_plays WHERE status='queued' ORDER BY created DESC,rowid DESC LIMIT 10000)", [])
            .map_err(|_| "database")?;
        conn.execute("DELETE FROM lastfm_plays WHERE status != 'queued' AND id NOT IN
            (SELECT id FROM lastfm_plays WHERE status != 'queued' ORDER BY created DESC, rowid DESC LIMIT 100)", [])
            .map_err(|_| "database")?;
        Ok(())
    }
    fn plays(&self, account: &str, pending: bool) -> Result<Vec<Play>, String> {
        let conn = self.db.lock().map_err(|_| "database")?;
        let sql = if pending {
            "SELECT payload,status FROM lastfm_plays WHERE account=?1 AND status='queued' ORDER BY created,rowid LIMIT 50"
        } else {
            "SELECT payload,status FROM lastfm_plays WHERE account=?1 ORDER BY created DESC,rowid DESC LIMIT 30"
        };
        let mut stmt = conn.prepare(sql).map_err(|_| "database")?;
        let rows = stmt
            .query_map([account], |r| {
                Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
            })
            .map_err(|_| "database")?;
        let mut out = Vec::new();
        for row in rows {
            let (payload, status) = row.map_err(|_| "database")?;
            let mut play: Play = serde_json::from_str(&payload).map_err(|_| "database")?;
            play.status = status;
            out.push(play);
        }
        Ok(out)
    }
    fn finish_active(&self, inner: &mut Inner, reason: &str) {
        if let Some(mut active) = inner.active.take() {
            if !active.recorded && active.play.timestamp != 0 {
                if active.play.status == "listening" {
                    active.play.status = reason.into();
                }
                if let Some(s) = &inner.session {
                    if let Err(e) = self.save(&active.play, &s.name) {
                        inner.error = Some(e);
                    }
                }
            }
        }
        inner.now_playing = None;
    }

    fn loaded(&self, path: String, success: bool, track: Track, at: Instant) {
        let mut inner = self.inner.lock().unwrap();
        if at < inner.tracking_since {
            return;
        }
        self.finish_active(&mut inner, "skipped");
        inner.sequence += 1;
        let reason = if !success {
            "load_failed"
        } else if inner.session.is_none() {
            "not_connected"
        } else if !inner.enabled {
            "disabled"
        } else {
            track.reason()
        };
        let play = Play {
            id: format!("{}-{}", utc_ms(), inner.sequence),
            path,
            timestamp: 0,
            listened: 0.0,
            required: track.required(),
            status: reason.into(),
            track,
        };
        inner.active = Some(Active {
            play,
            tracker: Tracker::new(),
            last_tick: at,
            recorded: false,
            playing: false,
        });
    }

    fn sample(&self, position: f64, playing: bool, ended: bool, at: Instant, utc_ms: u64) {
        let mut inner = self.inner.lock().unwrap();
        if at < inner.tracking_since {
            return;
        }
        let enabled = inner.enabled && inner.session.is_some();
        let account = inner.session.as_ref().map(|s| s.name.clone());
        let mut np = None;
        let mut error = None;
        if let Some(a) = inner.active.as_mut() {
            let elapsed = at.saturating_duration_since(a.last_tick).as_secs_f64();
            a.last_tick = at;
            a.playing = playing;
            if !enabled {
                a.tracker.reset_baseline();
                return;
            }
            if a.play.timestamp == 0 && playing {
                a.play.timestamp = utc_ms / 1000;
                if a.play.track.reason() == "listening" {
                    np = Some(a.play.clone());
                }
                if let Some(account) = &account {
                    if let Err(e) = self.save(&a.play, account) {
                        error = Some(e);
                    }
                }
            }
            a.tracker.sample(position, playing, utc_ms, elapsed);
            a.play.listened = a.tracker.listened;
            if a.play.status == "listening" && a.play.listened >= a.play.required {
                a.play.status = "queued".into();
                if let Some(account) = &account {
                    match self.save(&a.play, account) {
                        Ok(()) => a.recorded = true,
                        Err(e) => {
                            a.play.status = "listening".into();
                            error = Some(e);
                        }
                    }
                }
            }
            if ended && !a.recorded && a.play.timestamp != 0 {
                if a.play.status == "listening" {
                    a.play.status = "skipped".into();
                }
                if let Some(account) = &account {
                    match self.save(&a.play, account) {
                        Ok(()) => a.recorded = true,
                        Err(e) => error = Some(e),
                    }
                }
            }
        }
        if np.is_some() {
            inner.now_playing = np;
        }
        if error.is_some() {
            inner.error = error;
        }
    }
    fn preference(&self, key: &str, value: &str) -> Result<(), String> {
        self.db
            .lock()
            .map_err(|_| "database")?
            .execute(
                "INSERT OR REPLACE INTO preferences(key,value) VALUES(?1,?2)",
                [key, value],
            )
            .map_err(|_| "database")?;
        Ok(())
    }
    fn record_error(&self, err: ApiError) {
        let mut inner = self.inner.lock().unwrap();
        if err.code == "reauthenticate" || err.code == "application_error" {
            inner.enabled = false;
            let _ = self.preference("lastfm_enabled", "false");
        }
        inner.failures = (inner.failures + 1).min(10);
        let backoff = (5u64 * 2u64.pow(inner.failures)).min(3600);
        let delay = err
            .retry_after
            .unwrap_or(backoff)
            .max(backoff)
            .min(u32::MAX as u64)
            + utc_ms() % 5;
        inner.cooldown = Instant::now() + Duration::from_secs(delay);
        let _ = self.preference("lastfm_retry_after", &(utc_ms() / 1000 + delay).to_string());
        let _ = self.preference("lastfm_error", &err.code);
        inner.error = Some(err.code);
    }
    fn clear_error(&self) {
        let mut inner = self.inner.lock().unwrap();
        inner.failures = 0;
        inner.error = None;
        let _ = self.preference("lastfm_error", "");
        let _ = self.preference("lastfm_retry_after", "0");
    }
    fn update_result(&self, play: &mut Play, account: &str, status: String) -> Result<(), String> {
        play.status = status;
        self.save(play, account)?;
        let mut inner = self.inner.lock().unwrap();
        if let Some(a) = &mut inner.active {
            if a.play.id == play.id {
                a.play.status = play.status.clone();
            }
        }
        Ok(())
    }
    pub(super) fn session_key(&self) -> Result<String, String> {
        self.inner
            .lock()
            .unwrap()
            .session
            .as_ref()
            .map(|s| s.key.clone())
            .ok_or("not_connected".into())
    }
}

pub fn init(app: &tauri::AppHandle) -> Result<(), String> {
    let db = app.state::<crate::db::state::DbState>().conn.clone();
    init_db(&db)?;
    let pref = |key: &str| {
        db.lock()
            .unwrap()
            .query_row("SELECT value FROM preferences WHERE key=?1", [key], |r| {
                r.get::<_, String>(0)
            })
            .unwrap_or_default()
    };
    let persistent = pref("lastfm_remember") == "true";
    let stored = if persistent {
        credential()
            .and_then(|entry| {
                entry
                    .get_password()
                    .map_err(|_| "secure_storage".to_string())
            })
            .and_then(|data| {
                serde_json::from_str::<Session>(&data).map_err(|_| "secure_storage".to_string())
            })
            .map(Some)
    } else {
        Ok(None)
    };
    let error = stored.as_ref().err().cloned().or_else(|| {
        let e = pref("lastfm_error");
        if e.is_empty() {
            None
        } else {
            Some(e)
        }
    });
    let session = stored.ok().flatten();
    let enabled = pref("lastfm_enabled") == "true";
    let retry_after = pref("lastfm_retry_after")
        .parse::<u64>()
        .unwrap_or(0)
        .saturating_sub(utc_ms() / 1000)
        .min(u32::MAX as u64);
    let service = Arc::new(Service {
        client: Client::new().map_err(|_| "client")?,
        db,
        inner: Mutex::new(Inner {
            persistent,
            session,
            pending_token: None,
            pending_session: None,
            enabled,
            error,
            active: None,
            now_playing: None,
            cooldown: Instant::now() + Duration::from_secs(retry_after),
            failures: 0,
            sequence: 0,
            tracking_since: Instant::now(),
        }),
        gate: tokio::sync::Mutex::new(()),
    });
    app.manage(service.clone());
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
    let _ = EVENTS.set(tx);
    let listener = service.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                AudioEvent::Loaded(path, success, at) => {
                    let read_path = path.clone();
                    let metadata = if success {
                        tauri::async_runtime::spawn_blocking(move || {
                            crate::metadata::commands::get_metadata(&read_path)
                        })
                        .await
                        .ok()
                        .and_then(Result::ok)
                    } else {
                        None
                    };
                    let track = metadata
                        .map(|m| Track {
                            title: m.title.unwrap_or_default(),
                            artist: m.artist.unwrap_or_default(),
                            album: m.album.unwrap_or_default(),
                            duration: m.duration.duration_seconds.unwrap_or(0),
                            track_number: m.track,
                        })
                        .unwrap_or_default();
                    listener.loaded(path, success, track, at);
                }
                AudioEvent::Seek => {
                    if let Some(a) = listener.inner.lock().unwrap().active.as_mut() {
                        a.tracker.reset_baseline();
                    }
                }
                AudioEvent::Sample {
                    position,
                    playing,
                    ended,
                    at,
                    utc_ms,
                } => {
                    listener.sample(position, playing, ended, at, utc_ms);
                }
            }
        }
    });
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(2)).await;
            let _gate = service.gate.lock().await;
            let snapshot = {
                let mut i = service.inner.lock().unwrap();
                // Now-playing is never cached through an outage or pause.
                let np = i.now_playing.take().filter(|p| {
                    utc_ms() / 1000 < p.timestamp + 10
                        && i.active
                            .as_ref()
                            .is_some_and(|a| a.playing && a.play.id == p.id)
                });
                if !i.enabled || Instant::now() < i.cooldown {
                    continue;
                }
                i.session.clone().map(|s| (s, np))
            };
            let Some((session, np)) = snapshot else {
                continue;
            };
            if let Some(play) = np {
                let result = service
                    .client
                    .request(
                        "track.updateNowPlaying",
                        track_params(&play, None),
                        Some(&session.key),
                    )
                    .await;
                if let Err(e) = result {
                    service.record_error(e);
                    continue;
                }
                service.clear_error();
            }
            let plays = match service.plays(&session.name, true) {
                Ok(p) => p,
                Err(e) => {
                    service.inner.lock().unwrap().error = Some(e);
                    continue;
                }
            };
            if plays.is_empty() {
                continue;
            }
            let mut params = BTreeMap::new();
            for (index, play) in plays.iter().enumerate() {
                params.extend(track_params(play, Some(index)));
            }
            match service
                .client
                .request("track.scrobble", params, Some(&session.key))
                .await
            {
                Ok(body) => {
                    let Some(results) = submission_results(&body, plays.len()) else {
                        service.record_error(ApiError::new("invalid_response"));
                        continue;
                    };
                    let daily_limit = results.iter().any(|status| status == "daily_limit");
                    let mut saved = true;
                    for (mut play, status) in plays.into_iter().zip(results) {
                        if let Err(e) = service.update_result(&mut play, &session.name, status) {
                            service.inner.lock().unwrap().error = Some(e);
                            saved = false;
                            break;
                        }
                    }
                    if daily_limit {
                        service.record_error(ApiError {
                            code: "daily_limit".into(),
                            retry_after: Some(86400),
                        });
                    } else if saved {
                        service.clear_error();
                    }
                }
                Err(e) => {
                    if !matches!(
                        e.code.as_str(),
                        "offline"
                            | "temporary"
                            | "rate_limited"
                            | "reauthenticate"
                            | "application_error"
                            | "invalid_response"
                    ) {
                        for mut play in plays {
                            let _ = service.update_result(&mut play, &session.name, e.code.clone());
                        }
                    }
                    service.record_error(e);
                }
            }
        }
    });
    Ok(())
}

fn track_params(play: &Play, index: Option<usize>) -> BTreeMap<String, String> {
    let suffix = index.map(|i| format!("[{i}]")).unwrap_or_default();
    let mut p = BTreeMap::from([
        (format!("artist{suffix}"), play.track.artist.clone()),
        (format!("track{suffix}"), play.track.title.clone()),
        (format!("album{suffix}"), play.track.album.clone()),
        (format!("duration{suffix}"), play.track.duration.to_string()),
    ]);
    if index.is_some() {
        p.insert(format!("timestamp{suffix}"), play.timestamp.to_string());
    }
    if let Some(n) = play.track.track_number {
        p.insert(format!("trackNumber{suffix}"), n.to_string());
    }
    p
}

fn submission_results(body: &Value, expected: usize) -> Option<Vec<String>> {
    let result = body.get("scrobbles")?.get("scrobble")?;
    let rows = if let Some(array) = result.as_array() {
        array.clone()
    } else {
        vec![result.clone()]
    };
    if rows.len() != expected {
        return None;
    }
    rows.iter()
        .map(|row| {
            let code = row
                .get("ignoredMessage")
                .or_else(|| row.get("ignoredmessage"))?
                .get("code")?;
            let code = code
                .as_str()
                .map(str::to_owned)
                .or_else(|| code.as_u64().map(|n| n.to_string()))?;
            Some(
                match code.as_str() {
                    "0" => "scrobbled",
                    "1" => "artist_rejected",
                    "2" => "track_rejected",
                    "3" => "too_old",
                    "4" => "future_timestamp",
                    "5" => "daily_limit",
                    _ => "rejected",
                }
                .into(),
            )
        })
        .collect()
}

#[tauri::command]
pub fn lastfm_status(service: tauri::State<Arc<Service>>) -> Result<Status, String> {
    let i = service.inner.lock().unwrap();
    let name = i.session.as_ref().map(|s| s.name.clone());
    let history = match &name {
        Some(n) => service.plays(n, false)?,
        None => vec![],
    };
    let pending = if let Some(n) = &name {
        service
            .db
            .lock()
            .unwrap()
            .query_row(
                "SELECT COUNT(*) FROM lastfm_plays WHERE account=?1 AND status='queued'",
                [n],
                |r| r.get(0),
            )
            .map_err(|_| "database")?
    } else {
        0
    };
    Ok(Status {
        configured: service.client.configured(),
        connected: i.session.is_some(),
        username: name,
        enabled: i.enabled,
        persistent: i.persistent,
        authorizing: i.pending_token.is_some() || i.pending_session.is_some(),
        error: i.error.clone(),
        current: i.active.as_ref().map(|a| a.play.clone()),
        pending,
        history,
    })
}

#[tauri::command]
pub async fn lastfm_connect(service: tauri::State<'_, Arc<Service>>) -> Result<String, String> {
    let _gate = service.gate.lock().await;
    let body = service
        .client
        .request("auth.getToken", BTreeMap::new(), None)
        .await
        .map_err(|e| e.code)?;
    let token = body
        .get("token")
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty())
        .ok_or("invalid_response")?
        .to_owned();
    let url = service.client.auth_url(&token);
    let mut i = service.inner.lock().unwrap();
    i.pending_token = Some((token, Instant::now()));
    i.pending_session = None;
    Ok(url)
}

#[tauri::command]
pub async fn lastfm_complete_connection(
    service: tauri::State<'_, Arc<Service>>,
    remember: bool,
) -> Result<(), String> {
    let _gate = service.gate.lock().await;
    let cached = service.inner.lock().unwrap().pending_session.clone();
    let session = if let Some(s) = cached {
        s
    } else {
        let token = service
            .inner
            .lock()
            .unwrap()
            .pending_token
            .clone()
            .ok_or("token_expired")?;
        if token.1.elapsed() >= Duration::from_secs(3600) {
            return Err("token_expired".into());
        }
        let body = service
            .client
            .request(
                "auth.getSession",
                BTreeMap::from([("token".into(), token.0)]),
                None,
            )
            .await
            .map_err(|e| e.code)?;
        let s = body.get("session").ok_or("invalid_response")?;
        let session = Session {
            name: s
                .get("name")
                .and_then(Value::as_str)
                .filter(|s| !s.is_empty())
                .ok_or("invalid_response")?
                .into(),
            key: s
                .get("key")
                .and_then(Value::as_str)
                .filter(|s| !s.is_empty())
                .ok_or("invalid_response")?
                .into(),
        };
        let mut i = service.inner.lock().unwrap();
        i.pending_token = None;
        i.pending_session = Some(session.clone());
        session
    };
    if !remember && service.inner.lock().unwrap().persistent {
        delete_credential().await?;
    }
    if remember {
        let data = serde_json::to_string(&session).map_err(|_| "secure_storage")?;
        tauri::async_runtime::spawn_blocking(move || {
            credential()?
                .set_password(&data)
                .map_err(|_| "secure_storage".to_string())
        })
        .await
        .map_err(|_| "secure_storage")??;
    }
    let mut i = service.inner.lock().unwrap();
    service.finish_active(&mut i, "interrupted");
    i.session = Some(session);
    i.pending_session = None;
    i.persistent = remember;
    i.enabled = true;
    i.error = None;
    i.failures = 0;
    i.cooldown = Instant::now();
    i.tracking_since = Instant::now();
    service.preference("lastfm_remember", if remember { "true" } else { "false" })?;
    service.preference("lastfm_error", "")?;
    service.preference("lastfm_retry_after", "0")?;
    service
        .db
        .lock()
        .unwrap()
        .execute(
            "INSERT OR REPLACE INTO preferences(key,value) VALUES('lastfm_enabled','true')",
            [],
        )
        .map_err(|_| "database")?;
    Ok(())
}

#[tauri::command]
pub async fn lastfm_set_enabled(
    service: tauri::State<'_, Arc<Service>>,
    enabled: bool,
) -> Result<(), String> {
    let _gate = service.gate.lock().await;
    let mut i = service.inner.lock().unwrap();
    if enabled && i.session.is_none() {
        return Err("not_connected".into());
    }
    if enabled
        && matches!(
            i.error.as_deref(),
            Some("reauthenticate" | "application_error")
        )
    {
        return Err(i.error.clone().unwrap());
    }
    service.finish_active(&mut i, "interrupted");
    i.enabled = enabled;
    // A new opt-in starts with the next play, never retroactively.
    i.tracking_since = Instant::now();
    service
        .db
        .lock()
        .unwrap()
        .execute(
            "INSERT OR REPLACE INTO preferences(key,value) VALUES('lastfm_enabled',?1)",
            [enabled.to_string()],
        )
        .map_err(|_| "database")?;
    Ok(())
}

#[tauri::command]
pub async fn lastfm_disconnect(service: tauri::State<'_, Arc<Service>>) -> Result<(), String> {
    let _gate = service.gate.lock().await;
    if service.inner.lock().unwrap().persistent {
        delete_credential().await?;
    }
    let mut i = service.inner.lock().unwrap();
    service.finish_active(&mut i, "disabled");
    if let Some(s) = &i.session {
        service
            .db
            .lock()
            .unwrap()
            .execute("DELETE FROM lastfm_plays WHERE account=?1", [&s.name])
            .map_err(|_| "database")?;
    }
    i.session = None;
    i.enabled = false;
    i.pending_session = None;
    i.pending_token = None;
    i.error = None;
    i.persistent = false;
    i.tracking_since = Instant::now();
    service.preference("lastfm_remember", "false")?;
    service.preference("lastfm_error", "")?;
    service.preference("lastfm_retry_after", "0")?;
    service
        .db
        .lock()
        .unwrap()
        .execute("DELETE FROM preferences WHERE key='lastfm_enabled'", [])
        .map_err(|_| "database")?;
    Ok(())
}

async fn delete_credential() -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(|| match credential()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err("secure_storage".to_string()),
    })
    .await
    .map_err(|_| "secure_storage")?
}

#[tauri::command]
pub async fn lastfm_cancel_connection(
    service: tauri::State<'_, Arc<Service>>,
) -> Result<(), String> {
    let _gate = service.gate.lock().await;
    let mut i = service.inner.lock().unwrap();
    i.pending_token = None;
    i.pending_session = None;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn treats_ignored_http_success_per_track() {
        let value = serde_json::json!({"scrobbles":{"scrobble":[{"ignoredMessage":{"code":"0"}},{"ignoredMessage":{"code":"2"}}]}});
        assert_eq!(
            submission_results(&value, 2).unwrap(),
            vec!["scrobbled", "track_rejected"]
        );
        assert!(submission_results(&value, 3).is_none());
        assert!(submission_results(&serde_json::json!({}), 1).is_none());
    }
    #[test]
    fn queue_survives_restart_and_is_unique_per_play() {
        let db = Arc::new(Mutex::new(Connection::open_in_memory().unwrap()));
        init_db(&db).unwrap();
        let conn = db.lock().unwrap();
        conn.execute(
            "INSERT INTO lastfm_plays VALUES('play','alice','{}','queued',123)",
            [],
        )
        .unwrap();
        assert!(conn
            .execute(
                "INSERT INTO lastfm_plays VALUES('play','alice','{}','queued',123)",
                []
            )
            .is_err());
        drop(conn);
        init_db(&db).unwrap();
        let count: i64 = db
            .lock()
            .unwrap()
            .query_row(
                "SELECT COUNT(*) FROM lastfm_plays WHERE account='alice' AND status='queued'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);
    }
    fn service() -> Service {
        let db = Arc::new(Mutex::new(Connection::open_in_memory().unwrap()));
        init_db(&db).unwrap();
        db.lock()
            .unwrap()
            .execute_batch("CREATE TABLE preferences(key TEXT PRIMARY KEY,value TEXT NOT NULL);")
            .unwrap();
        Service {
            client: Client::new().unwrap(),
            db,
            inner: Mutex::new(Inner {
                session: Some(Session {
                    name: "alice".into(),
                    key: "not-a-real-key".into(),
                }),
                pending_token: None,
                pending_session: None,
                enabled: true,
                persistent: false,
                error: None,
                active: None,
                now_playing: None,
                cooldown: Instant::now(),
                failures: 0,
                sequence: 0,
                tracking_since: Instant::now(),
            }),
            gate: tokio::sync::Mutex::new(()),
        }
    }
    fn track() -> Track {
        Track {
            title: "Song".into(),
            artist: "Artist".into(),
            album: "Album".into(),
            duration: 60,
            track_number: Some(2),
        }
    }
    fn listen(service: &Service, start: Instant, from: u64, to: u64) {
        for second in from..=to {
            service.sample(
                second as f64,
                true,
                false,
                start + Duration::from_secs(second),
                1_000_000 + second * 1000,
            );
        }
    }
    #[test]
    fn enqueues_once_at_threshold_with_original_timestamp_and_real_tags() {
        let s = service();
        let start = Instant::now();
        s.loaded("/song.mp3".into(), true, track(), start);
        listen(&s, start, 0, 29);
        assert!(s.plays("alice", true).unwrap().is_empty());
        listen(&s, start, 30, 40);
        let plays = s.plays("alice", true).unwrap();
        assert_eq!(plays.len(), 1);
        assert_eq!(plays[0].timestamp, 1000);
        assert_eq!(plays[0].track.title, "Song");
        assert_eq!(plays[0].listened, 30.0);
        let params = track_params(&plays[0], Some(0));
        assert_eq!(params["timestamp[0]"], "1000");
        assert_eq!(params["trackNumber[0]"], "2");
        assert!(!params.values().any(|v| v.contains(".mp3")));
    }
    #[test]
    fn repeat_is_a_new_play_but_pause_and_seek_are_not() {
        let s = service();
        let start = Instant::now();
        s.loaded("/song.mp3".into(), true, track(), start);
        listen(&s, start, 0, 35);
        let id = s.plays("alice", true).unwrap()[0].id.clone();
        s.inner
            .lock()
            .unwrap()
            .active
            .as_mut()
            .unwrap()
            .tracker
            .reset_baseline();
        s.sample(
            55.0,
            false,
            false,
            start + Duration::from_secs(36),
            1_036_000,
        );
        s.sample(
            55.0,
            true,
            false,
            start + Duration::from_secs(40),
            1_040_000,
        );
        assert_eq!(s.plays("alice", true).unwrap().len(), 1);
        let next = start + Duration::from_secs(60);
        s.loaded("/song.mp3".into(), true, track(), next);
        listen(&s, next, 0, 31);
        let plays = s.plays("alice", true).unwrap();
        assert_eq!(plays.len(), 2);
        assert!(plays.iter().any(|p| p.id != id));
    }
    #[test]
    fn skipped_missing_tags_short_tracks_and_suspend_are_not_queued() {
        let s = service();
        let start = Instant::now();
        s.loaded("/a.mp3".into(), true, track(), start);
        listen(&s, start, 0, 5);
        s.sample(
            59.0,
            true,
            false,
            start + Duration::from_secs(60),
            1_060_000,
        );
        assert!(s.plays("alice", true).unwrap().is_empty());
        s.loaded(
            "/b.mp3".into(),
            true,
            Track {
                artist: String::new(),
                ..track()
            },
            start,
        );
        listen(&s, start, 0, 35);
        s.loaded(
            "/c.mp3".into(),
            true,
            Track {
                duration: 30,
                ..track()
            },
            start,
        );
        listen(&s, start, 0, 29);
        s.finish_active(&mut s.inner.lock().unwrap(), "skipped");
        assert!(s.plays("alice", true).unwrap().is_empty());
        let history = s.plays("alice", false).unwrap();
        assert!(history.iter().any(|p| p.status == "skipped"));
        assert!(history.iter().any(|p| p.status == "missing_metadata"));
        assert!(history.iter().any(|p| p.status == "too_short"));
    }
    #[test]
    fn account_queues_are_isolated_and_only_unacknowledged_entries_retry() {
        let s = service();
        let start = Instant::now();
        s.loaded("/a.mp3".into(), true, track(), start);
        listen(&s, start, 0, 31);
        s.loaded("/b.mp3".into(), true, track(), start);
        listen(&s, start, 0, 31);
        let mut plays = s.plays("alice", true).unwrap();
        assert!(s.plays("bob", true).unwrap().is_empty());
        s.update_result(&mut plays[0], "alice", "scrobbled".into())
            .unwrap();
        s.update_result(&mut plays[1], "alice", "track_rejected".into())
            .unwrap();
        init_db(&s.db).unwrap();
        assert!(s.plays("alice", true).unwrap().is_empty());
        assert_eq!(s.plays("alice", false).unwrap().len(), 2);
    }
    #[test]
    fn account_lifecycle_cutoff_discards_buffered_playback_from_before_opt_in() {
        let s = service();
        let old = Instant::now();
        s.inner.lock().unwrap().tracking_since = old + Duration::from_secs(60);
        s.loaded("/old.mp3".into(), true, track(), old);
        listen(&s, old, 0, 35);
        assert!(s.inner.lock().unwrap().active.is_none());
        assert!(s.plays("alice", false).unwrap().is_empty());
    }
    #[test]
    fn authorization_errors_stop_submissions_and_persist_that_decision() {
        let s = service();
        s.record_error(ApiError::new("reauthenticate"));
        assert!(!s.inner.lock().unwrap().enabled);
        let enabled: String =
            s.db.lock()
                .unwrap()
                .query_row(
                    "SELECT value FROM preferences WHERE key='lastfm_enabled'",
                    [],
                    |r| r.get(0),
                )
                .unwrap();
        assert_eq!(enabled, "false");
        s.record_error(ApiError {
            code: "daily_limit".into(),
            retry_after: Some(86400),
        });
        assert!(s.inner.lock().unwrap().cooldown > Instant::now() + Duration::from_secs(86390));
    }
    #[test]
    fn crash_does_not_turn_an_unqualified_play_into_a_submission() {
        let s = service();
        let start = Instant::now();
        s.loaded("/a.mp3".into(), true, track(), start);
        listen(&s, start, 0, 3);
        init_db(&s.db).unwrap();
        assert!(s.plays("alice", true).unwrap().is_empty());
        assert_eq!(s.plays("alice", false).unwrap()[0].status, "interrupted");
    }
}
