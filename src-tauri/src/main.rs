// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod encryption;
mod backup;
mod ai;
mod case_study;
mod assessment;
mod config;

use database::DatabaseManager;
use encryption::commands as encryption_commands;
use backup::commands as backup_commands;
use database::seeds::commands as seed_commands;
use ai::commands as ai_commands;
use case_study::commands as case_study_commands;
use assessment::commands as assessment_commands;
use config::commands as config_commands;
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

            // Initialize AI state will be done after database is ready

            // Initialize database and backup system on app startup
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match DatabaseManager::new(&app_handle).await {
                    Ok(db_manager) => {
                        let db_manager = std::sync::Arc::new(db_manager);
                        app_handle.manage(db_manager.clone());
                        
                        // Initialize AI state with database pool
                        let ai_state = ai_commands::setup_ai_state(app_handle.clone(), db_manager.pool().clone());
                        app_handle.manage(ai_state);
                        
                        // Initialize template repository state
                        let template_repo_state = ai_commands::setup_template_repository_state(db_manager.pool().clone());
                        app_handle.manage(template_repo_state);
                        
                        // Initialize case study manager state
                        let case_study_state = case_study_commands::setup_case_study_manager_state((*db_manager).clone());
                        app_handle.manage(case_study_state);
                        
                        // Initialize assessment workflow state
                        let assessment_state = assessment_commands::setup_assessment_workflow_state((*db_manager).clone());
                        app_handle.manage(assessment_state);
                        
                        // Initialize configuration service state
                        let config_service = config_commands::ConfigurationService::new((*db_manager).clone());
                        app_handle.manage(config_service);
                        
                        // Initialize backup system
                        let (backup_manager_state, backup_scheduler_state) = backup_commands::setup_backup_state(
                            app_handle.clone(),
                            db_manager,
                            None, // Encryption manager will be added later if needed
                        );
                        
                        app_handle.manage(backup_manager_state);
                        app_handle.manage(backup_scheduler_state);
                        
                        println!("Database, template repository, and backup system initialized successfully");
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
            ai_commands::generate_case_study_enhanced,
            ai_commands::validate_case_study_params,
            ai_commands::generate_assessment_questions,
            ai_commands::generate_assessment_questions_enhanced,
            ai_commands::validate_question_generation_params,
            ai_commands::create_default_question_params,
            ai_commands::get_question_types,
            ai_commands::get_question_difficulty_levels,
            ai_commands::generate_questions_from_case_study,
            ai_commands::test_ai_connection,
            // Database template management commands
            ai_commands::create_database_template,
            ai_commands::get_database_templates,
            ai_commands::get_database_template,
            ai_commands::get_database_templates_by_category,
            ai_commands::search_database_templates,
            ai_commands::search_database_templates_by_tags,
            ai_commands::update_database_template,
            ai_commands::delete_database_template,
            ai_commands::clone_database_template,
            ai_commands::get_template_usage_stats,
            ai_commands::record_template_usage,
            ai_commands::get_database_template_categories,
            ai_commands::create_template_category,
            ai_commands::get_popular_templates,
            ai_commands::get_user_templates,
            // Dynamic model configuration commands
            ai_commands::get_all_model_configs,
            ai_commands::get_models_by_provider,
            ai_commands::select_best_model,
            ai_commands::get_recommended_models,
            ai_commands::validate_model_parameters,
            ai_commands::adjust_model_parameters,
            ai_commands::estimate_generation_cost,
            ai_commands::update_model_availability,
            ai_commands::generate_with_auto_model,
            ai_commands::create_model_selection_criteria,
            ai_commands::get_model_parameter_constraints,
            // Case study management commands
            case_study_commands::create_case_study,
            case_study_commands::get_case_study,
            case_study_commands::update_case_study,
            case_study_commands::delete_case_study,
            case_study_commands::list_case_studies,
            case_study_commands::search_case_studies,
            case_study_commands::publish_case_study,
            case_study_commands::archive_case_study,
            case_study_commands::restore_case_study,
            case_study_commands::duplicate_case_study,
            case_study_commands::get_case_study_versions,
            case_study_commands::get_case_study_version,
            case_study_commands::restore_to_version,
            case_study_commands::get_case_study_statistics,
            case_study_commands::get_recent_case_studies,
            case_study_commands::get_case_studies_by_category,
            case_study_commands::get_case_studies_by_status,
            case_study_commands::count_case_studies,
            case_study_commands::case_study_exists,
            case_study_commands::create_default_case_study_metadata,
            case_study_commands::create_default_case_study_filter,
            case_study_commands::create_default_search_query,
            case_study_commands::get_case_study_statuses,
            case_study_commands::validate_case_study_data,
            case_study_commands::validate_case_study_update_data,
            // Assessment workflow commands
            assessment_commands::create_assessment_workflow,
            assessment_commands::get_assessment_workflow,
            assessment_commands::update_assessment_workflow,
            assessment_commands::delete_assessment_workflow,
            assessment_commands::list_assessment_workflows,
            assessment_commands::publish_assessment_workflow,
            assessment_commands::archive_assessment_workflow,
            assessment_commands::start_assessment_session,
            assessment_commands::get_assessment_session,
            assessment_commands::submit_assessment_answer,
            assessment_commands::navigate_to_assessment_question,
            assessment_commands::pause_assessment_session,
            assessment_commands::resume_assessment_session,
            assessment_commands::submit_assessment_for_grading,
            assessment_commands::get_assessment_result,
            assessment_commands::get_user_assessment_sessions,
            assessment_commands::get_assessment_statistics,
            assessment_commands::create_default_assessment_configuration,
            assessment_commands::create_default_assessment_metadata,
            assessment_commands::create_default_assessment_workflow_filter,
            assessment_commands::create_default_assessment_session_filter,
            assessment_commands::validate_assessment_workflow_data,
            assessment_commands::get_assessment_workflow_types,
            assessment_commands::get_assessment_workflow_statuses,
            assessment_commands::get_assessment_session_states,
            assessment_commands::get_session_statistics,
            assessment_commands::get_session_warnings,
            assessment_commands::can_submit_assessment_session,
            assessment_commands::bookmark_assessment_question,
            assessment_commands::update_assessment_question_notes,
            // Configuration system commands
            config_commands::create_configuration,
            config_commands::get_configuration,
            config_commands::get_configuration_schema,
            config_commands::update_configuration,
            config_commands::delete_configuration,
            config_commands::list_configurations,
            config_commands::search_configurations,
            config_commands::get_configuration_statistics,
            config_commands::get_configurations_by_category,
            config_commands::get_configurations_by_framework,
            config_commands::get_configuration_templates,
            config_commands::duplicate_configuration_from_template,
            config_commands::update_configuration_status,
            config_commands::validate_form_data,
            config_commands::submit_form_data,
            config_commands::get_dynamic_field_options,
            config_commands::record_configuration_usage,
            config_commands::count_configurations,
            config_commands::configuration_exists,
            config_commands::get_recent_configurations,
            config_commands::validate_configuration_schema,
            config_commands::export_configuration_templates,
            config_commands::import_configuration_templates,
            config_commands::evaluate_form_conditions,
            config_commands::evaluate_conditional_expression,
            config_commands::get_conditional_dependencies,
            config_commands::create_conditional_expression
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}