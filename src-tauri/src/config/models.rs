// Database models for configuration system persistence

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::collections::HashMap;
use super::schema::*;

/// Database model for stored configuration schemas
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredConfigurationSchema {
    /// Unique identifier (UUID)
    pub id: String,
    /// Human-readable name for this configuration
    pub name: String,
    /// Description of what this configuration is for
    pub description: Option<String>,
    /// Version of this configuration schema
    pub version: String,
    /// Business framework this configuration belongs to
    pub framework: Option<String>,
    /// Category for organization
    pub category: String,
    /// JSON serialized schema data
    pub schema_data: String,
    /// Status of this configuration (draft, active, archived)
    pub status: ConfigurationStatus,
    /// Whether this is a template that can be duplicated
    pub is_template: bool,
    /// Tags for categorization (JSON array)
    pub tags: String,
    /// Target audience (JSON array)
    pub target_audience: String,
    /// Difficulty level
    pub difficulty_level: Option<String>,
    /// Estimated time to complete in minutes
    pub estimated_minutes: Option<i32>,
    /// Language/locale
    pub locale: String,
    /// Custom metadata (JSON object)
    pub custom_metadata: String,
    /// Who created this configuration
    pub created_by: Option<String>,
    /// When this configuration was created
    pub created_at: DateTime<Utc>,
    /// When this configuration was last updated
    pub updated_at: DateTime<Utc>,
}

/// Status of a configuration schema
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ConfigurationStatus {
    /// Configuration is being developed
    Draft,
    /// Configuration is active and can be used
    Active,
    /// Configuration is no longer active but preserved
    Archived,
    /// Configuration has been deleted (soft delete)
    Deleted,
}

/// Model for creating a new configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewConfiguration {
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    pub framework: Option<String>,
    pub category: String,
    pub schema: ConfigurationSchema,
    pub is_template: bool,
    pub tags: Vec<String>,
    pub target_audience: Vec<String>,
    pub difficulty_level: Option<String>,
    pub estimated_minutes: Option<i32>,
    pub locale: String,
    pub custom_metadata: HashMap<String, serde_json::Value>,
    pub created_by: Option<String>,
}

/// Model for updating an existing configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateConfiguration {
    pub name: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    pub framework: Option<String>,
    pub category: Option<String>,
    pub schema: Option<ConfigurationSchema>,
    pub status: Option<ConfigurationStatus>,
    pub is_template: Option<bool>,
    pub tags: Option<Vec<String>>,
    pub target_audience: Option<Vec<String>>,
    pub difficulty_level: Option<String>,
    pub estimated_minutes: Option<i32>,
    pub locale: Option<String>,
    pub custom_metadata: Option<HashMap<String, serde_json::Value>>,
}

/// Filter for querying configurations
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ConfigurationFilter {
    pub status: Option<ConfigurationStatus>,
    pub category: Option<String>,
    pub framework: Option<String>,
    pub is_template: Option<bool>,
    pub tags: Option<Vec<String>>,
    pub target_audience: Option<Vec<String>>,
    pub difficulty_level: Option<String>,
    pub locale: Option<String>,
    pub created_by: Option<String>,
    pub search_query: Option<String>,
}

/// Configuration usage tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigurationUsage {
    /// Configuration ID
    pub configuration_id: String,
    /// User who used this configuration
    pub user_id: Option<String>,
    /// When it was used
    pub used_at: DateTime<Utc>,
    /// Context of usage (e.g., "case_study_generation", "assessment_creation")
    pub usage_context: String,
    /// Additional metadata about the usage
    pub usage_metadata: HashMap<String, serde_json::Value>,
}

/// Statistics about configuration usage
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigurationStatistics {
    pub total_configurations: i32,
    pub active_configurations: i32,
    pub template_configurations: i32,
    pub most_used_configurations: Vec<(String, i32)>,
    pub usage_by_category: HashMap<String, i32>,
    pub usage_by_framework: HashMap<String, i32>,
    pub recent_activity: Vec<ConfigurationUsage>,
}

/// Form submission data based on a configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormSubmission {
    /// Unique identifier for this submission
    pub id: String,
    /// Configuration that was used
    pub configuration_id: String,
    /// User who submitted the form
    pub user_id: Option<String>,
    /// Form field values (JSON object)
    pub form_data: HashMap<String, serde_json::Value>,
    /// Validation results
    pub validation_results: ValidationResults,
    /// Status of this submission
    pub status: SubmissionStatus,
    /// When the form was submitted
    pub submitted_at: DateTime<Utc>,
    /// When the submission was last updated
    pub updated_at: DateTime<Utc>,
}

/// Status of a form submission
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SubmissionStatus {
    /// Submission is being processed
    Processing,
    /// Submission completed successfully
    Completed,
    /// Submission failed validation or processing
    Failed,
    /// Submission was cancelled
    Cancelled,
}

/// Results of form validation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResults {
    /// Whether the form passed all validations
    pub is_valid: bool,
    /// Field-level validation errors
    pub field_errors: HashMap<String, Vec<String>>,
    /// Cross-field validation errors
    pub global_errors: Vec<String>,
    /// Warnings (non-blocking issues)
    pub warnings: Vec<String>,
}

/// Configuration template for creating new configurations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigurationTemplate {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub category: String,
    pub framework: Option<String>,
    pub base_schema: ConfigurationSchema,
    pub customizable_fields: Vec<String>,
    pub default_values: HashMap<String, serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Model for duplicating a configuration from a template
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateConfigurationRequest {
    pub template_id: String,
    pub new_name: String,
    pub new_description: Option<String>,
    pub customizations: HashMap<String, serde_json::Value>,
    pub created_by: Option<String>,
}

impl StoredConfigurationSchema {
    /// Convert stored configuration to runtime schema
    pub fn to_configuration_schema(&self) -> crate::config::Result<ConfigurationSchema> {
        let mut schema: ConfigurationSchema = serde_json::from_str(&self.schema_data)?;
        
        // Update metadata from stored fields
        schema.id = self.id.clone();
        schema.name = self.name.clone();
        schema.description = self.description.clone();
        schema.version = self.version.clone();
        schema.framework = self.framework.clone();
        schema.category = self.category.clone();
        schema.created_at = self.created_at;
        schema.updated_at = self.updated_at;
        schema.created_by = self.created_by.clone();
        
        // Parse JSON fields
        let tags: Vec<String> = serde_json::from_str(&self.tags).unwrap_or_default();
        let target_audience: Vec<String> = serde_json::from_str(&self.target_audience).unwrap_or_default();
        let custom_metadata: HashMap<String, serde_json::Value> = 
            serde_json::from_str(&self.custom_metadata).unwrap_or_default();
        
        schema.metadata.tags = tags;
        schema.metadata.target_audience = target_audience;
        schema.metadata.difficulty_level = self.difficulty_level.clone();
        schema.metadata.estimated_minutes = self.estimated_minutes;
        schema.metadata.is_template = self.is_template;
        schema.metadata.is_active = self.status == ConfigurationStatus::Active;
        schema.metadata.locale = self.locale.clone();
        schema.metadata.custom = custom_metadata;
        
        Ok(schema)
    }
    
    /// Check if this configuration can be edited
    pub fn is_editable(&self) -> bool {
        matches!(self.status, ConfigurationStatus::Draft | ConfigurationStatus::Active)
    }
    
    /// Check if this configuration can be used
    pub fn is_usable(&self) -> bool {
        self.status == ConfigurationStatus::Active
    }
}

impl NewConfiguration {
    /// Convert to stored configuration model
    pub fn to_stored_configuration(&self, id: String) -> crate::config::Result<StoredConfigurationSchema> {
        let now = Utc::now();
        let schema_data = serde_json::to_string(&self.schema)?;
        let tags = serde_json::to_string(&self.tags)?;
        let target_audience = serde_json::to_string(&self.target_audience)?;
        let custom_metadata = serde_json::to_string(&self.custom_metadata)?;
        
        Ok(StoredConfigurationSchema {
            id,
            name: self.name.clone(),
            description: self.description.clone(),
            version: self.version.clone(),
            framework: self.framework.clone(),
            category: self.category.clone(),
            schema_data,
            status: ConfigurationStatus::Draft,
            is_template: self.is_template,
            tags,
            target_audience,
            difficulty_level: self.difficulty_level.clone(),
            estimated_minutes: self.estimated_minutes,
            locale: self.locale.clone(),
            custom_metadata,
            created_by: self.created_by.clone(),
            created_at: now,
            updated_at: now,
        })
    }
}

impl Default for ValidationResults {
    fn default() -> Self {
        Self {
            is_valid: true,
            field_errors: HashMap::new(),
            global_errors: Vec::new(),
            warnings: Vec::new(),
        }
    }
}

impl ValidationResults {
    /// Add a field validation error
    pub fn add_field_error(&mut self, field_id: &str, error: String) {
        self.is_valid = false;
        self.field_errors
            .entry(field_id.to_string())
            .or_insert_with(Vec::new)
            .push(error);
    }
    
    /// Add a global validation error
    pub fn add_global_error(&mut self, error: String) {
        self.is_valid = false;
        self.global_errors.push(error);
    }
    
    /// Add a warning
    pub fn add_warning(&mut self, warning: String) {
        self.warnings.push(warning);
    }
    
    /// Check if there are any errors
    pub fn has_errors(&self) -> bool {
        !self.field_errors.is_empty() || !self.global_errors.is_empty()
    }
}