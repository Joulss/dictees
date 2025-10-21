#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri::{AppHandle, Runtime};
use tauri::path::BaseDirectory;
use tauri::Manager;

// ===== User database handling =====

const USER_DB_FILENAME: &str = "dictees.json";
const DEFAULT_DB_JSON: &str = r#"{"feed":[]}"#;

fn user_db_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir error: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("mkdir failed: {e}"))?;
    Ok(dir.join(USER_DB_FILENAME))
}

fn ensure_user_db_exists<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let p = user_db_path(app)?;
    if !p.exists() {
        let mut f = fs::File::create(&p).map_err(|e| format!("create failed: {e}"))?;
        f.write_all(DEFAULT_DB_JSON.as_bytes()).map_err(|e| format!("write default failed: {e}"))?;
        println!("[tauri] created user_db.json at {}", p.display());
    } else {
        println!("[tauri] user_db.json present at {}", p.display());
    }
    Ok(())
}

#[tauri::command]
fn read_user_db<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    use std::io::Write; // <-- à ajouter
    println!("[tauri] read_user_db");
    let p = user_db_path(&app)?;
    if !p.exists() {
        // Nouveau schéma par défaut
        let default_json = r#"{"dictees":[],"baseWords":[]}"#;
        let mut f = fs::File::create(&p).map_err(|e| format!("create failed: {e}"))?;
        f.write_all(default_json.as_bytes())
            .map_err(|e| format!("write default failed: {e}"))?;
        return Ok(default_json.to_string());
    }
    fs::read_to_string(&p).map_err(|e| format!("read failed: {e}"))
}

#[tauri::command]
fn write_user_db<R: Runtime>(app: AppHandle<R>, json: String) -> Result<(), String> {
    println!("[tauri] write_user_db len={}", json.len());
    serde_json::from_str::<serde_json::Value>(&json)
        .map_err(|e| format!("invalid json: {e}"))?;
    let p = user_db_path(&app)?;
    fs::write(&p, json).map_err(|e| format!("write failed: {e}"))?;
    Ok(())
}

// ===== Response structures =====

#[derive(Serialize)]
struct OkResponse {
    status: u16,
    message: &'static str,
}

// ===== Commands ("routes") =====

#[tauri::command] // important: use the fully-qualified attribute in v2
fn words_analyses<R: Runtime>(_app: AppHandle<R>, surface: String, verbose: Option<bool>) -> Result<OkResponse, String> {
    println!("[tauri] words_analyses surface='{}' verbose={:?}", surface, verbose);
    Ok(OkResponse { status: 200, message: "OK" })
}

#[tauri::command]
fn words_forms<R: Runtime>(_app: AppHandle<R>, lemma: String) -> Result<OkResponse, String> {
    println!("[tauri] words_forms lemma='{}'", lemma);
    Ok(OkResponse { status: 200, message: "OK" })
}

#[tauri::command]
fn dictations_analyze<R: Runtime>(_app: AppHandle<R>, text: String, verbose: Option<bool>) -> Result<OkResponse, String> {
    println!("[tauri] dictations_analyze text.len={} verbose={:?}", text.len(), verbose);
    Ok(OkResponse { status: 200, message: "OK" })
}

#[tauri::command]
fn read_asset<R: Runtime>(app: AppHandle<R>, path: String) -> Result<String, String> {
    // Example: invoke('read_asset', { path: 'assets/formToAnalyses.json' })
    println!("[tauri] read_asset {}", path);
    let resolved = app
        .path()
        .resolve(path, BaseDirectory::Resource)
        .map_err(|e| format!("Resolve error: {e}"))?;

    fs::read_to_string(&resolved)
        .map_err(|e| format!("Failed to read {}: {e}", resolved.display()))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
      words_analyses,
      words_forms,
      dictations_analyze,
      read_asset,
      read_user_db,
      write_user_db
    ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            if let Some(win) = app.get_webview_window("main") {
                win.open_devtools();
            }
            ensure_user_db_exists(&app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
