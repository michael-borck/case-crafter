// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod encryption;
mod backup;
mod ai;

use database::DatabaseManager;
use encryption::commands as encryption_commands;
use backup::commands as backup_commands;
use database::seeds::commands as seed_commands;
use ai::commands as ai_commands;
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
            // Initialize encryption state
            let encryption_state = encryption_commands::setup_encryption_state(app.handle().clone());
            app.manage(encryption_state);

            // Initialize AI state
            let ai_state = ai_commands::setup_ai_state(app.handle().clone());
            app.manage(ai_state);

            // Initialize database and backup system on app startup
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match DatabaseManager::new(&app_handle).await {
                    Ok(db_manager) => {
                        let db_manager = std::sync::Arc::new(db_manager);
                        app_handle.manage(db_manager.clone());
                        
                        // Initialize backup system
                        let (backup_manager_state, backup_scheduler_state) = backup_commands::setup_backup_state(
                            app_handle.clone(),
                            db_manager,
                            None, // Encryption manager will be added later if needed
                        );
                        
                        app_handle.manage(backup_manager_state);
                        app_handle.manage(backup_scheduler_state);
                        
                        println!("Database and backup system initialized successfully");
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
            run_database_migration,
            encryption_commands::initialize_encryption,
            encryption_commands::is_encryption_initialized,
            encryption_commands::encrypt_value,
            encryption_commands::decrypt_value,
            encryption_commands::encrypt_user_preferences,
            encryption_commands::decrypt_user_preferences,
            encryption_commands::encrypt_map,
            encryption_commands::decrypt_map,
            encryption_commands::change_encryption_password,
            encryption_commands::validate_encryption_password,
            encryption_commands::export_encryption_config,
            encryption_commands::test_encryption,
            encryption_commands::get_encryption_stats,
            backup_commands::initialize_backup,
            backup_commands::get_backup_config,
            backup_commands::create_backup,
            backup_commands::list_backups,
            backup_commands::restore_backup,
            backup_commands::delete_backup,
            backup_commands::validate_backup,
            backup_commands::get_backup_stats,
            backup_commands::start_backup_scheduler,
            backup_commands::stop_backup_scheduler,
            backup_commands::pause_backup_scheduler,
            backup_commands::resume_backup_scheduler,
            backup_commands::update_backup_schedule,
            backup_commands::get_scheduler_status,
            backup_commands::get_backup_schedule,
            backup_commands::get_scheduler_stats,
            backup_commands::get_backup_events,
            backup_commands::trigger_immediate_backup,
            backup_commands::export_backup_config,
            backup_commands::import_backup_config,
            backup_commands::test_backup_system,
            backup_commands::get_backup_system_info,
            seed_commands::seed_database,
            seed_commands::get_default_seed_config,
            seed_commands::get_database_record_counts,
            seed_commands::check_sample_data_exists,
            seed_commands::reset_database,
            seed_commands::seed_specific_data,
            seed_commands::validate_sample_data,
            seed_commands::get_sample_data_info,
            seed_commands::export_seed_config,
            seed_commands::import_seed_config,
            seed_commands::get_seeding_recommendations,
            // AI commands
            ai_commands::initialize_ai,
            ai_commands::get_ai_config,
            ai_commands::update_ai_config,
            ai_commands::switch_ai_provider,
            ai_commands::generate_content,
            ai_commands::get_available_models,
            ai_commands::validate_ai_provider,
            ai_commands::get_ai_stats,
            ai_commands::get_supported_ai_providers,
            ai_commands::is_ai_provider_supported,
            ai_commands::create_default_ai_config,
            ai_commands::create_openai_config,
            ai_commands::create_anthropic_config,
            ai_commands::create_ollama_config,
            ai_commands::get_prompt_templates,
            ai_commands::get_prompt_template,
            ai_commands::get_prompt_templates_by_category,
            ai_commands::search_prompt_templates_by_tags,
            ai_commands::render_prompt_template,
            ai_commands::get_prompt_categories,
            ai_commands::export_prompt_templates,
            ai_commands::load_default_prompt_templates,
            ai_commands::generate_case_study,
            ai_commands::generate_assessment_questions,
            ai_commands::test_ai_connection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}