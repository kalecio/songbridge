use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use discord_rich_presence::{
    activity::{Activity, ActivityType, Assets, Button, Timestamps},
    DiscordIpc, DiscordIpcClient,
};
use log::{debug, info, warn};
use serde::Deserialize;
use tauri::AppHandle;

use crate::now_playing::{NowPlayingPayload, PlaybackStatePayload};

#[derive(Deserialize, Default)]
struct DiscordConfig {
    #[serde(rename = "applicationId")]
    application_id: Option<String>,
}

fn get_discord_app_id(app: &AppHandle) -> Option<String> {
    let config = app.config();
    let plugins = &config.plugins;
    let discord_config = plugins.0.get("discord-rpc")?;
    let config: DiscordConfig = serde_json::from_value(discord_config.clone()).ok()?;
    config.application_id.filter(|s| !s.is_empty())
}

pub struct DiscordPresence {
    client: Arc<Mutex<Option<DiscordIpcClient>>>,
    app_id: String,
    connected: Arc<Mutex<bool>>,
}

impl DiscordPresence {
    pub fn new(app_id: String) -> Self {
        Self {
            client: Arc::new(Mutex::new(None)),
            app_id,
            connected: Arc::new(Mutex::new(false)),
        }
    }

    pub fn init(&self) {
        let client = self.client.clone();
        let app_id = self.app_id.clone();
        let connected = self.connected.clone();

        std::thread::spawn(move || {
            Self::connect_loop(client, app_id, connected);
        });
    }

    fn connect_loop(
        client: Arc<Mutex<Option<DiscordIpcClient>>>,
        app_id: String,
        connected: Arc<Mutex<bool>>,
    ) {
        loop {
            let mut ipc = DiscordIpcClient::new(&app_id);
            match ipc.connect() {
                Ok(()) => {
                    info!("Discord Rich Presence connected");
                    *connected.lock().unwrap() = true;
                    *client.lock().unwrap() = Some(ipc);
                    break;
                }
                Err(e) => {
                    debug!("Discord connection failed: {}", e);
                    *connected.lock().unwrap() = false;
                }
            }

            std::thread::sleep(Duration::from_secs(10));
        }
    }

    pub fn set_activity(&self, metadata: &NowPlayingPayload, playback: &PlaybackStatePayload) {
        let mut client_guard = self.client.lock().unwrap();
        let Some(client) = client_guard.as_mut() else {
            return;
        };

        let is_playing = playback.is_playing;
        let elapsed = playback.elapsed_seconds.unwrap_or(0.0);
        let total = metadata.duration_seconds.unwrap_or(0);

        let mut activity = Activity::new()
            .state(
                metadata
                    .artist
                    .as_deref()
                    .unwrap_or("Unknown Artist")
                    .to_string(),
            )
            .details(
                metadata
                    .title
                    .as_deref()
                    .unwrap_or("Unknown Title")
                    .to_string(),
            )
            .activity_type(ActivityType::Listening);

        if let Some(album) = metadata.album.as_deref() {
            if !album.is_empty() {
                activity = activity.assets(
                    Assets::new()
                        .large_image("songbridge_logo")
                        .large_text(album.to_string())
                        .small_image(if is_playing { "play" } else { "pause" })
                        .small_text(if is_playing { "Playing" } else { "Paused" }),
                );
            }
        } else {
            activity = activity.assets(
                Assets::new()
                    .large_image("songbridge_logo")
                    .large_text("Songbridge")
                    .small_image(if is_playing { "play" } else { "pause" })
                    .small_text(if is_playing { "Playing" } else { "Paused" }),
            );
        }

        if total > 0 {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as i64;
            let elapsed_ms = (elapsed * 1000.0) as i64;
            let total_ms = total as i64 * 1000;
            let start_ms = now - elapsed_ms;
            let end_ms = start_ms + total_ms;

            debug!(
                "Discord timestamps: now={} elapsed_ms={} total_ms={} start_ms={} end_ms={} progress={:.2}% is_playing={}",
                now,
                elapsed_ms,
                total_ms,
                start_ms,
                end_ms,
                if total_ms > 0 { (elapsed_ms as f64 / total_ms as f64) * 100.0 } else { 0.0 },
                is_playing
            );

            activity = activity.timestamps(Timestamps::new().start(start_ms).end(end_ms));
        }

        activity = activity.buttons(vec![Button::new(
            "Listen on Songbridge",
            "https://github.com/kaleciosantana/songbridge",
        )]);

        if let Err(e) = client.set_activity(activity) {
            warn!("Failed to set Discord activity: {}", e);
            *self.connected.lock().unwrap() = false;
        }
    }

    pub fn clear(&self) {
        let mut client_guard = self.client.lock().unwrap();
        if let Some(client) = client_guard.as_mut() {
            if let Err(e) = client.clear_activity() {
                debug!("Failed to clear Discord activity: {}", e);
            }
        }
    }

    pub fn shutdown(&self) {
        self.clear();
        let mut client_guard = self.client.lock().unwrap();
        if let Some(mut client) = client_guard.take() {
            let _ = client.close();
        }
        *self.connected.lock().unwrap() = false;
    }
}

impl Drop for DiscordPresence {
    fn drop(&mut self) {
        self.shutdown();
    }
}

pub fn init(app: &AppHandle) -> Option<DiscordPresence> {
    let app_id = get_discord_app_id(app)?;
    info!("Initializing Discord Rich Presence with App ID: {}", app_id);

    let presence = DiscordPresence::new(app_id);
    presence.init();

    Some(presence)
}
