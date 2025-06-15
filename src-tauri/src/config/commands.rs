// Tauri commands for configuration management

use super::models::*;
use super::schema::*;
use super::repository::ConfigurationRepository;
use super::validation::ValidationEngine;
use super::conditional::{ConditionalEngine, ConditionalResult};
use crate::config::{ConfigurationError, Result};
use crate::database::DatabaseManager;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::{DialogExt, FilePath};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use serde_json::Value;

/// Configuration management service
pub struct ConfigurationService {
    pub repository: ConfigurationRepository,
    pub validation_engine: ValidationEngine,
    pub conditional_engine: ConditionalEngine,
}

impl ConfigurationService {
    pub fn new(db: DatabaseManager) -> Self {
        Self {
            repository: ConfigurationRepository::new(db),
            validation_engine: ValidationEngine::new(),
            conditional_engine: ConditionalEngine::new(),
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

/// Export configuration templates to JSON file
#[tauri::command]
pub async fn export_configuration_templates(
    app_handle: AppHandle,
    service: State<'_, ConfigurationService>,
    template_ids: Vec<String>,
    include_metadata: bool,
) -> std::result::Result<String, String> {
    
    // Get all specified templates
    let mut templates = Vec::new();
    for id in template_ids {
        if let Some(stored_config) = service.repository.find_by_id(&id).await
            .map_err(|e| format!("Failed to get configuration {}: {}", id, e))? {
            
            let config_schema = stored_config.to_configuration_schema()
                .map_err(|e| format!("Failed to parse configuration schema: {}", e))?;
                
            templates.push(ConfigurationTemplateExport {
                id: stored_config.id,
                name: stored_config.name,
                description: stored_config.description,
                version: stored_config.version,
                framework: stored_config.framework,
                category: stored_config.category,
                schema: config_schema,
                tags: stored_config.tags.split(',').map(|s| s.trim().to_string()).collect(),
                target_audience: stored_config.target_audience.split(',').map(|s| s.trim().to_string()).collect(),
                difficulty_level: stored_config.difficulty_level,
                estimated_minutes: stored_config.estimated_minutes,
                locale: stored_config.locale,
                created_at: stored_config.created_at.to_rfc3339(),
                exported_at: chrono::Utc::now().to_rfc3339(),
                export_metadata: if include_metadata {
                    Some(ExportMetadata {
                        exporter_version: env!("CARGO_PKG_VERSION").to_string(),
                        export_format_version: "1.0".to_string(),
                        total_templates: templates.len() + 1,
                    })
                } else {
                    None
                },
            });
        }
    }
    
    if templates.is_empty() {
        return Err("No valid templates found to export".to_string());
    }
    
    // Create export package
    let export_package = ConfigurationTemplatePackage {
        version: "1.0".to_string(),
        exported_at: chrono::Utc::now().to_rfc3339(),
        templates,
        metadata: if include_metadata {
            Some(PackageMetadata {
                exported_by: "Case Crafter".to_string(),
                export_tool_version: env!("CARGO_PKG_VERSION").to_string(),
                description: "Configuration template export from Case Crafter".to_string(),
            })
        } else {
            None
        },
    };
    
    // Serialize to JSON
    let json_content = serde_json::to_string_pretty(&export_package)
        .map_err(|e| format!("Failed to serialize templates: {}", e))?;
    
    // Show save dialog
    let file_path: Option<FilePath> = app_handle.dialog()
        .file()
        .add_filter("JSON Files", &["json"])
        .add_filter("All Files", &["*"])
        .set_file_name("configuration_templates.json")
        .blocking_save_file();
    
    if let Some(file_path) = file_path {
        let path_buf = file_path.into_path()
            .map_err(|e| format!("Failed to convert file path: {}", e))?;
        fs::write(&path_buf, json_content)
            .map_err(|e| format!("Failed to write file: {}", e))?;
        
        Ok(path_buf.to_string_lossy().to_string())
    } else {
        Err("Export cancelled by user".to_string())
    }
}

/// Import configuration templates from JSON file
#[tauri::command]
pub async fn import_configuration_templates(
    app_handle: AppHandle,
    service: State<'_, ConfigurationService>,
    overwrite_existing: bool,
) -> std::result::Result<ConfigurationImportResult, String> {
    
    // Show open dialog
    let file_path: Option<FilePath> = app_handle.dialog()
        .file()
        .add_filter("JSON Files", &["json"])
        .add_filter("All Files", &["*"])
        .blocking_pick_file();
    
    let file_path = file_path.ok_or_else(|| "Import cancelled by user".to_string())?;
    let path = file_path.into_path()
        .map_err(|e| format!("Failed to convert file path: {}", e))?;
    
    // Read file content
    let json_content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    // Parse JSON
    let import_package: ConfigurationTemplatePackage = serde_json::from_str(&json_content)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
    let mut import_result = ConfigurationImportResult {
        total_templates: import_package.templates.len(),
        imported_count: 0,
        skipped_count: 0,
        error_count: 0,
        imported_ids: Vec::new(),
        skipped_templates: Vec::new(),
        errors: Vec::new(),
    };
    
    // Import each template
    for template in import_package.templates {
        // Check if template already exists
        let exists = service.repository.exists(&template.id).await
            .map_err(|e| format!("Failed to check if template exists: {}", e))?;
        
        if exists && !overwrite_existing {
            import_result.skipped_count += 1;
            import_result.skipped_templates.push(ImportSkippedTemplate {
                id: template.id.clone(),
                name: template.name.clone(),
                reason: "Template already exists".to_string(),
            });
            continue;
        }
        
        // Create new configuration from template
        let new_config = NewConfiguration {
            name: template.name.clone(),
            description: template.description.clone(),
            version: template.version.clone(),
            framework: template.framework.clone(),
            category: template.category.clone(),
            schema: template.schema.clone(),
            is_template: true,
            tags: template.tags.clone(),
            target_audience: template.target_audience.clone(),
            difficulty_level: template.difficulty_level.clone(),
            estimated_minutes: template.estimated_minutes,
            locale: template.locale.clone(),
            custom_metadata: std::collections::HashMap::new(),
            created_by: Some("Imported".to_string()),
        };
        
        // Validate and create
        match service.repository.create(new_config).await {
            Ok(created_config) => {
                import_result.imported_count += 1;
                import_result.imported_ids.push(created_config.id);
            }
            Err(e) => {
                import_result.error_count += 1;
                import_result.errors.push(ImportError {
                    template_id: template.id.clone(),
                    template_name: template.name.clone(),
                    error: format!("Failed to create template: {}", e),
                });
            }
        }
    }
    
    Ok(import_result)
}

/// Evaluate conditional logic for a form
#[tauri::command]
pub async fn evaluate_form_conditions(
    service: State<'_, ConfigurationService>,
    configuration_id: String,
    form_data: HashMap<String, Value>,
) -> std::result::Result<HashMap<String, ConditionalResult>, String> {
    // Get the configuration schema
    let stored_config = service.repository.find_by_id(&configuration_id).await
        .map_err(|e| format!("Failed to get configuration: {}", e))?
        .ok_or_else(|| "Configuration not found".to_string())?;

    let schema = stored_config.to_configuration_schema()
        .map_err(|e| format!("Failed to parse configuration schema: {}", e))?;

    // Evaluate conditional logic
    let mut conditional_engine = service.conditional_engine.clone();
    let results = conditional_engine.evaluate_form_conditions(&schema, &form_data);
    
    Ok(results)
}

/// Evaluate a single conditional expression
#[tauri::command]
pub async fn evaluate_conditional_expression(
    service: State<'_, ConfigurationService>,
    configuration_id: String,
    expression: ConditionalExpression,
    form_data: HashMap<String, Value>,
    target_field_id: String,
) -> std::result::Result<bool, String> {
    // Get the configuration schema for field definitions
    let stored_config = service.repository.find_by_id(&configuration_id).await
        .map_err(|e| format!("Failed to get configuration: {}", e))?
        .ok_or_else(|| "Configuration not found".to_string())?;

    let schema = stored_config.to_configuration_schema()
        .map_err(|e| format!("Failed to parse configuration schema: {}", e))?;

    // Create field definitions map
    let mut field_definitions = HashMap::new();
    for section in &schema.sections {
        for field in &section.fields {
            field_definitions.insert(field.id.clone(), field.clone());
        }
    }

    let context = super::conditional::EvaluationContext {
        form_data,
        field_definitions,
        current_field_id: target_field_id,
    };

    let mut conditional_engine = service.conditional_engine.clone();
    let result = conditional_engine.evaluate_condition(&expression, &context);
    
    Ok(result)
}

/// Get field dependencies for conditional expressions
#[tauri::command]
pub async fn get_conditional_dependencies(
    service: State<'_, ConfigurationService>,
    configuration_id: String,
) -> std::result::Result<HashMap<String, Vec<String>>, String> {
    // Get the configuration schema
    let stored_config = service.repository.find_by_id(&configuration_id).await
        .map_err(|e| format!("Failed to get configuration: {}", e))?
        .ok_or_else(|| "Configuration not found".to_string())?;

    let schema = stored_config.to_configuration_schema()
        .map_err(|e| format!("Failed to parse configuration schema: {}", e))?;

    let mut dependencies = HashMap::new();
    let conditional_engine = service.conditional_engine.clone();

    // Get dependencies from conditional rules
    for rule in &schema.conditional_logic {
        let rule_dependencies = conditional_engine.get_dependencies(&rule.condition);
        dependencies.insert(rule.target.clone(), rule_dependencies);
    }

    // Get dependencies from field visibility conditions
    for section in &schema.sections {
        for field in &section.fields {
            if let Some(visibility_condition) = &field.visibility_conditions {
                let field_dependencies = conditional_engine.get_dependencies(visibility_condition);
                if !field_dependencies.is_empty() {
                    dependencies.insert(field.id.clone(), field_dependencies);
                }
            }
        }
    }

    Ok(dependencies)
}

/// Create a conditional expression helper
#[tauri::command]
pub async fn create_conditional_expression(
    expression_type: String,
    field_id: String,
    value: Value,
    _operator: Option<String>,
) -> std::result::Result<ConditionalExpression, String> {
    match expression_type.as_str() {
        "equals" => Ok(ConditionalExpression::Equals {
            field: field_id,
            value,
        }),
        "not_equals" => Ok(ConditionalExpression::NotEquals {
            field: field_id,
            value,
        }),
        "greater_than" => Ok(ConditionalExpression::GreaterThan {
            field: field_id,
            value,
        }),
        "less_than" => Ok(ConditionalExpression::LessThan {
            field: field_id,
            value,
        }),
        "contains" => Ok(ConditionalExpression::Contains {
            field: field_id,
            value,
        }),
        "is_empty" => Ok(ConditionalExpression::IsEmpty {
            field: field_id,
        }),
        "is_not_empty" => Ok(ConditionalExpression::IsNotEmpty {
            field: field_id,
        }),
        _ => Err(format!("Unknown expression type: {}", expression_type)),
    }
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