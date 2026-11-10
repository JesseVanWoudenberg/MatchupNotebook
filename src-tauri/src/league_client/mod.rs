//! League client integration. Read-only, except `client_send_rune_page`.
//! Client errors never reach the user as a message: the status dot is the
//! only signal, and the log keeps the detail.

mod hotkey;
mod http;
pub mod lockfile;
mod popup;
mod runes;
mod socket;

use std::sync::{Mutex, MutexGuard, PoisonError};

use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Emitter, State};

use http::LcuHttp;
pub use runes::{RunePageInput, SendOutcome};

pub const MAIN_WINDOW: &str = "main";
pub const STATUS_EVENT: &str = "league-client:status";
pub const PHASE_EVENT: &str = "league-client:phase";
pub const CHAMP_SELECT_EVENT: &str = "league-client:champ-select";
pub const HOTKEY_EVENT: &str = "league-client:hotkey";
pub const CHAMP_SELECT_PHASE: &str = "ChampSelect";
pub const DEFAULT_HOTKEY: &str = "CommandOrControl+Shift+M";
const NOT_CONNECTED: &str = "The League client is not running.";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientStatus {
    pub connected: bool,
    pub phase: String,
}

struct Inner {
    http: Option<LcuHttp>,
    phase: String,
    hotkey: String,
    hotkey_active: bool,
    post_game: Option<Value>,
}

impl Default for Inner {
    fn default() -> Self {
        Self {
            http: None,
            phase: String::new(),
            hotkey: DEFAULT_HOTKEY.to_string(),
            hotkey_active: false,
            post_game: None,
        }
    }
}

#[derive(Default)]
pub struct ClientState {
    inner: Mutex<Inner>,
}

impl ClientState {
    fn lock(&self) -> MutexGuard<'_, Inner> {
        self.inner.lock().unwrap_or_else(PoisonError::into_inner)
    }

    pub fn status(&self) -> ClientStatus {
        let inner = self.lock();
        ClientStatus {
            connected: inner.http.is_some(),
            phase: inner.phase.clone(),
        }
    }

    fn http(&self) -> Option<LcuHttp> {
        self.lock().http.clone()
    }

    fn connected(&self, app: &AppHandle, http: LcuHttp) {
        self.lock().http = Some(http);
        self.emit_status(app);
    }

    fn disconnected(&self, app: &AppHandle) {
        {
            let mut inner = self.lock();
            if inner.http.is_none() && inner.phase.is_empty() {
                return;
            }
            inner.http = None;
            inner.phase.clear();
        }
        self.sync_hotkey(app);
        self.emit_status(app);
        emit(app, PHASE_EVENT, "");
    }

    fn phase_changed(&self, app: &AppHandle, phase: &Value) {
        let phase = phase.as_str().unwrap_or_default().to_string();
        self.lock().phase.clone_from(&phase);
        self.sync_hotkey(app);
        emit(app, PHASE_EVENT, phase);
    }

    /// The hotkey exists only while champ select is on.
    fn sync_hotkey(&self, app: &AppHandle) {
        let (wanted, shortcut, active) = {
            let inner = self.lock();
            (
                inner.phase == CHAMP_SELECT_PHASE,
                inner.hotkey.clone(),
                inner.hotkey_active,
            )
        };
        if wanted == active {
            return;
        }
        let result = if wanted {
            hotkey::register(app, &shortcut)
        } else {
            hotkey::unregister_all(app)
        };
        match result {
            Ok(()) => self.lock().hotkey_active = wanted,
            Err(error) => log::warn!("Could not change the champ select hotkey: {error}"),
        }
    }

    fn set_hotkey(&self, app: &AppHandle, shortcut: &str) -> Result<(), String> {
        hotkey::validate(shortcut)?;
        let was_active = {
            let mut inner = self.lock();
            inner.hotkey = shortcut.to_string();
            inner.hotkey_active
        };
        if was_active {
            hotkey::unregister_all(app)?;
            self.lock().hotkey_active = false;
            self.sync_hotkey(app);
        }
        Ok(())
    }

    fn emit_status(&self, app: &AppHandle) {
        emit(app, STATUS_EVENT, self.status());
    }
}

fn emit<T: Serialize + Clone>(app: &AppHandle, event: &str, payload: T) {
    if let Err(error) = app.emit(event, payload) {
        log::warn!("Could not emit {event}: {error}");
    }
}

/// Starts the connection loop. Call once from setup.
pub fn start(app: AppHandle) {
    tauri::async_runtime::spawn(socket::run(app));
}

#[tauri::command]
pub fn client_status(state: State<'_, ClientState>) -> ClientStatus {
    state.status()
}

/// A read-only GET against the client API, for the frontend to parse.
#[tauri::command]
pub async fn client_get(path: String, state: State<'_, ClientState>) -> Result<Value, String> {
    if !path.starts_with('/') {
        return Err("The path must start with a slash.".to_string());
    }
    let http = state.http().ok_or_else(|| NOT_CONNECTED.to_string())?;
    http.get(&path).await
}

#[tauri::command]
pub async fn client_send_rune_page(
    page: RunePageInput,
    state: State<'_, ClientState>,
) -> Result<SendOutcome, String> {
    let http = state.http().ok_or_else(|| NOT_CONNECTED.to_string())?;
    runes::send_rune_page(&http, &page).await
}

#[tauri::command]
pub async fn set_champ_select_hotkey(
    shortcut: String,
    app: AppHandle,
    state: State<'_, ClientState>,
) -> Result<(), String> {
    state.set_hotkey(&app, &shortcut)
}

#[tauri::command]
pub async fn open_post_game_popup(
    context: Value,
    app: AppHandle,
    state: State<'_, ClientState>,
) -> Result<(), String> {
    state.lock().post_game = Some(context);
    popup::open(&app)
}

/// What the popup should show, as handed over by the main window.
#[tauri::command]
pub fn post_game_context(state: State<'_, ClientState>) -> Option<Value> {
    state.lock().post_game.clone()
}

#[tauri::command]
pub async fn close_post_game_popup(app: AppHandle) -> Result<(), String> {
    popup::close(&app)
}

#[tauri::command]
pub async fn focus_main_window(app: AppHandle) -> Result<(), String> {
    hotkey::focus_main_window(&app);
    Ok(())
}
