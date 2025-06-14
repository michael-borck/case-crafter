// Tauri commands for database seeding

use super::{DatabaseSeeder, SeedConfig, SeedStats};
use crate::database::DatabaseManager;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, State};
use tokio::sync::Mutex;

type DatabaseManagerState = Arc<DatabaseManager>;

/// Run database seeding with configuration
#[tauri::command]
pub async fn seed_database(
    config: SeedConfig,
    database_manager_state: State<'_, DatabaseManagerState>,
) -> std::result::Result<SeedStats, String> {
    let seeder = DatabaseSeeder::new(database_manager_state.inner().clone());
    seeder.seed(config).await.map_err(|e| e.to_string())
}

/// Get default seeding configuration
#[tauri::command]
pub async fn get_default_seed_config() -> std::result::Result<SeedConfig, String> {
    Ok(SeedConfig::default())
}

/// Get current database statistics
#[tauri::command]
pub async fn get_database_record_counts(
    database_manager_state: State<'_, DatabaseManagerState>,
) -> std::result::Result<HashMap<String, i64>, String> {
    let seeder = DatabaseSeeder::new(database_manager_state.inner().clone());
    seeder.get_current_stats().await.map_err(|e| e.to_string())
}

/// Check if sample data exists in database
#[tauri::command]
pub async fn check_sample_data_exists(
    database_manager_state: State<'_, DatabaseManagerState>,
) -> std::result::Result<bool, String> {
    let stats = {
        let seeder = DatabaseSeeder::new(database_manager_state.inner().clone());
        seeder.get_current_stats().await.map_err(|e| e.to_string())?
    };

    // Consider sample data to exist if we have users, domains, and case studies
    let has_sample_data = stats.get("users").unwrap_or(&0) > &0 
        && stats.get("domains").unwrap_or(&0) > &0 
        && stats.get("case_studies").unwrap_or(&0) > &0;

    Ok(has_sample_data)
}

/// Reset database (clear all data)
#[tauri::command]
pub async fn reset_database(
    database_manager_state: State<'_, DatabaseManagerState>,
) -> std::result::Result<bool, String> {
    let reset_config = SeedConfig {
        reset_database: true,
        seed_users: false,
        seed_domains: false,
        seed_case_studies: false,
        seed_assessment_questions: false,
        seed_app_settings: false,
        seed_user_progress: false,
        seed_collections: false,
        ..Default::default()
    };

    let seeder = DatabaseSeeder::new(database_manager_state.inner().clone());
    seeder.seed(reset_config).await.map(|_| true).map_err(|e| e.to_string())
}

/// Seed only specific data types
#[tauri::command]
pub async fn seed_specific_data(
    data_types: Vec<String>,
    database_manager_state: State<'_, DatabaseManagerState>,
) -> std::result::Result<SeedStats, String> {
    let mut config = SeedConfig {
        reset_database: false,
        seed_users: false,
        seed_domains: false,
        seed_case_studies: false,
        seed_assessment_questions: false,
        seed_app_settings: false,
        seed_user_progress: false,
        seed_collections: false,
        ..Default::default()
    };

    // Enable seeding for requested data types
    for data_type in data_types {
        match data_type.as_str() {
            "users" => config.seed_users = true,
            "domains" => config.seed_domains = true,
            "case_studies" => config.seed_case_studies = true,
            "assessment_questions" => config.seed_assessment_questions = true,
            "app_settings" => config.seed_app_settings = true,
            "user_progress" => config.seed_user_progress = true,
            "collections" => config.seed_collections = true,
            _ => continue,
        }
    }

    let seeder = DatabaseSeeder::new(database_manager_state.inner().clone());
    seeder.seed(config).await.map_err(|e| e.to_string())
}

/// Validate database schema and sample data integrity
#[tauri::command]
pub async fn validate_sample_data(
    database_manager_state: State<'_, DatabaseManagerState>,
) -> std::result::Result<HashMap<String, serde_json::Value>, String> {
    let mut validation_results = HashMap::new();
    
    let seeder = DatabaseSeeder::new(database_manager_state.inner().clone());
    let stats = seeder.get_current_stats().await.map_err(|e| e.to_string())?;

    // Check basic data integrity
    let users_count = stats.get("users").unwrap_or(&0);
    let domains_count = stats.get("domains").unwrap_or(&0);
    let case_studies_count = stats.get("case_studies").unwrap_or(&0);
    let questions_count = stats.get("assessment_questions").unwrap_or(&0);

    validation_results.insert("record_counts".to_string(), serde_json::json!(stats));
    
    // Validate referential integrity
    let integrity_checks = vec![
        ("users_exist", users_count > &0),
        ("domains_exist", domains_count > &0),
        ("case_studies_exist", case_studies_count > &0),
        ("questions_exist", questions_count > &0),
        ("case_studies_have_domains", case_studies_count > &0 && domains_count > &0),
        ("questions_have_case_studies", questions_count > &0 && case_studies_count > &0),
    ];

    for (check_name, passed) in integrity_checks {
        validation_results.insert(check_name.to_string(), serde_json::json!(passed));
    }

    // Overall validation status
    let overall_valid = users_count > &0 && domains_count > &0 && case_studies_count > &0;
    validation_results.insert("overall_valid".to_string(), serde_json::json!(overall_valid));

    Ok(validation_results)
}

/// Get sample data templates information
#[tauri::command]
pub async fn get_sample_data_info() -> std::result::Result<HashMap<String, serde_json::Value>, String> {
    let mut info = HashMap::new();

    // Information about available sample data
    info.insert("available_data_types".to_string(), serde_json::json!([
        "users", "domains", "case_studies", "assessment_questions",
        "app_settings", "user_progress", "collections"
    ]));

    info.insert("sample_users_count".to_string(), serde_json::json!(10));
    info.insert("sample_domains_count".to_string(), serde_json::json!(7));
    info.insert("sample_case_study_templates".to_string(), serde_json::json!(3));
    info.insert("sample_question_templates".to_string(), serde_json::json!(3));
    info.insert("sample_app_settings".to_string(), serde_json::json!(10));
    info.insert("sample_collections".to_string(), serde_json::json!(5));

    // Configuration options
    info.insert("default_case_studies_per_domain".to_string(), serde_json::json!(5));
    info.insert("default_questions_per_case_study".to_string(), serde_json::json!(3));
    info.insert("default_max_users".to_string(), serde_json::json!(10));

    // Data relationships
    info.insert("dependencies".to_string(), serde_json::json!({
        "case_studies": ["users", "domains"],
        "assessment_questions": ["case_studies"],
        "user_progress": ["users", "case_studies"],
        "collections": ["users", "case_studies"]
    }));

    Ok(info)
}

/// Export sample data configuration
#[tauri::command]
pub async fn export_seed_config(
    config: SeedConfig,
) -> std::result::Result<String, String> {
    serde_json::to_string_pretty(&config).map_err(|e| e.to_string())
}

/// Import sample data configuration
#[tauri::command]
pub async fn import_seed_config(
    config_json: String,
) -> std::result::Result<SeedConfig, String> {
    serde_json::from_str(&config_json).map_err(|e| e.to_string())
}

/// Get seeding recommendations based on current database state
#[tauri::command]
pub async fn get_seeding_recommendations(
    database_manager_state: State<'_, DatabaseManagerState>,
) -> std::result::Result<HashMap<String, serde_json::Value>, String> {
    let seeder = DatabaseSeeder::new(database_manager_state.inner().clone());
    let stats = seeder.get_current_stats().await.map_err(|e| e.to_string())?;

    let mut recommendations = HashMap::new();

    let users_count = stats.get("users").unwrap_or(&0);
    let domains_count = stats.get("domains").unwrap_or(&0);
    let case_studies_count = stats.get("case_studies").unwrap_or(&0);
    let questions_count = stats.get("assessment_questions").unwrap_or(&0);

    // Generate recommendations based on current state
    let mut suggested_actions = Vec::new();

    if users_count == &0 {
        suggested_actions.push("Create sample users for testing and development");
    }

    if domains_count == &0 {
        suggested_actions.push("Add sample domains to categorize case studies");
    }

    if case_studies_count == &0 && domains_count > &0 && users_count > &0 {
        suggested_actions.push("Generate sample case studies with existing users and domains");
    }

    if questions_count == &0 && case_studies_count > &0 {
        suggested_actions.push("Add assessment questions to existing case studies");
    }

    if case_studies_count > &0 && users_count > &0 {
        suggested_actions.push("Create user progress records to simulate student activity");
    }

    if suggested_actions.is_empty() {
        suggested_actions.push("Database appears to have sample data. Consider reset if refresh is needed.");
    }

    recommendations.insert("suggested_actions".to_string(), serde_json::json!(suggested_actions));
    recommendations.insert("current_state".to_string(), serde_json::json!(stats));

    // Suggested configuration
    let suggested_config = if users_count == &0 && domains_count == &0 {
        SeedConfig::default() // Full seeding
    } else {
        SeedConfig {
            reset_database: false,
            seed_users: users_count == &0,
            seed_domains: domains_count == &0,
            seed_case_studies: case_studies_count == &0 && domains_count > &0 && users_count > &0,
            seed_assessment_questions: questions_count == &0 && case_studies_count > &0,
            seed_app_settings: stats.get("app_settings").unwrap_or(&0) == &0,
            seed_user_progress: stats.get("user_progress").unwrap_or(&0) == &0 && case_studies_count > &0,
            seed_collections: stats.get("collections").unwrap_or(&0) == &0 && case_studies_count > &0,
            ..Default::default()
        }
    };

    recommendations.insert("suggested_config".to_string(), serde_json::to_value(suggested_config).map_err(|e| e.to_string())?);

    Ok(recommendations)
}