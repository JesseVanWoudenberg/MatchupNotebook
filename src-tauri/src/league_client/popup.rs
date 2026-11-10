//! The post-game popup: a small always-on-top window in the corner of the
//! primary screen that never takes focus. The frontend decides what it says.

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

pub const POPUP_WINDOW: &str = "post-game";
const POPUP_URL: &str = "index.html#/post-game";
const WIDTH: f64 = 380.0;
const HEIGHT: f64 = 168.0;
const MARGIN: f64 = 16.0;

pub fn open(app: &AppHandle) -> Result<(), String> {
    if let Some(existing) = app.get_webview_window(POPUP_WINDOW) {
        return existing.show().map_err(|error| error.to_string());
    }
    let mut builder =
        WebviewWindowBuilder::new(app, POPUP_WINDOW, WebviewUrl::App(POPUP_URL.into()))
            .title("Game over")
            .inner_size(WIDTH, HEIGHT)
            .resizable(false)
            .decorations(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .focused(false);
    if let Ok(Some(monitor)) = app.primary_monitor() {
        // Bottom-right of the work area, above the taskbar, in logical pixels.
        let scale = monitor.scale_factor();
        let area = monitor.work_area();
        let right = (area.position.x as f64 + area.size.width as f64) / scale;
        let bottom = (area.position.y as f64 + area.size.height as f64) / scale;
        builder = builder.position(right - WIDTH - MARGIN, bottom - HEIGHT - MARGIN);
    }
    builder
        .build()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

pub fn close(app: &AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(POPUP_WINDOW) {
        window.close().map_err(|error| error.to_string())?;
    }
    Ok(())
}
