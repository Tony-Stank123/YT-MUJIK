use serde::{Deserialize, Serialize};
use std::fs;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Emitter, Manager};

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

fn safe_js_string(s: &str) -> String {
    s.replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\'', "\\'")
        .replace('\n', " ")
        .replace('\r', "")
}

fn notify_frontend(app: &AppHandle, message: &str, status: &str, title: &str) {
    let _ = app.emit(
        "download_status",
        DownloadStatus {
            status: status.into(),
            message: message.into(),
            title: title.into(),
        },
    );

    if let Some(w) = app.get_webview_window("main") {
        let safe_msg = safe_js_string(message);
        let safe_type = match status {
            "started" => "loading",
            "completed" => "success",
            "error" => "error",
            _ => "info",
        };
        let js = format!(
            "if (window.__ytm_show_toast) window.__ytm_show_toast(\"{}\", \"{}\");",
            safe_msg, safe_type
        );
        let _ = w.eval(&js);
    }
}

pub fn start_download(app: AppHandle, req: DownloadRequest) {
    tauri::async_runtime::spawn(async move {
        let downloads_dir = get_downloads_dir();
        let mut title = req.title.unwrap_or_else(|| "Music Track".into()).trim().to_string();
        if title.is_empty() {
            title = "Music Track".to_string();
        }
        let artist = req.artist.unwrap_or_default().trim().to_string();
        let is_playlist = req.download_type == "playlist";

        // Convert music.youtube.com to www.youtube.com
        let mut clean_url = req.url.trim().to_string();
        if clean_url.contains("music.youtube.com") {
            clean_url = clean_url.replace("music.youtube.com", "www.youtube.com");
        }

        // For single song downloads, strictly strip any playlist/queue parameters (&list=... or &index=...)
        if !is_playlist {
            if let Some(idx) = clean_url.find("&list=") {
                clean_url = clean_url[..idx].to_string();
            }
            if let Some(idx) = clean_url.find("?list=") {
                if clean_url.contains("/watch") {
                    clean_url = clean_url[..idx].to_string();
                }
            }

            // CRITICAL SAFEGUARD: If URL is root youtube.com, empty, or lacks video id, fallback to search!
            if clean_url == "https://www.youtube.com"
                || clean_url == "https://www.youtube.com/"
                || clean_url.is_empty()
                || (!clean_url.contains("watch?v=") && !clean_url.contains("youtu.be/") && !clean_url.starts_with("ytsearch1:"))
            {
                if !title.is_empty() && title != "Music Track" && title != "Current Song" {
                    let search_term = if !artist.is_empty() {
                        format!("{} {}", title, artist)
                    } else {
                        title.clone()
                    };
                    clean_url = format!("ytsearch1:{}", search_term);
                    log::info!("Falling back to search query for single song download: {}", clean_url);
                } else {
                    log::warn!("Cannot start single song download: no song is currently playing or selected.");
                    notify_frontend(&app, "⚠️ No song is currently playing. Start a song first!", "error", &title);
                    return;
                }
            }
        }

        log::info!("Starting [{}] download: \"{}\" -> {}", if is_playlist { "PLAYLIST" } else { "SONG" }, title, clean_url);

        let started_msg = if is_playlist {
            format!("Downloading playlist \"{}\" (MP4)...", title)
        } else {
            format!("Downloading \"{}\" (MP4)...", title)
        };
        notify_frontend(&app, &started_msg, "started", &title);

        // Save lyrics text file if available
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
                let stdout_str = String::from_utf8_lossy(&output.stdout);
                let stderr_str = String::from_utf8_lossy(&output.stderr);

                // If single song download yielded 0 items, retry with ytsearch1
                if !is_playlist && stdout_str.contains("Downloading 0 items") && !clean_url.starts_with("ytsearch1:") {
                    log::warn!("Download yielded 0 items. Retrying with ytsearch1 for single song: {}", title);
                    let search_term = if !artist.is_empty() {
                        format!("{} {}", title, artist)
                    } else {
                        title.clone()
                    };
                    let retry_url = format!("ytsearch1:{}", search_term);

                    let mut retry_cmd = Command::new("python");
                    retry_cmd.args(&[
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
                        "-o",
                        &out_template,
                        "--no-playlist",
                    ]);
                    if Path::new(FFMPEG_PATH).exists() {
                        retry_cmd.args(&["--ffmpeg-location", FFMPEG_PATH]);
                    }
                    retry_cmd.arg(&retry_url);
                    retry_cmd.creation_flags(CREATE_NO_WINDOW);

                    if let Ok(retry_output) = retry_cmd.output() {
                        if retry_output.status.success() {
                            let success_msg = format!("\"{}\" downloaded successfully!", title);
                            notify_frontend(&app, &success_msg, "completed", &title);
                            return;
                        }
                    }
                }

                if output.status.success() {
                    let success_msg = if is_playlist {
                        format!("Playlist \"{}\" downloaded successfully!", title)
                    } else {
                        format!("\"{}\" downloaded successfully!", title)
                    };
                    notify_frontend(&app, &success_msg, "completed", &title);
                } else {
                    log::error!("yt-dlp download failed: {}", stderr_str);
                    notify_frontend(&app, "Download failed. Please check internet connection.", "error", &title);
                }
            }
            Err(e) => {
                log::error!("Failed to launch yt-dlp process: {}", e);
                notify_frontend(&app, &format!("Could not launch downloader: {}", e), "error", &title);
            }
        }
    });
}
