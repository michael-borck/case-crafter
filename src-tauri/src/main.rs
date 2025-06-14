// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;

use database::DatabaseManager;
use tauri::{Manager, State};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn get_database_stats(app_handle: tauri::AppHandle, db: State<'_, DatabaseManager>) -> Result<database::connection::DatabaseStats, String> {
    db.get_stats(&app_handle).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn run_database_migration(db: State<'_, DatabaseManager>, command: String) -> Result<String, String> {
    db.migrate(&command).await.map_err(|e| e.to_string())?;
    Ok(format!("Migration command '{}' completed successfully", command))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Initialize database on app startup
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match DatabaseManager::new(&app_handle).await {
                    Ok(db_manager) => {
                        app_handle.manage(db_manager);
                        println!("Database initialized successfully");
                    }
                    Err(e) => {
                        eprintln!("Failed to initialize database: {}", e);
                    }
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet, 
            get_database_stats, 
            run_database_migration
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}