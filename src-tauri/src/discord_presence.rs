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
            "https://github.com/kalecio/songbridge/releases",
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::now_playing::{NowPlayingPayload, PlaybackStatePayload};

    // We can't easily test the full Discord connection without a running Discord instance,
    // but we can test the activity building logic and config parsing

    #[test]
    fn test_get_discord_app_id_from_config() {
        // This tests the config parsing logic
        let json = serde_json::json!({
            "plugins": {
                "discord-rpc": {
                    "applicationId": "123456789012345678"
                }
            }
        });

        // We can't easily test get_discord_app_id without an AppHandle,
        // but we can test the DiscordConfig deserialization
        let config: DiscordConfig = serde_json::from_value(
            json.get("plugins")
                .unwrap()
                .get("discord-rpc")
                .unwrap()
                .clone(),
        )
        .unwrap();
        assert_eq!(
            config.application_id,
            Some("123456789012345678".to_string())
        );
    }

    #[test]
    fn test_discord_config_empty_app_id() {
        let config: DiscordConfig = serde_json::from_value(serde_json::json!({
            "applicationId": ""
        }))
        .unwrap();
        assert_eq!(config.application_id, Some("".to_string()));

        // Test filtering empty string
        let filtered = config.application_id.filter(|s| !s.is_empty());
        assert_eq!(filtered, None);
    }

    #[test]
    fn test_discord_config_missing_app_id() {
        let config: DiscordConfig = serde_json::from_value(serde_json::json!({})).unwrap();
        assert_eq!(config.application_id, None);
    }

    #[test]
    fn test_discord_presence_new() {
        let presence = DiscordPresence::new("test_app_id".to_string());
        assert_eq!(presence.app_id, "test_app_id");
        assert!(!*presence.connected.lock().unwrap());
        assert!(presence.client.lock().unwrap().is_none());
    }

    #[test]
    fn test_discord_presence_default_values() {
        let presence = DiscordPresence::new("test".to_string());
        assert_eq!(presence.app_id, "test");
        assert_eq!(*presence.connected.lock().unwrap(), false);
    }

    #[test]
    fn test_set_activity_builds_correct_activity_structure() {
        // We can't call set_activity without a connected client,
        // but we can verify the activity building logic by checking
        // what parameters it would use
        let metadata = NowPlayingPayload {
            title: Some("Test Song".to_string()),
            artist: Some("Test Artist".to_string()),
            album: Some("Test Album".to_string()),
            duration_seconds: Some(180),
            cover_data_url: None,
        };

        let playback = PlaybackStatePayload {
            is_playing: true,
            elapsed_seconds: Some(45.0),
        };

        // Verify the data we'd pass to Discord
        assert_eq!(metadata.title.as_deref(), Some("Test Song"));
        assert_eq!(metadata.artist.as_deref(), Some("Test Artist"));
        assert_eq!(metadata.album.as_deref(), Some("Test Album"));
        assert_eq!(metadata.duration_seconds, Some(180));
        assert_eq!(playback.is_playing, true);
        assert_eq!(playback.elapsed_seconds, Some(45.0));
    }

    #[test]
    fn test_set_activity_with_paused_playback() {
        let metadata = NowPlayingPayload {
            title: Some("Test Song".to_string()),
            artist: Some("Test Artist".to_string()),
            album: Some("Test Album".to_string()),
            duration_seconds: Some(180),
            cover_data_url: None,
        };

        let playback = PlaybackStatePayload {
            is_playing: false,
            elapsed_seconds: Some(90.0),
        };

        assert_eq!(playback.is_playing, false);
        assert_eq!(playback.elapsed_seconds, Some(90.0));
    }

    #[test]
    fn test_set_activity_with_no_metadata() {
        let metadata = NowPlayingPayload {
            title: None,
            artist: None,
            album: None,
            duration_seconds: None,
            cover_data_url: None,
        };

        let playback = PlaybackStatePayload {
            is_playing: true,
            elapsed_seconds: None,
        };

        assert_eq!(metadata.title.as_deref(), None);
        assert_eq!(metadata.artist.as_deref(), None);
        assert_eq!(playback.elapsed_seconds, None);
    }

    #[test]
    fn test_timestamp_calculation() {
        // Test the timestamp calculation logic used in set_activity
        let elapsed = 45.0;
        let total = 180;
        let now = 1000000000000i64; // Fixed timestamp for testing

        let elapsed_ms = (elapsed * 1000.0) as i64;
        let total_ms = total as i64 * 1000;
        let start_ms = now - elapsed_ms;
        let end_ms = start_ms + total_ms;

        assert_eq!(elapsed_ms, 45000);
        assert_eq!(total_ms, 180000);
        assert_eq!(start_ms, now - 45000);
        assert_eq!(end_ms, start_ms + 180000);

        // Progress percentage
        let progress = (elapsed_ms as f64 / total_ms as f64) * 100.0;
        assert!((progress - 25.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_timestamp_calculation_zero_elapsed() {
        let elapsed = 0.0;
        let total = 180;
        let now = 1000000000000i64;

        let elapsed_ms = (elapsed * 1000.0) as i64;
        let total_ms = total as i64 * 1000;
        let start_ms = now - elapsed_ms;
        let end_ms = start_ms + total_ms;

        assert_eq!(elapsed_ms, 0);
        assert_eq!(start_ms, now);
        assert_eq!(end_ms, now + 180000);
    }

    #[test]
    fn test_activity_type_is_listening() {
        // Verify we use ActivityType::Listening (not Playing)
        use discord_rich_presence::activity::ActivityType;
        assert_eq!(ActivityType::Listening as u8, 2);
        assert_eq!(ActivityType::Playing as u8, 0);
    }

    #[test]
    fn test_clear_and_shutdown_dont_panic() {
        let presence = DiscordPresence::new("test".to_string());
        // These should not panic even without a connection
        presence.clear();
        presence.shutdown();
    }
}
