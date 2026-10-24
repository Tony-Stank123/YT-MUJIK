@echo off
title YouTube Music Native Desktop
cd /d "%~dp0"

if exist "src-tauri\target\release\youtube-music.exe" (
    start "" "src-tauri\target\release\youtube-music.exe"
    exit /b 0
)

if exist "src-tauri\target\debug\youtube-music.exe" (
    start "" "src-tauri\target\debug\youtube-music.exe"
    exit /b 0
)

echo Building YouTube Music Native...
cargo build --release --manifest-path "src-tauri\Cargo.toml"
start "" "src-tauri\target\release\youtube-music.exe"
