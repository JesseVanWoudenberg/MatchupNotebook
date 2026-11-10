//! Keeps one WebSocket to the client open and forwards what it says. Every
//! failure here is silent by design: the status dot is the only signal.

use std::time::Duration;

use futures_util::{SinkExt, StreamExt};
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager};
use tokio::net::TcpStream;
use tokio_tungstenite::{
    Connector, MaybeTlsStream, WebSocketStream, connect_async_tls_with_config,
    tungstenite::{
        Message,
        client::ClientRequestBuilder,
        handshake::client::Response,
        http::{Uri, uri::InvalidUri},
    },
};

use super::{
    CHAMP_SELECT_EVENT, ClientState,
    http::LcuHttp,
    lockfile::{Lockfile, read_lockfile},
};

const RETRY: Duration = Duration::from_secs(3);
const PHASE_URI: &str = "/lol-gameflow/v1/gameflow-phase";
const CHAMP_SELECT_URI: &str = "/lol-champ-select/v1/session";
const SUBSCRIPTIONS: [&str; 2] = [
    "OnJsonApiEvent_lol-gameflow_v1_gameflow-phase",
    "OnJsonApiEvent_lol-champ-select_v1_session",
];
const SUBSCRIBE_OPCODE: u8 = 5;

type Socket = WebSocketStream<MaybeTlsStream<TcpStream>>;

/// Runs for the life of the app: wait for a lockfile, connect, forward
/// events until the socket drops, then start over.
pub async fn run(app: AppHandle) {
    loop {
        if let Some(lock) = read_lockfile() {
            match session(&app, &lock).await {
                Ok(()) => log::info!("League client connection closed"),
                Err(error) => log::debug!("League client not reachable: {error}"),
            }
            app.state::<ClientState>().disconnected(&app);
        }
        tokio::time::sleep(RETRY).await;
    }
}

async fn session(app: &AppHandle, lock: &Lockfile) -> Result<(), String> {
    let (stream, _response) = connect(lock).await?;
    let (mut write, mut read) = stream.split();
    for event in SUBSCRIPTIONS {
        let subscribe = format!("[{SUBSCRIBE_OPCODE}, \"{event}\"]");
        write
            .send(Message::Text(subscribe.into()))
            .await
            .map_err(|error| error.to_string())?;
    }

    let http = LcuHttp::new(lock)?;
    let state = app.state::<ClientState>();
    state.connected(app, http.clone());

    // Events only report changes, so read where the client is right now.
    match http.get(PHASE_URI).await {
        Ok(phase) => state.phase_changed(app, &phase),
        Err(error) => log::debug!("Could not read the gameflow phase: {error}"),
    }
    match http.get_or_none(CHAMP_SELECT_URI).await {
        Ok(session) => emit_champ_select(app, session.unwrap_or(Value::Null)),
        Err(error) => log::debug!("Could not read champ select: {error}"),
    }

    while let Some(message) = read.next().await {
        match message.map_err(|error| error.to_string())? {
            Message::Text(text) => handle_event(app, &state, text.as_str()),
            Message::Close(_) => break,
            _ => {}
        }
    }
    Ok(())
}

async fn connect(lock: &Lockfile) -> Result<(Socket, Response), String> {
    let tls = native_tls::TlsConnector::builder()
        .danger_accept_invalid_certs(true)
        .danger_accept_invalid_hostnames(true)
        .build()
        .map_err(|error| error.to_string())?;
    let uri: Uri = format!("wss://127.0.0.1:{}/", lock.port)
        .parse()
        .map_err(|error: InvalidUri| error.to_string())?;
    let request =
        ClientRequestBuilder::new(uri).with_header("Authorization", basic_auth(&lock.password));
    connect_async_tls_with_config(request, None, false, Some(Connector::NativeTls(tls)))
        .await
        .map_err(|error| error.to_string())
}

fn basic_auth(password: &str) -> String {
    use base64::Engine;
    let credentials = base64::engine::general_purpose::STANDARD.encode(format!("riot:{password}"));
    format!("Basic {credentials}")
}

/// Events arrive as `[8, "OnJsonApiEvent_…", { "data": …, "eventType": "Update", "uri": "/lol-…" }]`.
fn handle_event(app: &AppHandle, state: &ClientState, text: &str) {
    let Ok(Value::Array(parts)) = serde_json::from_str::<Value>(text) else {
        return;
    };
    let Some(payload) = parts.get(2) else {
        return;
    };
    let uri = payload.get("uri").and_then(Value::as_str).unwrap_or_default();
    let data = payload.get("data").cloned().unwrap_or(Value::Null);
    let deleted = payload.get("eventType").and_then(Value::as_str) == Some("Delete");
    match uri {
        PHASE_URI => state.phase_changed(app, &data),
        CHAMP_SELECT_URI => emit_champ_select(app, if deleted { Value::Null } else { data }),
        _ => {}
    }
}

fn emit_champ_select(app: &AppHandle, session: Value) {
    if let Err(error) = app.emit(CHAMP_SELECT_EVENT, session) {
        log::warn!("Could not forward champ select: {error}");
    }
}
