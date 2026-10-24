use serde::{Deserialize, Serialize};
use std::fs;
use std::os::windows::process::CommandExt;
use std::path::PathBuf;
use std::process::Command;
use tauri::{AppHandle, Emitter, Manager};

const CREATE_NO_WINDOW: u32 = 0x08000000;

pub fn get_ffmpeg_path() -> Option<PathBuf> {
    let local_paths = [
        PathBuf::from(r"C:\E shift\yt music\bin\ffmpeg.exe"),
        PathBuf::from("bin/ffmpeg.exe"),
        PathBuf::from("ffmpeg.exe"),
    ];
    for p in &local_paths {
        if p.exists() {
            return Some(p.clone());
        }
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let p1 = exe_dir.join("bin").join("ffmpeg.exe");
            if p1.exists() {
                return Some(p1);
            }
            let p2 = exe_dir.join("ffmpeg.exe");
            if p2.exists() {
                return Some(p2);
            }
        }
    }

    let sfd = PathBuf::from(r"C:\Program Files\Softdeluxe\Free Download Manager\ffmpeg.exe");
    if sfd.exists() {
        return Some(sfd);
    }

    let wand = PathBuf::from(r"C:\Users\satis\AppData\Local\Wand\app-12.26.1\resources\app.asar.unpacked\static\unpacked\capture\release\bin\64bit\ffmpeg.exe");
    if wand.exists() {
        return Some(wand);
    }

    None
}

pub fn create_ytdlp_command() -> Command {
    let local_paths = [
        PathBuf::from(r"C:\E shift\yt music\bin\yt-dlp.exe"),
        PathBuf::from("bin/yt-dlp.exe"),
        PathBuf::from("yt-dlp.exe"),
        PathBuf::from(r"C:\Users\satis\AppData\Local\Programs\Python\Python312\Scripts\yt-dlp.exe"),
    ];
    for p in &local_paths {
        if p.exists() {
            return Command::new(p);
        }
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let p1 = exe_dir.join("bin").join("yt-dlp.exe");
            if p1.exists() {
                return Command::new(p1);
            }
            let p2 = exe_dir.join("yt-dlp.exe");
            if p2.exists() {
                return Command::new(p2);
            }
        }
    }

    let python_paths = [
        PathBuf::from(r"C:\Users\satis\AppData\Local\Programs\Python\Python312\python.exe"),
    ];
    for p in &python_paths {
        if p.exists() {
            let mut cmd = Command::new(p);
            cmd.args(&["-m", "yt_dlp"]);
            return cmd;
        }
    }

    let mut cmd = Command::new("python");
    cmd.args(&["-m", "yt_dlp"]);
    cmd
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadRequest {
    #[serde(default)]
    pub download_type: Option<String>, // "song" or "playlist"
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub artist: Option<String>,
    #[serde(default)]
    pub lyrics: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadStatus {
    pub status: String, // "started", "completed", "error"
    pub message: String,
    pub title: String,
}

pub fn log_to_file(msg: &str) {
    use std::io::Write;
    let log_path = PathBuf::from(r"C:\E shift\yt music\app_debug.log");
    if let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(log_path) {
        let _ = writeln!(file, "[{}] {}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0), msg);
    }
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
    log_to_file(&format!("Opening downloads folder: {:?}", dir));
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
    log_to_file(&format!("[NOTIFY FRONTEND] status: {}, msg: {}, title: {}", status, message, title));
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
            "if (window.__ytm_show_toast) {{ window.__ytm_show_toast(\"{}\", \"{}\"); }} else if (window.showToast) {{ window.showToast(\"{}\", \"{}\"); }}",
            safe_msg, safe_type, safe_msg, safe_type
        );
        let _ = w.eval(&js);
    }
}

pub fn start_download(app: AppHandle, req: DownloadRequest) {
    tauri::async_runtime::spawn(async move {
        let downloads_dir = get_downloads_dir();
        let mut title = req.title.unwrap_or_default().trim().to_string();
        let artist = req.artist.unwrap_or_default().trim().to_string();
        let is_playlist = req.download_type.as_deref() == Some("playlist");

        let mut raw_url = req.url.unwrap_or_default().trim().to_string();
        if raw_url.contains("music.youtube.com") {
            raw_url = raw_url.replace("music.youtube.com", "www.youtube.com");
        }

        log_to_file(&format!("[START DOWNLOAD] type: {}, raw_url: {}, title: {}, artist: {}", if is_playlist { "playlist" } else { "song" }, raw_url, title, artist));

        let mut clean_url = raw_url.clone();
        if !is_playlist {
            if let Some(idx) = clean_url.find("&list=") {
                clean_url = clean_url[..idx].to_string();
            }
            if let Some(idx) = clean_url.find("?list=") {
                if clean_url.contains("/watch") {
                    clean_url = clean_url[..idx].to_string();
                }
            }

            // If URL lacks video id or is invalid, fallback to search using title & artist
            if clean_url.is_empty()
                || clean_url == "https://www.youtube.com"
                || clean_url == "https://www.youtube.com/"
                || (!clean_url.contains("watch?v=") && !clean_url.contains("youtu.be/") && !clean_url.starts_with("ytsearch1:"))
            {
                if !title.is_empty() && title != "Music Track" && title != "Current Song" {
                    let search_term = if !artist.is_empty() {
                        format!("{} {}", title, artist)
                    } else {
                        title.clone()
                    };
                    clean_url = format!("ytsearch1:{}", search_term);
                    log_to_file(&format!("[FALLBACK TO SEARCH] {}", clean_url));
                } else {
                    log_to_file("[WARN] No title or valid URL provided");
                    notify_frontend(&app, "⚠️ Please play or click a song to download!", "error", &title);
                    return;
                }
            }
        }

        if title.is_empty() {
            title = if is_playlist { "Playlist".to_string() } else { "Music Track".to_string() };
        }

        let started_msg = if is_playlist {
            format!("Downloading playlist \"{}\" in MP4 format...", title)
        } else {
            format!("Downloading \"{}\" in MP4 format...", title)
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

        let mut cmd = create_ytdlp_command();
        cmd.args(&[
            "-f",
            "bestvideo[vcodec^=avc1][ext=mp4]+bestaudio[ext=m4a]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "--merge-output-format",
            "mp4",
            "--embed-metadata",
            "--embed-thumbnail",
            "-o",
            &out_template,
        ]);

        if let Some(ref ffmpeg_path) = get_ffmpeg_path() {
            cmd.args(&["--ffmpeg-location", ffmpeg_path.to_str().unwrap_or_default()]);
        }

        let node_path = PathBuf::from(r"C:\Program Files\nodejs\node.exe");
        if node_path.exists() {
            cmd.args(&["--js-runtimes", &format!("node:{}", node_path.display())]);
        }

        if is_playlist {
            cmd.arg("--yes-playlist");
        } else {
            cmd.arg("--no-playlist");
        }

        cmd.arg(&clean_url);
        cmd.creation_flags(CREATE_NO_WINDOW);

        log_to_file(&format!("[EXECUTE COMMAND] args: {:?}", cmd));

        match cmd.output() {
            Ok(output) => {
                let stdout_str = String::from_utf8_lossy(&output.stdout);
                let stderr_str = String::from_utf8_lossy(&output.stderr);
                log_to_file(&format!("[YTDLP RESULT] exit_code: {:?}, stdout len: {}, stderr len: {}", output.status.code(), stdout_str.len(), stderr_str.len()));

                // If single song download yielded 0 items, retry with ytsearch1
                if !is_playlist && stdout_str.contains("Downloading 0 items") && !clean_url.starts_with("ytsearch1:") {
                    log_to_file(&format!("[RETRY WITH SEARCH] for title: {}", title));
                    let search_term = if !artist.is_empty() {
                        format!("{} {}", title, artist)
                    } else {
                        title.clone()
                    };
                    let retry_url = format!("ytsearch1:{}", search_term);

                    let mut retry_cmd = create_ytdlp_command();
                    retry_cmd.args(&[
                        "-f",
                        "bestvideo[vcodec^=avc1][ext=mp4]+bestaudio[ext=m4a]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
                        "--merge-output-format",
                        "mp4",
                        "--embed-metadata",
                        "--embed-thumbnail",
                        "-o",
                        &out_template,
                        "--no-playlist",
                    ]);
                    if let Some(ref ffmpeg_path) = get_ffmpeg_path() {
                        retry_cmd.args(&["--ffmpeg-location", ffmpeg_path.to_str().unwrap_or_default()]);
                    }
                    if node_path.exists() {
                        retry_cmd.args(&["--js-runtimes", &format!("node:{}", node_path.display())]);
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
                    log_to_file(&format!("[YTDLP ERROR] {}", stderr_str));
                    notify_frontend(&app, "Download failed. Please check internet connection.", "error", &title);
                }
            }
            Err(e) => {
                log_to_file(&format!("[YTDLP LAUNCH ERROR] {}", e));
                notify_frontend(&app, &format!("Could not launch downloader: {}", e), "error", &title);
            }
        }
    });
}
