# YouTube Music Native Desktop Client 🎵

A hyper-lightweight, high-performance native desktop application for **YouTube Music** built with **Rust** and **Tauri v2**. Designed from the ground up for minimal RAM consumption (~50-80 MB), uninterrupted privacy, zero ads, full Google Account sync, and beautiful dark themes.

---

## ✨ Features

- **🚀 Ultra-Low RAM Consumption & Blazing Speed**
  - Powered by Tauri v2 and Windows native Evergreen WebView2 runtime.
  - Sits at ~50–80 MB of RAM (compared to Electron-based wrappers which consume 500–900+ MB).
  - Starts up instantly in under 0.5 seconds.

- **🛡️ Built-in Privacy & Network Ad-Blocker**
  - Intercepts and blocks tracking endpoints, Google DoubleClick, telemetry, and promo networks before they load.
  - Automatically fast-forwards and skips in-video ads with intelligent audio-burst dampening.
  - Completely hides promotional banners, upsell cards, and trial prompts via injected CSS.
  - Automatically auto-confirms *"Still listening?"* and *"Video paused"* prompts so your music plays continuously without interruption.

- **🎨 Multi-Dark Theme Engine**
  - **AMOLED Pure Black (`#000000`)**: True black background with zero OLED glow, perfect for OLED screens and dark rooms.
  - **Deep Obsidian (`#08090d`)**: Modern glassmorphism player bar with blur effects and glowing red accents.
  - **Studio Matte (`#161619`)**: Refined carbon graphite finish for a sleek desktop experience.
  - Quick-switch anytime using the interactive theme pill in the top navigation bar or through the system tray context menu.

- **🔑 100% YouTube Music Feature Parity & Google Account Sync**
  - Uses an isolated persistent WebView2 storage profile.
  - Sign into your Google Account once with full support for 2FA, Security Keys, and Google Authenticator.
  - Access all your personal playlists, liked songs, listen again feeds, radio stations, podcasts, synced lyrics, and uploads.

- **📥 System Tray Minimization & Background Playback**
  - Closing the app (`X`) minimizes to the Windows System Tray instead of stopping playback.
  - Tray context menu provides quick controls:
    - ▶ / ⏸ Play / Pause
    - ⏭ Next Track
    - ⏮ Previous Track
    - 🎨 Quick Theme Switcher
    - 🪟 Show / Hide
    - ❌ Quit
  - Left-clicking the tray icon toggles the app window.

- **🎮 Discord Rich Presence**
  - Automatically updates your Discord profile with:
    - *"Listening to YouTube Music"*
    - Current track title & artist name
    - Playback progress bar with live time elapsed and remaining
    - Official high-resolution YouTube Music art assets

- **🎛️ Windows System Media Transport Controls (SMTC)**
  - Full hardware media keys support (Play/Pause, Next Track, Prev Track).
  - Windows volume overlay displays song title, artist, and album artwork.

---

## 🚀 How to Launch

1. **Quick Launch:**
   Double-click `launch.bat` in this folder, or run:
   ```powershell
   .\launch.bat
   ```

2. **Direct Binary Execution:**
   - Release: `src-tauri\target\release\youtube-music.exe`
   - Debug: `src-tauri\target\debug\youtube-music.exe`

---

## 🛠️ Build Commands

To build from source using Cargo:

```powershell
# Development build
cargo build --manifest-path src-tauri/Cargo.toml

# Optimized release binary
cargo build --release --manifest-path src-tauri/Cargo.toml
```
