@echo off
title YouTube Music Native Desktop
cd /d "%~dp0"

if "%1"=="--kill" goto kill
if "%1"=="--restart" goto restart
if "%1"=="--rebuild" goto build
if "%1"=="-r" goto build

if exist "src-tauri\target\release\youtube-music.exe" (
    start "" "src-tauri\target\release\youtube-music.exe"
    exit /b 0
)

if exist "src-tauri\target\debug\youtube-music.exe" (
    start "" "src-tauri\target\debug\youtube-music.exe"
    exit /b 0
)

:build
echo Building YouTube Music Native...
cargo build --release --manifest-path "src-tauri\Cargo.toml"
start "" "src-tauri\target\release\youtube-music.exe"
exit /b 0

:kill
echo Stopping YouTube Music...
taskkill /F /IM youtube-music.exe 2>nul
exit /b 0

:restart
echo Restarting YouTube Music...
taskkill /F /IM youtube-music.exe 2>nul
timeout /t 1 /nobreak >nul
goto build
