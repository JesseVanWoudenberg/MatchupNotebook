//! HTTPS calls to the client's local API. The client uses a self-signed
//! certificate on 127.0.0.1 and basic auth with the lockfile password.

use serde_json::Value;
use tauri_plugin_http::reqwest::{Client, Method, StatusCode};

use super::lockfile::Lockfile;

const USERNAME: &str = "riot";

#[derive(Clone)]
pub struct LcuHttp {
    client: Client,
    base: String,
    password: String,
}

impl LcuHttp {
    pub fn new(lock: &Lockfile) -> Result<Self, String> {
        let client = Client::builder()
            .danger_accept_invalid_certs(true)
            .build()
            .map_err(|error| error.to_string())?;
        Ok(Self {
            client,
            base: format!("https://127.0.0.1:{}", lock.port),
            password: lock.password.clone(),
        })
    }

    pub async fn get(&self, path: &str) -> Result<Value, String> {
        self.send(Method::GET, path, None).await
    }

    /// `None` when the client answers 404, which it does for "no session yet".
    pub async fn get_or_none(&self, path: &str) -> Result<Option<Value>, String> {
        let (status, body) = self.request(Method::GET, path, None).await?;
        if status == StatusCode::NOT_FOUND {
            return Ok(None);
        }
        into_result(status, body).map(Some)
    }

    pub async fn send(
        &self,
        method: Method,
        path: &str,
        body: Option<&Value>,
    ) -> Result<Value, String> {
        let (status, body) = self.request(method, path, body).await?;
        into_result(status, body)
    }

    async fn request(
        &self,
        method: Method,
        path: &str,
        body: Option<&Value>,
    ) -> Result<(StatusCode, Value), String> {
        let mut request = self
            .client
            .request(method, format!("{}{}", self.base, path))
            .basic_auth(USERNAME, Some(&self.password))
            .header("Accept", "application/json");
        if let Some(body) = body {
            request = request
                .header("Content-Type", "application/json")
                .body(body.to_string());
        }
        let response = request.send().await.map_err(|error| error.to_string())?;
        let status = response.status();
        let text = response.text().await.map_err(|error| error.to_string())?;
        let value = if text.trim().is_empty() {
            Value::Null
        } else {
            serde_json::from_str(&text).map_err(|error| error.to_string())?
        };
        Ok((status, value))
    }
}

fn into_result(status: StatusCode, body: Value) -> Result<Value, String> {
    if status.is_success() {
        return Ok(body);
    }
    Err(match body.get("message").and_then(Value::as_str) {
        Some(message) => format!("{status}: {message}"),
        None => status.to_string(),
    })
}
