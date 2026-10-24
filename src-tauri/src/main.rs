// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use single_instance::SingleInstance;

fn main() {
    let instance = match SingleInstance::new("com.youtube.music.native.app.lock") {
        Ok(inst) => inst,
        Err(_) => {
            app_lib::run();
            return;
        }
    };

    if !instance.is_single() {
        // Another instance is already running. Focus existing window and exit cleanly.
        #[cfg(target_os = "windows")]
        {
            let _ = std::process::Command::new("powershell")
                .args(&[
                    "-NoProfile",
                    "-Command",
                    "$wshell = New-Object -ComObject wscript.shell; $wshell.AppActivate('YouTube Music')",
                ])
                .creation_flags(0x08000000)
                .spawn();
        }
        return;
    }

    app_lib::run();
}
