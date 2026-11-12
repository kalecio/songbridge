# Last.fm in Songbridge

Songbridge can connect a Last.fm account from Settings, submit qualifying plays, explain why a play was not submitted, and import selected metadata and cover art into local audio files.

## Register the application

1. Sign in to the maintainer's Last.fm account and [create an API account](https://www.last.fm/api/account/create).
2. Register **Songbridge**, describe its desktop scrobbling and metadata features, and use **https://songbridge.kalec.io** as the application website.
3. Songbridge uses [desktop authentication](https://www.last.fm/api/desktopauth): a temporary token, browser authorization, then an explicit **Complete connection** action. It does not require a callback server or custom URL scheme. Leave the callback URL blank where optional.
4. Save the API key and shared secret in your secret manager. Do not put them in source control, issue comments, screenshots, or chat.

The application credentials are used by the Cloudflare Worker in `worker/lastfm`. The Worker stores the API key and shared secret as encrypted Worker secrets and signs a small allowlist of Last.fm calls. The app contains the public API key (needed to open Last.fm's authorization page) and the Worker URL; the shared secret is never compiled into desktop builds.

## Build credentials

The Rust backend reads **LASTFM_API_KEY** and **LASTFM_WORKER_URL** from the environment **at build time**.

For local development, inject both variables into the environment that launches `npm run tauri dev`. `LASTFM_API_KEY` is public app configuration; `LASTFM_WORKER_URL` is the deployed Worker endpoint. Changing them requires restarting/rebuilding the Rust application. A frontend .env file alone does not configure the Rust compiler. To run the Worker locally, copy `worker/lastfm/.dev.vars.example` to `worker/lastfm/.dev.vars`, enter the Last.fm credentials, then run `npm run lastfm:worker:dev`. Never commit `.dev.vars`.

For official releases, configure the repository variable **LASTFM_WORKER_URL** and Actions secret **LASTFM_API_KEY**. The release workflow passes them to the Tauri build step on macOS, Windows, and Linux. For Worker deployment, also configure Actions secrets **CLOUDFLARE_API_TOKEN**, **CLOUDFLARE_ACCOUNT_ID**, and **LASTFM_API_SECRET**. The Worker deployment workflow sets the Last.fm credentials as Worker secrets; the shared secret is not passed to the desktop build. Fork PRs and ordinary CI need no credentials; tests never contact Last.fm.

The Worker is a constrained signing proxy, not proof that a request came from an unmodified Songbridge binary. It only forwards the app's required methods and validates parameter names, sizes, and payload limits; it does not accept a caller-provided URL or signature. Last.fm session keys remain in the desktop OS keyring and travel to the Worker only over HTTPS for the requested account action. Follow Last.fm's [API terms](https://www.last.fm/api/tos), monitor usage, and rotate compromised application credentials.

## Deploy the Worker

The Worker lives in this repository at `worker/lastfm`. Create it once in Cloudflare as `songbridge-lastfm-api` before using a token scoped to that Worker. For this existing Worker, **Workers → Editor** is sufficient for deployments and secret updates. If you instead want the first workflow run to create it, that initial token needs **Workers → Admin** at the account scope; replace it with a Worker-scoped Editor token afterward. If you attach a custom domain or route as part of deployment, add **Zone → Workers Routes → Write** scoped to the zone. No KV, R2, Tail, build settings, or account settings permissions are used.

Add the required Cloudflare and Last.fm values to repository Actions secrets, then run **Deploy Last.fm Worker** from Actions (or push a change under `worker/lastfm` to `main`). Set the resulting HTTPS Worker endpoint in the repository variable **LASTFM_WORKER_URL**; that URL is embedded in subsequent desktop release builds. `wrangler deploy` enables the `workers.dev` endpoint by default, so no zone permission is needed unless you choose a custom domain. The included rate limit is approximate and per Cloudflare location; it reduces casual abuse but is not a strict global quota or proof that requests came from Songbridge.

## Connect and manage an account

In **Settings → Last.fm**, choose **Connect to Last.fm**, authorize Songbridge in the browser, return to Songbridge, and choose **Complete connection**. Authorization attempts expire after an hour and can be cancelled.

**Remember this account securely** saves the session in macOS Keychain, Windows Credential Manager, or Linux Secret Service. Linux requires a running, unlocked Secret Service provider such as GNOME Keyring or KWallet with its Secret Service interface enabled. If secure storage is unavailable, uncheck this option and complete the connection for this session only. Session keys never go to the React frontend, SQLite, or logs.

Turning scrobbling off stops new tracking and pending submissions. Turning it back on resumes the existing account's outbox, and listening eligibility starts with the **next newly loaded track**. Connecting or reconnecting also starts tracking on the next track. Earlier listening is never imported. Metadata edits apply to subsequent plays; they do not rewrite already queued listening history.

**Disconnect** requires confirmation because it removes local queued plays and recent history for that account as well as its saved credentials. It waits for an in-flight submission to finish before completing. Submitted plays remain on Last.fm. To invalidate the remote session too, revoke Songbridge in your Last.fm account's application settings. When removal from secure storage fails, the error is shown and disconnect does not falsely report success.

## Eligibility and feedback

The implementation follows Last.fm's [Scrobbling 2.0 guide](https://www.last.fm/api/scrobbling) and [track.scrobble contract](https://www.last.fm/api/show/track.scrobble):

- A track must be longer than 30 seconds and have an actual artist, title, and known duration.
- Listening must reach half the track duration or four minutes, whichever is shorter.
- The Rust audio thread measures playback advancement and elapsed time. Pauses, seek jumps, and long suspend gaps do not count.
- Each load/repeat has a distinct local play identifier. A play qualifies only once. Timestamps use the original UTC playback start, including offline submissions.
- Songbridge uses file tags, never filename-derived titles. It does not import Last.fm's automatic corrections into submissions.
- Now Playing is attempted once near playback start. Stale or failed updates are discarded, not retried.

The **Last.fm** indicator in the player opens current status and recent activity. Settings also includes recent activity and pending counts. Reasons include missing tags, short/unknown duration, skipping too early, disabled scrobbling, network errors, expired authorization, rate limits, rejected tags, and invalid timestamps. Missing tags offer access to the metadata editor.

In **Settings → Last.fm → Review library metadata**, Songbridge can compare every local track's title, artist, album, track number, and cover art with Last.fm. The scan reads tags from each file and checks tracks sequentially, showing progress and allowing cancellation. Correct values are skipped; missing fields and mismatches are proposed. Missing cover art can be filled, while existing embedded covers are preserved. You approve or reject each proposed field change individually, and nothing is written until **Apply approved changes** is chosen. Review suggested artist or title changes carefully because Last.fm may normalize names. Last.fm does not provide a reliable release year for this workflow.

## Queue and retry policy

Eligible plays are persisted in SQLite before submission, bound to the Last.fm username, and sent oldest first in batches of at most 50. A restart retains pending plays but marks unfinished, unqualified plays as interrupted. An account cannot submit another account's queue.

HTTP status, API errors (including errors inside HTTP 200 responses), and per-track ignored codes are handled separately. Accepted and permanently rejected entries leave the pending queue individually. Network/service failures retain the same play and timestamp, with exponential backoff and jitter up to an hour. Requests are paced at least one second apart locally. This is a conservative client policy, **not** a published Last.fm quota.

Rate-limit responses honor numeric Retry-After values, with at least a 60-second client cooldown. A daily-limit response stops submissions for 24 hours; rejected entries remain visible and are not automatically resubmitted. Expired sessions and invalid/suspended application credentials disable submission until resolved. Cooldowns and disabled authorization state survive restart. Last.fm may enforce additional limits; no client can guarantee an account will never be restricted.

The outbox is bounded to 10,000 entries. If full, the oldest pending entries become queue-full outcomes. Up to 100 terminal outcomes are kept locally, with the most recent 30 shown. Local playback IDs prevent duplicate enqueueing; Last.fm does not supply an idempotency key. A lost response after remote acceptance can require retrying the same artist/title/start timestamp, so exactly-once delivery cannot be guaranteed across network or process failures.

## Import metadata and cover art

While authenticated, open a song or album metadata editor and choose **Find metadata on Last.fm**:

1. Search by title/album and, for tracks, artist. Select a specific match.
2. Review current and proposed fields and the cover preview. **Fill missing fields only** is enabled by default.
3. Choose individual fields and apply. Replacement requires explicitly turning off fill-missing mode.
4. Review the per-file outcome, then choose **Done**. Successful files remain updated even if another file is read-only or unsupported.

Song imports offer title, artist, album, track number (when returned), and artwork. Album imports offer album, artist, and artwork while preserving each song's title and track number. The album artist checkbox starts unchecked to protect compilation artists. Release year is not inferred from Last.fm wiki publication dates, which are not reliable release dates.

Tags and selected artwork are written through Songbridge's existing metadata writer. The library, playlists, cached artwork, and current track metadata refresh from successful writes. The existing writer's supported formats and filesystem permissions apply. Fill-missing checks read the actual file, including embedded art, rather than relying on lazy library thumbnails.

Searches and previews do not modify files. Artwork downloads use HTTPS on known Last.fm CDN hosts, do not follow redirects, have a 10 MiB download limit and decoder limits, and are normalized to JPEG at up to 1500 × 1500. Temporary previews are bounded to 20 files/50 MiB and aged out after a day on subsequent downloads. Last.fm attribution links to the selected result.

## Verification

Automated tests cover signatures, transport/API error handling, eligibility thresholds, seek/pause/suspend accounting, repeat identity, original timestamps, queue persistence/isolation, per-track outcomes, authorization stopping, selected-field imports, compilation metadata, existing artwork, and partial write failures.

After application registration, perform a live smoke test with a test account before distributing an enabled build:

- Authorize, persist the session, restart, and disconnect on each supported OS; also try session-only mode.
- Play a tagged track past its threshold and confirm one scrobble on Last.fm. Skip another early; seek and pause; repeat the original.
- Disconnect the network, qualify a play, restart, and reconnect. Confirm that the original timestamp is preserved and no additional local entry is created.
- Revoke account authorization on Last.fm and confirm Songbridge stops submissions and requests reconnection.
- Preview and selectively import tags/art into disposable copies of a song and a compilation album. Include a read-only file and verify successful files still update.

Do not deliberately trigger service rate limits to test backoff; use the automated response fixtures.
