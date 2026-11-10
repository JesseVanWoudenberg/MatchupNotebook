//! The AI add-on's Rust half: the API key in the operating system's
//! credential store, and the HTTP call. The webview builds the prompt and
//! reads the answer, and never sees the key.

use std::time::Duration;

use serde::Deserialize;
use serde_json::{Value, json};
use tauri::AppHandle;
use tauri_plugin_http::reqwest::{Client, Response, StatusCode};

const ANTHROPIC_URL: &str = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION: &str = "2023-06-01";
/// Lets the API re-run a declined request on a fallback model inside the same call.
const ANTHROPIC_BETAS: &str = "server-side-fallback-2026-07-01";
const MAX_OUTPUT_TOKENS: u32 = 8192;
const TIMEOUT: Duration = Duration::from_secs(120);
const NO_KEY: &str = "Add an API key in Settings first.";

fn entry(app: &AppHandle, provider: &str) -> Result<keyring::Entry, String> {
    let service = app.config().identifier.clone();
    keyring::Entry::new(&service, provider).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn ai_key_set(provider: String, key: String, app: AppHandle) -> Result<(), String> {
    let key = key.trim();
    if key.is_empty() {
        return Err("The key is empty.".to_string());
    }
    entry(&app, &provider)?
        .set_password(key)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn ai_key_exists(provider: String, app: AppHandle) -> Result<bool, String> {
    match entry(&app, &provider)?.get_password() {
        Ok(_) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
pub fn ai_key_delete(provider: String, app: AppHandle) -> Result<(), String> {
    match entry(&app, &provider)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

fn read_key(app: &AppHandle, provider: &str) -> Result<Option<String>, String> {
    match entry(app, provider)?.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiCompletion {
    pub provider: String,
    pub model: String,
    pub base_url: String,
    pub system: String,
    pub user: String,
}

/// One prompt in, the provider's text out. Errors come back as plain
/// sentences the review screen can show next to a retry button.
#[tauri::command]
pub async fn ai_complete(request: AiCompletion, app: AppHandle) -> Result<String, String> {
    let key = read_key(&app, &request.provider)?;
    let client = Client::builder()
        .timeout(TIMEOUT)
        .build()
        .map_err(|error| error.to_string())?;
    match request.provider.as_str() {
        "anthropic" => complete_anthropic(&client, &key.ok_or_else(|| NO_KEY.to_string())?, &request).await,
        "openai_compatible" => complete_openai_compatible(&client, key.as_deref(), &request).await,
        other => Err(format!("Unknown AI provider: {other}.")),
    }
}

async fn complete_anthropic(client: &Client, key: &str, request: &AiCompletion) -> Result<String, String> {
    let body = json!({
        "model": request.model,
        "max_tokens": MAX_OUTPUT_TOKENS,
        "system": request.system,
        "messages": [{ "role": "user", "content": request.user }],
        "output_config": { "effort": "medium" },
        "fallbacks": "default",
    });
    let response = client
        .post(ANTHROPIC_URL)
        .header("x-api-key", key)
        .header("anthropic-version", ANTHROPIC_VERSION)
        .header("anthropic-beta", ANTHROPIC_BETAS)
        .header("content-type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .map_err(describe_network_error)?;
    let answer = read_json(response).await?;

    match answer.get("stop_reason").and_then(Value::as_str) {
        Some("refusal") => return Err("The AI declined this request.".to_string()),
        Some("max_tokens") => return Err("The answer was cut off. Try a shorter review.".to_string()),
        _ => {}
    }
    let text: String = answer
        .get("content")
        .and_then(Value::as_array)
        .map(|blocks| {
            blocks
                .iter()
                .filter(|block| block.get("type").and_then(Value::as_str) == Some("text"))
                .filter_map(|block| block.get("text").and_then(Value::as_str))
                .collect::<Vec<_>>()
                .join("")
        })
        .unwrap_or_default();
    if text.trim().is_empty() {
        return Err("The AI sent an empty answer.".to_string());
    }
    Ok(text)
}

async fn complete_openai_compatible(
    client: &Client,
    key: Option<&str>,
    request: &AiCompletion,
) -> Result<String, String> {
    let base = request.base_url.trim().trim_end_matches('/');
    if base.is_empty() {
        return Err("Set the server address in Settings first.".to_string());
    }
    let body = json!({
        "model": request.model,
        "messages": [
            { "role": "system", "content": request.system },
            { "role": "user", "content": request.user },
        ],
    });
    let mut builder = client
        .post(format!("{base}/chat/completions"))
        .header("content-type", "application/json")
        .body(body.to_string());
    if let Some(key) = key.filter(|key| !key.is_empty()) {
        builder = builder.header("authorization", format!("Bearer {key}"));
    }
    let response = builder.send().await.map_err(describe_network_error)?;
    let answer = read_json(response).await?;
    let text = answer
        .pointer("/choices/0/message/content")
        .and_then(Value::as_str)
        .unwrap_or_default();
    if text.trim().is_empty() {
        return Err("The AI sent an empty answer.".to_string());
    }
    Ok(text.to_string())
}

async fn read_json(response: Response) -> Result<Value, String> {
    let status = response.status();
    let text = response.text().await.map_err(|error| error.to_string())?;
    let value: Value = serde_json::from_str(&text).unwrap_or(Value::Null);
    if status.is_success() {
        return Ok(value);
    }
    let detail = value
        .pointer("/error/message")
        .and_then(Value::as_str)
        .map(str::to_string)
        .unwrap_or_else(|| text.chars().take(200).collect());
    Err(match status {
        StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => "The API key was not accepted.".to_string(),
        StatusCode::NOT_FOUND => format!("Not found. Check the model name and server address. {detail}"),
        StatusCode::TOO_MANY_REQUESTS => "Too many requests. Wait a moment and try again.".to_string(),
        status if status.is_server_error() => "The provider is busy. Try again in a moment.".to_string(),
        status => format!("{status}: {detail}"),
    })
}

fn describe_network_error(error: tauri_plugin_http::reqwest::Error) -> String {
    if error.is_timeout() {
        return "The provider took too long to answer.".to_string();
    }
    format!("Could not reach the provider. {error}")
}
