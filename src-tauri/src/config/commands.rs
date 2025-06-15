// Tauri commands for configuration management

use super::models::*;
use super::schema::*;
use super::repository::ConfigurationRepository;
use super::validation::ValidationEngine;
use crate::config::{ConfigurationError, Result};
use crate::database::DatabaseManager;
use tauri::{AppHandle, Manager, State};
use std::collections::HashMap;
use serde_json::Value;

/// Configuration management service
pub struct ConfigurationService {
    pub repository: ConfigurationRepository,
    pub validation_engine: ValidationEngine,
}

impl ConfigurationService {
    pub fn new(db: DatabaseManager) -> Self {
        Self {
            repository: ConfigurationRepository::new(db),
            validation_engine: ValidationEngine::new(),
        }
    }
}

/// Create a new configuration
#[tauri::command]
pub async fn create_configuration(
    service: State<'_, ConfigurationService>,
    new_config: NewConfiguration,
) -> std::result::Result<StoredConfigurationSchema, String> {
    // Validate the schema before creating
    let validation_results = service.validation_engine.validate_schema(&new_config.schema)
        .map_err(|e| format!("Schema validation failed: {}", e))?;

    if !validation_results.is_valid {
        let error_msg = format!(
            "Schema validation failed: {}",
            validation_results.global_errors.join(", ")
        );
        return Err(error_msg);
    }

    service.repository.create(new_config).await
        .map_err(|e| format!("Failed to create configuration: {}", e))
}

/// Get configuration by ID
#[tauri::command]
pub async fn get_configuration(
    service: State<'_, ConfigurationService>,
    id: String,
) -> std::result::Result<Option<StoredConfigurationSchema>, String> {
    service.repository.find_by_id(&id).await
        .map_err(|e| format!("Failed to get configuration: {}", e))
}

/// Get configuration schema by ID (for form rendering)
#[tauri::command]
pub async fn get_configuration_schema(
    service: State<'_, ConfigurationService>,
    id: String,
) -> std::result::Result<Option<ConfigurationSchema>, String> {
    match service.repository.find_by_id(&id).await {
        Ok(Some(stored_config)) => {
            match stored_config.to_configuration_schema() {
                Ok(schema) => Ok(Some(schema)),
                Err(e) => Err(format!("Failed to parse configuration schema: {}", e)),
            }
        },
        Ok(None) => Ok(None),
        Err(e) => Err(format!("Failed to get configuration: {}", e)),
    }
}

/// Update configuration
#[tauri::command]
pub async fn update_configuration(
    service: State<'_, ConfigurationService>,
    id: String,
    update: UpdateConfiguration,
) -> std::result::Result<Option<StoredConfigurationSchema>, String> {
    // If schema is being updated, validate it
    if let Some(ref schema) = update.schema {
        let validation_results = service.validation_engine.validate_schema(schema)
            .map_err(|e| format!("Schema validation failed: {}", e))?;

        if !validation_results.is_valid {
            let error_msg = format!(
                "Schema validation failed: {}",
                validation_results.global_errors.join(", ")
            );
            return Err(error_msg);
        }
    }

    service.repository.update(&id, update).await
        .map_err(|e| format!("Failed to update configuration: {}", e))
}

/// Delete configuration
#[tauri::command]
pub async fn delete_configuration(
    service: State<'_, ConfigurationService>,
    id: String,
) -> std::result::Result<bool, String> {
    service.repository.delete(&id).await
        .map_err(|e| format!("Failed to delete configuration: {}", e))
}

/// List configurations with filtering
#[tauri::command]
pub async fn list_configurations(
    service: State<'_, ConfigurationService>,
    filter: ConfigurationFilter,
    limit: i32,
    offset: i32,
) -> std::result::Result<Vec<StoredConfigurationSchema>, String> {
    service.repository.list(filter, limit, offset).await
        .map_err(|e| format!("Failed to list configurations: {}", e))
}

/// Search configurations
#[tauri::command]
pub async fn search_configurations(
    service: State<'_, ConfigurationService>,
    query: String,
    limit: i32,
    offset: i32,
) -> std::result::Result<Vec<StoredConfigurationSchema>, String> {
    service.repository.search(&query, limit, offset).await
        .map_err(|e| format!("Failed to search configurations: {}", e))
}

/// Get configuration statistics
#[tauri::command]
pub async fn get_configuration_statistics(
    service: State<'_, ConfigurationService>,
) -> std::result::Result<ConfigurationStatistics, String> {
    service.repository.get_statistics().await
        .map_err(|e| format!("Failed to get statistics: {}", e))
}

/// Get configurations by category
#[tauri::command]
pub async fn get_configurations_by_category(
    service: State<'_, ConfigurationService>,
    category: String,
    limit: i32,
    offset: i32,
) -> std::result::Result<Vec<StoredConfigurationSchema>, String> {
    service.repository.list_by_category(&category, limit, offset).await
        .map_err(|e| format!("Failed to get configurations by category: {}", e))
}

/// Get configurations by framework
#[tauri::command]
pub async fn get_configurations_by_framework(
    service: State<'_, ConfigurationService>,
    framework: String,
    limit: i32,
    offset: i32,
) -> std::result::Result<Vec<StoredConfigurationSchema>, String> {
    service.repository.list_by_framework(&framework, limit, offset).await
        .map_err(|e| format!("Failed to get configurations by framework: {}", e))
}

/// Get template configurations
#[tauri::command]
pub async fn get_configuration_templates(
    service: State<'_, ConfigurationService>,
    limit: i32,
    offset: i32,
) -> std::result::Result<Vec<StoredConfigurationSchema>, String> {
    service.repository.list_templates(limit, offset).await
        .map_err(|e| format!("Failed to get templates: {}", e))
}

/// Duplicate configuration from template
#[tauri::command]
pub async fn duplicate_configuration_from_template(
    service: State<'_, ConfigurationService>,
    request: DuplicateConfigurationRequest,
) -> std::result::Result<StoredConfigurationSchema, String> {
    service.repository.duplicate_from_template(request).await
        .map_err(|e| format!("Failed to duplicate from template: {}", e))
}

/// Update configuration status
#[tauri::command]
pub async fn update_configuration_status(
    service: State<'_, ConfigurationService>,
    id: String,
    status: ConfigurationStatus,
) -> std::result::Result<Option<StoredConfigurationSchema>, String> {
    service.repository.update_status(&id, status).await
        .map_err(|e| format!("Failed to update status: {}", e))
}

/// Validate form data against configuration schema
#[tauri::command]
pub async fn validate_form_data(
    service: State<'_, ConfigurationService>,
    configuration_id: String,
    form_data: HashMap<String, Value>,
) -> std::result::Result<ValidationResults, String> {
    // Get the configuration schema
    let stored_config = service.repository.find_by_id(&configuration_id).await
        .map_err(|e| format!("Failed to get configuration: {}", e))?
        .ok_or_else(|| "Configuration not found".to_string())?;

    let schema = stored_config.to_configuration_schema()
        .map_err(|e| format!("Failed to parse configuration schema: {}", e))?;

    // Validate the form data
    service.validation_engine.validate_form_data(&schema, &form_data)
        .map_err(|e| format!("Validation failed: {}", e))
}

/// Submit form data
#[tauri::command]
pub async fn submit_form_data(
    service: State<'_, ConfigurationService>,
    submission: FormSubmission,
) -> std::result::Result<String, String> {
    // First validate the form data
    let stored_config = service.repository.find_by_id(&submission.configuration_id).await
        .map_err(|e| format!("Failed to get configuration: {}", e))?
        .ok_or_else(|| "Configuration not found".to_string())?;

    let schema = stored_config.to_configuration_schema()
        .map_err(|e| format!("Failed to parse configuration schema: {}", e))?;

    let validation_results = service.validation_engine.validate_form_data(&schema, &submission.form_data)
        .map_err(|e| format!("Validation failed: {}", e))?;

    if !validation_results.is_valid {
        return Err(format!("Form validation failed: {:?}", validation_results));
    }

    // In a real implementation, you would:
    // 1. Store the form submission in the database
    // 2. Process the form data (e.g., generate case study, create assessment)
    // 3. Return the result ID or status

    // For now, just return a success message
    Ok(format!("Form submitted successfully for configuration {}", submission.configuration_id))
}

/// Get form field options dynamically
#[tauri::command]
pub async fn get_dynamic_field_options(
    service: State<'_, ConfigurationService>,
    configuration_id: String,
    field_id: String,
    _dependencies: HashMap<String, Value>,
) -> std::result::Result<Vec<OptionItem>, String> {
    // Get the configuration schema
    let stored_config = service.repository.find_by_id(&configuration_id).await
        .map_err(|e| format!("Failed to get configuration: {}", e))?
        .ok_or_else(|| "Configuration not found".to_string())?;

    let schema = stored_config.to_configuration_schema()
        .map_err(|e| format!("Failed to parse configuration schema: {}", e))?;

    // Find the field
    let field = schema.get_field(&field_id)
        .ok_or_else(|| format!("Field '{}' not found", field_id))?;

    // Get field options
    if let Some(ref options) = field.options {
        if let Some(ref static_options) = options.static_options {
            return Ok(static_options.clone());
        }

        if let Some(ref _dynamic_config) = options.dynamic_options {
            // In a real implementation, you would:
            // 1. Parse the dynamic options configuration
            // 2. Make database queries or API calls based on source_type and source_config
            // 3. Apply dependency filters
            // 4. Return the dynamic options

            // For now, return empty options for dynamic configs
            return Ok(Vec::new());
        }
    }

    Ok(Vec::new())
}

/// Record configuration usage
#[tauri::command]
pub async fn record_configuration_usage(
    service: State<'_, ConfigurationService>,
    usage: ConfigurationUsage,
) -> std::result::Result<(), String> {
    service.repository.record_usage(usage).await
        .map_err(|e| format!("Failed to record usage: {}", e))
}

/// Count configurations matching filter
#[tauri::command]
pub async fn count_configurations(
    service: State<'_, ConfigurationService>,
    filter: ConfigurationFilter,
) -> std::result::Result<i32, String> {
    service.repository.count(filter).await
        .map_err(|e| format!("Failed to count configurations: {}", e))
}

/// Check if configuration exists
#[tauri::command]
pub async fn configuration_exists(
    service: State<'_, ConfigurationService>,
    id: String,
) -> std::result::Result<bool, String> {
    service.repository.exists(&id).await
        .map_err(|e| format!("Failed to check if configuration exists: {}", e))
}

/// Get recent configurations
#[tauri::command]
pub async fn get_recent_configurations(
    service: State<'_, ConfigurationService>,
    limit: i32,
) -> std::result::Result<Vec<StoredConfigurationSchema>, String> {
    service.repository.get_recent(limit).await
        .map_err(|e| format!("Failed to get recent configurations: {}", e))
}

/// Validate configuration schema structure
#[tauri::command]
pub async fn validate_configuration_schema(
    service: State<'_, ValidationEngine>,
    schema: ConfigurationSchema,
) -> std::result::Result<ValidationResults, String> {
    service.validate_schema(&schema)
        .map_err(|e| format!("Schema validation failed: {}", e))
}

/// Initialize configuration service
pub fn init_configuration_service(app: &AppHandle) -> Result<()> {
    let db_manager = app.state::<DatabaseManager>();
    let service = ConfigurationService::new(db_manager.inner().clone());
    app.manage(service);
    
    let validation_engine = ValidationEngine::new();
    app.manage(validation_engine);
    
    Ok(())
}