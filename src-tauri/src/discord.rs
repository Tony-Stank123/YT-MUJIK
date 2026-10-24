use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use serde::Deserialize;
use std::time::{SystemTime, UNIX_EPOCH};

const DISCORD_APP_ID: &str = "883083136283738142";

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct TrackPayload {
    pub title: Option<String>,
    pub artist: Option<String>,
    pub artwork: Option<String>,
    pub is_playing: Option<bool>,
    pub current_time: Option<u64>,
    pub duration: Option<u64>,
}

pub struct DiscordService {
    client: Option<DiscordIpcClient>,
}

impl DiscordService {
    pub fn new() -> Self {
        let mut service = Self { client: None };
        service.try_connect();
        service
    }

    fn try_connect(&mut self) {
        if self.client.is_none() {
            if let Ok(mut client) = DiscordIpcClient::new(DISCORD_APP_ID) {
                if client.connect().is_ok() {
                    log::info!("Connected to Discord Rich Presence");
                    self.client = Some(client);
                }
            }
        }
    }

    pub fn update_presence(&mut self, track: &TrackPayload) {
        self.try_connect();

        if let Some(ref mut client) = self.client {
            let is_playing = track.is_playing.unwrap_or(false);
            let title = track.title.as_deref().unwrap_or("").trim();
            let artist = track.artist.as_deref().unwrap_or("").trim();

            if !is_playing || title.is_empty() {
                let _ = client.clear_activity();
                return;
            }

            let duration = track.duration.unwrap_or(0);
            let current = track.current_time.unwrap_or(0);

            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();

            let start_ts = if now >= current { (now - current) as i64 } else { now as i64 };
            let end_ts = if duration > current {
                start_ts + (duration as i64)
            } else {
                start_ts
            };

            let timestamps = activity::Timestamps::new()
                .start(start_ts)
                .end(end_ts);

            let assets = activity::Assets::new()
                .large_image("youtube_music")
                .large_text("YouTube Music Native");

            let mut act = activity::Activity::new()
                .details(title)
                .timestamps(timestamps)
                .assets(assets);

            if !artist.is_empty() {
                act = act.state(artist);
            }

            if client.set_activity(act).is_err() {
                // Connection might have dropped (Discord closed)
                self.client = None;
            }
        }
    }

    #[allow(dead_code)]
    pub fn clear(&mut self) {
        if let Some(ref mut client) = self.client {
            let _ = client.clear_activity();
        }
    }
}
