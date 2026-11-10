//! Finds and reads the League client's lockfile. It exists only while the
//! client runs and looks like `LeagueClient:pid:port:password:protocol`.

use std::path::{Path, PathBuf};

pub const LOCKFILE_NAME: &str = "lockfile";
const PRODUCT_SETTINGS: &str = "league_of_legends.live.product_settings.yaml";
const INSTALL_PATH_KEY: &str = "product_install_full_path:";

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Lockfile {
    pub port: u16,
    pub password: String,
}

pub fn parse_lockfile(text: &str) -> Option<Lockfile> {
    let mut parts = text.trim().split(':');
    let _name = parts.next()?;
    let _pid = parts.next()?;
    let port = parts.next()?.parse().ok()?;
    let password = parts.next()?.to_string();
    if password.is_empty() {
        return None;
    }
    Some(Lockfile { port, password })
}

/// The lockfile of a running client, if any install folder has one.
pub fn read_lockfile() -> Option<Lockfile> {
    let path = find_lockfile()?;
    let text = std::fs::read_to_string(path).ok()?;
    parse_lockfile(&text)
}

pub fn find_lockfile() -> Option<PathBuf> {
    candidate_install_dirs()
        .into_iter()
        .map(|dir| dir.join(LOCKFILE_NAME))
        .find(|path| path.is_file())
}

/// Where the client may be installed, best guess first. Riot's own metadata
/// names the folder, so no path is hardcoded.
pub fn candidate_install_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    if let Some(program_data) = std::env::var_os("ProgramData") {
        let riot = Path::new(&program_data).join("Riot Games");
        if let Some(dir) = install_dir_from_product_settings(&riot) {
            dirs.push(dir);
        }
        dirs.extend(install_dirs_from_client_installs(&riot));
    }
    #[cfg(target_os = "macos")]
    dirs.push(PathBuf::from(
        "/Applications/League of Legends.app/Contents/LoL",
    ));
    dirs.dedup();
    dirs
}

fn install_dir_from_product_settings(riot: &Path) -> Option<PathBuf> {
    let path = riot
        .join("Metadata")
        .join("league_of_legends.live")
        .join(PRODUCT_SETTINGS);
    let text = std::fs::read_to_string(path).ok()?;
    parse_install_path(&text).map(PathBuf::from)
}

/// `product_install_full_path: "C:/Riot Games/League of Legends"` out of the
/// product settings YAML. A line scan is enough; the file is Riot's, not ours.
pub fn parse_install_path(yaml: &str) -> Option<String> {
    yaml.lines().find_map(|line| {
        let value = line.trim().strip_prefix(INSTALL_PATH_KEY)?;
        let value = value.trim().trim_matches('"');
        (!value.is_empty()).then(|| value.to_string())
    })
}

fn install_dirs_from_client_installs(riot: &Path) -> Vec<PathBuf> {
    let Ok(text) = std::fs::read_to_string(riot.join("RiotClientInstalls.json")) else {
        return Vec::new();
    };
    parse_client_installs(&text)
        .into_iter()
        .map(PathBuf::from)
        .collect()
}

/// League folders listed under `associated_client`, the live one before PBE.
pub fn parse_client_installs(json: &str) -> Vec<String> {
    let Ok(value) = serde_json::from_str::<serde_json::Value>(json) else {
        return Vec::new();
    };
    let mut dirs: Vec<String> = value
        .get("associated_client")
        .and_then(|clients| clients.as_object())
        .map(|clients| {
            clients
                .keys()
                .filter(|dir| dir.contains("League of Legends"))
                .cloned()
                .collect()
        })
        .unwrap_or_default();
    dirs.sort_by_key(|dir| dir.contains("PBE"));
    dirs
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_a_lockfile_line() {
        let lock = parse_lockfile("LeagueClient:13568:63456:s3cr3t:https\n").unwrap();
        assert_eq!(
            lock,
            Lockfile {
                port: 63456,
                password: "s3cr3t".to_string()
            }
        );
    }

    #[test]
    fn rejects_incomplete_or_odd_lockfiles() {
        assert_eq!(parse_lockfile(""), None);
        assert_eq!(parse_lockfile("LeagueClient:1:2"), None);
        assert_eq!(parse_lockfile("LeagueClient:1:notaport:pw:https"), None);
        assert_eq!(parse_lockfile("LeagueClient:1:2::https"), None);
    }

    #[test]
    fn reads_the_install_path_out_of_the_product_settings() {
        let yaml = "locale: en_US\nproduct_install_full_path: \"C:/Riot Games/League of Legends\"\nproduct_install_root: \"C:/Riot Games\"\n";
        assert_eq!(
            parse_install_path(yaml).as_deref(),
            Some("C:/Riot Games/League of Legends")
        );
        assert_eq!(parse_install_path("nothing: here"), None);
    }

    #[test]
    fn lists_league_installs_live_first() {
        let json = r#"{"associated_client":{"C:/Riot Games/League of Legends (PBE)/":"x","C:/Riot Games/League of Legends/":"x","C:/Riot Games/VALORANT/live/":"x"}}"#;
        assert_eq!(
            parse_client_installs(json),
            vec![
                "C:/Riot Games/League of Legends/".to_string(),
                "C:/Riot Games/League of Legends (PBE)/".to_string()
            ]
        );
        assert!(parse_client_installs("not json").is_empty());
    }
}
