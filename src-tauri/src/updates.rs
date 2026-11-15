use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::{Update, UpdaterExt};
use url::Url;

const RELEASES_API: &str = "https://api.github.com/repos/kalecio/songbridge/releases?per_page=100";
const RELEASE_DOWNLOAD_BASE: &str = "https://github.com/kalecio/songbridge/releases/download/";

#[derive(Deserialize)]
struct GithubRelease {
    tag_name: String,
    prerelease: bool,
    draft: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    current_version: String,
    version: String,
    body: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateProgress {
    event: &'static str,
    data: UpdateProgressData,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateProgressData {
    content_length: Option<u64>,
    chunk_length: Option<u64>,
}

async fn latest_release_tag() -> Result<String, String> {
    let current_is_prerelease = env!("CARGO_PKG_VERSION").contains('-');
    let releases = reqwest::Client::builder()
        .user_agent(concat!("Songbridge/", env!("CARGO_PKG_VERSION")))
        .build()
        .map_err(|error| format!("Could not create update client: {error}"))?
        .get(RELEASES_API)
        .send()
        .await
        .map_err(|error| format!("Could not query GitHub releases: {error}"))?
        .error_for_status()
        .map_err(|error| format!("GitHub releases request failed: {error}"))?
        .json::<Vec<GithubRelease>>()
        .await
        .map_err(|error| format!("Could not parse GitHub releases: {error}"))?;

    releases
        .into_iter()
        .filter(|release| !release.draft && (current_is_prerelease || !release.prerelease))
        .filter_map(|release| {
            let version = release.tag_name.strip_prefix("songbridge-v")?;
            semver::Version::parse(version)
                .ok()
                .map(|version| (version, release.tag_name))
        })
        .max_by(|(left, _), (right, _)| left.cmp(right))
        .map(|(_, tag)| tag)
        .ok_or_else(|| {
            format!(
                "No published {} release was found",
                if current_is_prerelease {
                    "pre-release"
                } else {
                    "stable"
                }
            )
        })
}

async fn check_release(app: &AppHandle) -> Result<Option<Update>, String> {
    let tag = latest_release_tag().await?;
    let mut endpoint = Url::parse(RELEASE_DOWNLOAD_BASE)
        .map_err(|error| format!("Invalid updater release URL: {error}"))?;
    endpoint
        .path_segments_mut()
        .map_err(|_| "Invalid updater release URL".to_string())?
        .push(&tag)
        .push("latest.json");

    let updater = app
        .updater_builder()
        .endpoints(vec![endpoint])
        .map_err(|error| format!("Could not configure updater endpoint: {error}"))?
        .build()
        .map_err(|error| format!("Could not initialize updater: {error}"))?;
    updater
        .check()
        .await
        .map_err(|error| format!("Could not check release manifest: {error}"))
}

#[tauri::command]
pub async fn check_for_update(app: AppHandle) -> Result<Option<UpdateInfo>, String> {
    match check_release(&app).await? {
        Some(update) => Ok(Some(UpdateInfo {
            current_version: update.current_version,
            version: update.version,
            body: update.body,
        })),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn install_update(app: AppHandle, expected_version: String) -> Result<(), String> {
    let update = check_release(&app)
        .await?
        .ok_or_else(|| "The update is no longer available".to_string())?;
    if update.version != expected_version {
        return Err("A newer update is available; check for updates again".into());
    }

    let mut started = false;
    update
        .download_and_install(
            |chunk_length, content_length| {
                if !started {
                    started = true;
                    let _ = app.emit(
                        "songbridge-update-progress",
                        UpdateProgress {
                            event: "Started",
                            data: UpdateProgressData {
                                content_length,
                                chunk_length: None,
                            },
                        },
                    );
                }
                let _ = app.emit(
                    "songbridge-update-progress",
                    UpdateProgress {
                        event: "Progress",
                        data: UpdateProgressData {
                            content_length,
                            chunk_length: Some(chunk_length as u64),
                        },
                    },
                );
            },
            || {
                let _ = app.emit(
                    "songbridge-update-progress",
                    UpdateProgress {
                        event: "Finished",
                        data: UpdateProgressData {
                            content_length: None,
                            chunk_length: None,
                        },
                    },
                );
            },
        )
        .await
        .map_err(|error| format!("Update installation failed: {error}"))
}
