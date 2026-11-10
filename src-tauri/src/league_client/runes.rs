//! The one write to the client: a rune page, sent only when the user clicks.

use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use tauri_plugin_http::reqwest::Method;

use super::http::LcuHttp;

const PAGES: &str = "/lol-perks/v1/pages";
const INVENTORY: &str = "/lol-perks/v1/inventory";
/// The client cuts longer names off; cutting here keeps the name lookup exact.
const MAX_NAME_LENGTH: usize = 25;
const NO_ROOM: &str =
    "Your rune pages are full and none can be replaced. Delete one in the client first.";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunePageInput {
    pub name: String,
    pub primary_style_id: i64,
    pub sub_style_id: i64,
    pub selected_perk_ids: Vec<i64>,
}

/// What made room for the new page, so the UI can say so.
#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SendOutcome {
    Added,
    ReplacedSameName,
    ReplacedCurrent,
}

pub async fn send_rune_page(http: &LcuHttp, page: &RunePageInput) -> Result<SendOutcome, String> {
    let name = clip_name(&page.name);
    let pages = http.get(PAGES).await?;
    let inventory = http.get(INVENTORY).await?;
    let can_add = inventory
        .get("canAddCustomPage")
        .and_then(Value::as_bool)
        .unwrap_or(false);
    let (to_delete, outcome) = plan_replacement(&pages, &name, can_add)?;
    if let Some(id) = to_delete {
        http.send(Method::DELETE, &format!("{PAGES}/{id}"), None)
            .await?;
    }
    let body = json!({
        "name": name,
        "primaryStyleId": page.primary_style_id,
        "subStyleId": page.sub_style_id,
        "selectedPerkIds": page.selected_perk_ids,
        "current": true,
    });
    http.send(Method::POST, PAGES, Some(&body)).await?;
    Ok(outcome)
}

/// Which page, if any, to delete first. A page with the same name is ours
/// from last time. Otherwise, when every slot is taken, the current page
/// goes, which is what the client's own "replace" does.
pub fn plan_replacement(
    pages: &Value,
    name: &str,
    can_add: bool,
) -> Result<(Option<i64>, SendOutcome), String> {
    let pages = pages
        .as_array()
        .ok_or_else(|| "The client sent no rune pages.".to_string())?;
    let editable: Vec<&Value> = pages
        .iter()
        .filter(|page| flag(page, "isEditable") && !flag(page, "isTemporary"))
        .collect();
    let id_of = |page: &Value| page.get("id").and_then(Value::as_i64);

    if let Some(same) = editable
        .iter()
        .find(|page| page.get("name").and_then(Value::as_str) == Some(name))
    {
        return Ok((id_of(same), SendOutcome::ReplacedSameName));
    }
    if can_add {
        return Ok((None, SendOutcome::Added));
    }
    let current = editable
        .iter()
        .find(|page| flag(page, "current"))
        .or_else(|| editable.last());
    match current.and_then(|page| id_of(page)) {
        Some(id) => Ok((Some(id), SendOutcome::ReplacedCurrent)),
        None => Err(NO_ROOM.to_string()),
    }
}

fn flag(page: &Value, key: &str) -> bool {
    page.get(key).and_then(Value::as_bool).unwrap_or(false)
}

fn clip_name(name: &str) -> String {
    name.trim().chars().take(MAX_NAME_LENGTH).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn page(id: i64, name: &str, current: bool, editable: bool) -> Value {
        json!({ "id": id, "name": name, "current": current, "isEditable": editable, "isTemporary": false })
    }

    #[test]
    fn replaces_the_page_with_the_same_name() {
        let pages = json!([page(1, "Aery", true, true), page(2, "Taliyah mid", false, true)]);
        assert_eq!(
            plan_replacement(&pages, "Taliyah mid", true).unwrap(),
            (Some(2), SendOutcome::ReplacedSameName)
        );
    }

    #[test]
    fn adds_when_there_is_room() {
        let pages = json!([page(1, "Aery", true, true)]);
        assert_eq!(
            plan_replacement(&pages, "New", true).unwrap(),
            (None, SendOutcome::Added)
        );
    }

    #[test]
    fn replaces_the_current_page_when_full() {
        let pages = json!([page(1, "Aery", false, true), page(2, "Electrocute", true, true)]);
        assert_eq!(
            plan_replacement(&pages, "New", false).unwrap(),
            (Some(2), SendOutcome::ReplacedCurrent)
        );
    }

    #[test]
    fn never_touches_pages_the_client_owns() {
        let preset = json!({ "id": 9, "name": "Preset", "current": true, "isEditable": false, "isTemporary": false });
        let pages = json!([preset]);
        assert_eq!(plan_replacement(&pages, "New", false).unwrap_err(), NO_ROOM);
        assert_eq!(
            plan_replacement(&json!([]), "New", true).unwrap(),
            (None, SendOutcome::Added)
        );
    }

    #[test]
    fn clips_long_names_like_the_client_does() {
        assert_eq!(clip_name("  Taliyah  "), "Taliyah");
        assert_eq!(clip_name(&"x".repeat(40)).chars().count(), MAX_NAME_LENGTH);
    }
}
