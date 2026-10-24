use serde::{Deserialize, Serialize};
use std::fs;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Emitter};

const CREATE_NO_WINDOW: u32 = 0x08000000;
const FFMPEG_PATH: &str = r"C:\Users\satis\AppData\Local\Programs\Python\Python312\Scripts\ffmpeg.exe";

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadRequest {
    pub download_type: String, // "song" or "playlist"
    pub url: String,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub lyrics: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadStatus {
    pub status: String, // "started", "completed", "error"
    pub message: String,
    pub title: String,
}

pub fn get_downloads_dir() -> PathBuf {
    let standard_path = PathBuf::from(r"C:\E shift\yt music\downloads");
    if standard_path.exists() {
        return standard_path;
    }

    // Try relative to workspace
    let rel_path = PathBuf::from("downloads");
    if rel_path.exists() {
        return rel_path;
    }

    let _ = fs::create_dir_all(&standard_path);
    standard_path
}

pub fn open_downloads_folder() {
    let dir = get_downloads_dir();
    let _ = Command::new("explorer.exe")
        .arg(dir.to_str().unwrap_or(r"C:\E shift\yt music\downloads"))
        .spawn();
}

pub fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '/' | '\\' | '?' | '%' | '*' | ':' | '|' | '"' | '<' | '>' => '_',
            _ => c,
        })
        .collect()
}

pub fn start_download(app: AppHandle, req: DownloadRequest) {
    tauri::async_runtime::spawn(async move {
        let downloads_dir = get_downloads_dir();
        let title = req.title.unwrap_or_else(|| "Music Track".into());
        let artist = req.artist.unwrap_or_default();
        let is_playlist = req.download_type == "playlist";

        // Convert music.youtube.com to www.youtube.com for clean yt-dlp extraction
        let mut clean_url = req.url.trim().to_string();
        if clean_url.contains("music.youtube.com") {
            clean_url = clean_url.replace("music.youtube.com", "www.youtube.com");
        }

        // Notify UI download started
        let started_msg = if is_playlist {
            format!("Downloading playlist \"{}\" (MP4)...", title)
        } else {
            format!("Downloading \"{}\" (MP4)...", title)
        };

        let _ = app.emit(
            "download_status",
            DownloadStatus {
                status: "started".into(),
                message: started_msg,
                title: title.clone(),
            },
        );

        // Save lyrics text file if lyrics were extracted from YouTube Music
        if let Some(ref lyrics_text) = req.lyrics {
            if !lyrics_text.trim().is_empty() {
                let lyrics_filename = format!(
                    "{} - Lyrics.txt",
                    sanitize_filename(&format!("{} - {}", title, artist))
                );
                let lyrics_path = downloads_dir.join(lyrics_filename);
                let _ = fs::write(lyrics_path, lyrics_text);
            }
        }

        // Setup output template for yt-dlp
        let out_template = if is_playlist {
            format!(
                r"{}\%(playlist_title,playlist)s\%(playlist_index)02d - %(title)s.%(ext)s",
                downloads_dir.display()
            )
        } else {
            format!(r"{}\%(title)s.%(ext)s", downloads_dir.display())
        };

        let mut cmd = Command::new("python");
        cmd.args(&[
            "-m",
            "yt_dlp",
            "--js-runtimes",
            "node",
            "--remote-components",
            "ejs:github",
            "-f",
            "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "--merge-output-format",
            "mp4",
            "--embed-metadata",
            "--embed-thumbnail",
            "--write-subs",
            "--write-auto-subs",
            "--sub-langs",
            "all,-live_chat",
            "--embed-subs",
            "-o",
            &out_template,
        ]);

        if Path::new(FFMPEG_PATH).exists() {
            cmd.args(&["--ffmpeg-location", FFMPEG_PATH]);
        }

        if is_playlist {
            cmd.arg("--yes-playlist");
        } else {
            cmd.arg("--no-playlist");
        }

        cmd.arg(&clean_url);
        cmd.creation_flags(CREATE_NO_WINDOW);

        match cmd.output() {
            Ok(output) => {
                if output.status.success() {
                    let success_msg = if is_playlist {
                        format!("Playlist \"{}\" downloaded successfully!", title)
                    } else {
                        format!("\"{}\" downloaded successfully!", title)
                    };

                    let _ = app.emit(
                        "download_status",
                        DownloadStatus {
                            status: "completed".into(),
                            message: success_msg,
                            title: title.clone(),
                        },
                    );
                } else {
                    let err_str = String::from_utf8_lossy(&output.stderr);
                    log::error!("yt-dlp download failed: {}", err_str);
                    let _ = app.emit(
                        "download_status",
                        DownloadStatus {
                            status: "error".into(),
                            message: format!("Download failed. Please check internet connection."),
                            title: title.clone(),
                        },
                    );
                }
            }
            Err(e) => {
                log::error!("Failed to launch yt-dlp process: {}", e);
                let _ = app.emit(
                    "download_status",
                    DownloadStatus {
                        status: "error".into(),
                        message: format!("Could not start download: {}", e),
                        title: title.clone(),
                    },
                );
            }
        }
    });
}
