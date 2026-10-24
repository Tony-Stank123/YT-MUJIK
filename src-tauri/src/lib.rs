mod discord;
mod downloader;

use discord::{DiscordService, TrackPayload};
use downloader::DownloadRequest;
use std::sync::{Arc, Mutex};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Listener, Manager, WebviewUrl, WebviewWindowBuilder,
};

#[tauri::command]
fn trigger_download(app: AppHandle, req: DownloadRequest) {
    downloader::start_download(app, req);
}

#[tauri::command]
fn open_downloads_folder() {
    downloader::open_downloads_folder();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let discord_service = Arc::new(Mutex::new(DiscordService::new()));
    let discord_for_events = discord_service.clone();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![trigger_download, open_downloads_folder])
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // 1. Create Main Window with Remote URL and Injected Enhancement Script
            let target_url = url::Url::parse("https://music.youtube.com")
                .map_err(tauri::Error::InvalidUrl)?;
            let init_script = include_str!("injected.js");

            let app_handle_for_nav = app.handle().clone();
            let _window = WebviewWindowBuilder::new(app, "main", WebviewUrl::External(target_url))
                .title("YouTube Music")
                .inner_size(1360.0, 860.0)
                .min_inner_size(850.0, 550.0)
                .theme(Some(tauri::Theme::Dark))
                .initialization_script(init_script)
                .on_navigation(move |url| {
                    let host = url.host_str().unwrap_or_default();
                    if url.scheme() == "ytm-cmd" || host == "ytm-command.local" || host.ends_with(".ytm-command.local") {
                        let path = url.path().trim_start_matches('/');
                        if path == "download" {
                            if let Some(query) = url.query() {
                                for (k, v) in url::form_urlencoded::parse(query.as_bytes()) {
                                    if k == "data" {
                                        if let Ok(req) = serde_json::from_str::<DownloadRequest>(&v) {
                                            downloader::start_download(app_handle_for_nav.clone(), req);
                                        }
                                    }
                                }
                            }
                        } else if path == "open_downloads" {
                            downloader::open_downloads_folder();
                        }
                        return false;
                    }
                    true
                })
                .build()?;

            // 3. Build Tray Context Menu
            let play_pause_item = MenuItemBuilder::new("▶ / ⏸  Play / Pause")
                .id("play_pause")
                .build(app)?;

            let next_item = MenuItemBuilder::new("⏭  Next Track")
                .id("next")
                .build(app)?;

            let prev_item = MenuItemBuilder::new("⏮  Previous Track")
                .id("prev")
                .build(app)?;

            let sep1 = PredefinedMenuItem::separator(app)?;

            let dl_song_item = MenuItemBuilder::new("⬇️  Download Current Song (MP4)")
                .id("download_song")
                .build(app)?;

            let dl_playlist_item = MenuItemBuilder::new("⬇️  Download Current Playlist (MP4)")
                .id("download_playlist")
                .build(app)?;

            let open_dl_item = MenuItemBuilder::new("📂  Open Downloads Folder")
                .id("open_downloads")
                .build(app)?;

            let sep2 = PredefinedMenuItem::separator(app)?;

            let theme_amoled = MenuItemBuilder::new("🎨  Theme: AMOLED Black")
                .id("theme_amoled")
                .build(app)?;

            let theme_obsidian = MenuItemBuilder::new("🎨  Theme: Deep Obsidian")
                .id("theme_obsidian")
                .build(app)?;

            let theme_studio = MenuItemBuilder::new("🎨  Theme: Studio Matte")
                .id("theme_studio")
                .build(app)?;

            let sep3 = PredefinedMenuItem::separator(app)?;

            let show_item = MenuItemBuilder::new("🪟  Show YouTube Music")
                .id("show")
                .build(app)?;

            let quit_item = MenuItemBuilder::new("❌  Quit")
                .id("quit")
                .build(app)?;

            let tray_menu = MenuBuilder::new(app)
                .items(&[
                    &play_pause_item,
                    &next_item,
                    &prev_item,
                    &sep1,
                    &dl_song_item,
                    &dl_playlist_item,
                    &open_dl_item,
                    &sep2,
                    &theme_amoled,
                    &theme_obsidian,
                    &theme_studio,
                    &sep3,
                    &show_item,
                    &quit_item,
                ])
                .build()?;

            // 4. Build System Tray Icon
            let icon = app.default_window_icon().cloned().ok_or_else(|| {
                tauri::Error::AssetNotFound("App window icon not found".into())
            })?;

            let _tray = TrayIconBuilder::with_id("main-tray")
                .icon(icon)
                .tooltip("YouTube Music Native")
                .menu(&tray_menu)
                .on_menu_event(|app_handle, event| {
                    let maybe_window = app_handle.get_webview_window("main");
                    match event.id.as_ref() {
                        "play_pause" => {
                            if let Some(w) = maybe_window {
                                let _ = w.eval("window.__ytm_play_pause()");
                            }
                        }
                        "next" => {
                            if let Some(w) = maybe_window {
                                let _ = w.eval("window.__ytm_next()");
                            }
                        }
                        "prev" => {
                            if let Some(w) = maybe_window {
                                let _ = w.eval("window.__ytm_prev()");
                            }
                        }
                        "download_song" => {
                            if let Some(w) = maybe_window {
                                let _ = w.eval("window.__ytm_download_current_song()");
                            }
                        }
                        "download_playlist" => {
                            if let Some(w) = maybe_window {
                                let _ = w.eval("window.__ytm_download_current_playlist()");
                            }
                        }
                        "open_downloads" => {
                            downloader::open_downloads_folder();
                        }
                        "theme_amoled" => {
                            if let Some(w) = maybe_window {
                                let _ = w.eval("window.__ytm_set_theme('amoled')");
                            }
                        }
                        "theme_obsidian" => {
                            if let Some(w) = maybe_window {
                                let _ = w.eval("window.__ytm_set_theme('obsidian')");
                            }
                        }
                        "theme_studio" => {
                            if let Some(w) = maybe_window {
                                let _ = w.eval("window.__ytm_set_theme('studio')");
                            }
                        }
                        "show" => {
                            if let Some(w) = maybe_window {
                                let _ = w.show();
                                let _ = w.unminimize();
                                let _ = w.set_focus();
                            }
                        }
                        "quit" => {
                            app_handle.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            if let Ok(is_visible) = w.is_visible() {
                                if is_visible {
                                    let _ = w.hide();
                                } else {
                                    let _ = w.show();
                                    let _ = w.unminimize();
                                    let _ = w.set_focus();
                                }
                            }
                        }
                    }
                })
                .build(app)?;

            // 5. Discord Rich Presence Event Listener
            let discord_arc = discord_for_events.clone();
            app.listen("track_change", move |event| {
                if let Ok(payload) = serde_json::from_str::<TrackPayload>(event.payload()) {
                    if let Ok(mut service) = discord_arc.lock() {
                        service.update_presence(&payload);
                    }
                }
            });

            // 6. Downloader Event Listeners
            let app_handle_for_dl = app.handle().clone();
            app.listen("trigger_download", move |event| {
                if let Ok(req) = serde_json::from_str::<DownloadRequest>(event.payload()) {
                    downloader::start_download(app_handle_for_dl.clone(), req);
                }
            });

            app.listen("open_downloads_folder", move |_| {
                downloader::open_downloads_folder();
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running YouTube Music desktop application");
}
