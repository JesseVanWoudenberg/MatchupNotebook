// Thin Rust side. Files, HTTP, dialogs and the hotkey go through Tauri
// plugins; the League client connection lives in `league_client`. Keep app
// logic in the frontend.

mod ai;
mod league_client;

use league_client::ClientState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        // Keeps folders the user picked (like a OneDrive notebook folder)
        // inside the fs scope across restarts.
        .plugin(tauri_plugin_persisted_scope::init())
        .manage(ClientState::default())
        .invoke_handler(tauri::generate_handler![
            league_client::client_status,
            league_client::client_get,
            league_client::client_send_rune_page,
            league_client::set_champ_select_hotkey,
            league_client::open_post_game_popup,
            league_client::post_game_context,
            league_client::close_post_game_popup,
            league_client::focus_main_window,
            ai::ai_key_set,
            ai::ai_key_exists,
            ai::ai_key_delete,
            ai::ai_complete,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            league_client::start(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
