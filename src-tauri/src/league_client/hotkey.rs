//! The champ select hotkey. Registered only while champ select is on, so it
//! cannot fire in game or on the desktop.

use std::str::FromStr;

use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

use super::{HOTKEY_EVENT, MAIN_WINDOW};

pub fn validate(shortcut: &str) -> Result<(), String> {
    Shortcut::from_str(shortcut)
        .map(|_| ())
        .map_err(|error| error.to_string())
}

pub fn register(app: &AppHandle, shortcut: &str) -> Result<(), String> {
    app.global_shortcut()
        .on_shortcut(shortcut, |app, _shortcut, event| {
            if event.state != ShortcutState::Pressed {
                return;
            }
            focus_main_window(app);
            if let Err(error) = app.emit(HOTKEY_EVENT, ()) {
                log::warn!("Could not forward the hotkey: {error}");
            }
        })
        .map_err(|error| error.to_string())
}

pub fn unregister_all(app: &AppHandle) -> Result<(), String> {
    app.global_shortcut()
        .unregister_all()
        .map_err(|error| error.to_string())
}

/// Brings the notebook window up. Errors here are cosmetic, so they are logged only.
pub fn focus_main_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window(MAIN_WINDOW) else {
        return;
    };
    for result in [window.show(), window.unminimize(), window.set_focus()] {
        if let Err(error) = result {
            log::warn!("Could not focus the window: {error}");
        }
    }
}
