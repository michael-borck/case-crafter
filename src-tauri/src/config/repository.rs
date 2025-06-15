// Database repository for configuration management

use super::models::*;
use super::schema::ConfigurationSchema;
use crate::config::{ConfigurationError, Result};
use crate::database::DatabaseManager;
use sqlx::{Row, Sqlite};
use chrono::Utc;
use uuid::Uuid;
use std::collections::HashMap;

/// Repository for configuration database operations
pub struct ConfigurationRepository {
    db: DatabaseManager,
}

impl ConfigurationRepository {
    pub fn new(db: DatabaseManager) -> Self {
        Self { db }
    }

    /// Create a new configuration
    pub async fn create(&self, new_config: NewConfiguration) -> Result<StoredConfigurationSchema> {
        let id = Uuid::new_v4().to_string();
        let stored_config = new_config.to_stored_configuration(id)?;
        
        sqlx::query(
            r#"
            INSERT INTO configurations (
                id, name, description, version, framework, category,
                schema_data, status, is_template, tags, target_audience,
                difficulty_level, estimated_minutes, locale, custom_metadata,
                created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&stored_config.id)
        .bind(&stored_config.name)
        .bind(&stored_config.description)
        .bind(&stored_config.version)
        .bind(&stored_config.framework)
        .bind(&stored_config.category)
        .bind(&stored_config.schema_data)
        .bind("draft") // status
        .bind(stored_config.is_template)
        .bind(&stored_config.tags)
        .bind(&stored_config.target_audience)
        .bind(&stored_config.difficulty_level)
        .bind(stored_config.estimated_minutes)
        .bind(&stored_config.locale)
        .bind(&stored_config.custom_metadata)
        .bind(&stored_config.created_by)
        .bind(&stored_config.created_at)
        .bind(&stored_config.updated_at)
        .execute(self.db.pool())
        .await?;

        self.find_by_id(&stored_config.id).await?
            .ok_or_else(|| ConfigurationError::ConfigurationNotFound("Failed to create configuration".to_string()))
    }

    /// Find configuration by ID
    pub async fn find_by_id(&self, id: &str) -> Result<Option<StoredConfigurationSchema>> {
        let row = sqlx::query(
            r#"
            SELECT id, name, description, version, framework, category,
                   schema_data, status, is_template, tags, target_audience,
                   difficulty_level, estimated_minutes, locale, custom_metadata,
                   created_by, created_at, updated_at
            FROM configurations 
            WHERE id = ? AND status != 'deleted'
            "#
        )
        .bind(id)
        .fetch_optional(self.db.pool())
        .await?;

        if let Some(row) = row {
            Ok(Some(self.parse_configuration_row(row)?))
        } else {
            Ok(None)
        }
    }

    /// Update configuration
    pub async fn update(&self, id: &str, update: UpdateConfiguration) -> Result<Option<StoredConfigurationSchema>> {
        let current = match self.find_by_id(id).await? {
            Some(config) => config,
            None => return Ok(None),
        };

        if !current.is_editable() {
            return Err(ConfigurationError::ValidationError(
                "Cannot edit archived or deleted configuration".to_string()
            ));
        }

        let now = Utc::now();
        
        if let Some(name) = &update.name {
            sqlx::query("UPDATE configurations SET name = ?, updated_at = ? WHERE id = ?")
                .bind(name)
                .bind(&now)
                .bind(id)
                .execute(self.db.pool()).await?;
        }

        if let Some(description) = &update.description {
            sqlx::query("UPDATE configurations SET description = ?, updated_at = ? WHERE id = ?")
                .bind(description)
                .bind(&now)
                .bind(id)
                .execute(self.db.pool()).await?;
        }

        if let Some(version) = &update.version {
            sqlx::query("UPDATE configurations SET version = ?, updated_at = ? WHERE id = ?")
                .bind(version)
                .bind(&now)
                .bind(id)
                .execute(self.db.pool()).await?;
        }

        if let Some(framework) = &update.framework {
            sqlx::query("UPDATE configurations SET framework = ?, updated_at = ? WHERE id = ?")
                .bind(framework)
                .bind(&now)
                .bind(id)
                .execute(self.db.pool()).await?;
        }

        if let Some(category) = &update.category {
            sqlx::query("UPDATE configurations SET category = ?, updated_at = ? WHERE id = ?")
                .bind(category)
                .bind(&now)
                .bind(id)
                .execute(self.db.pool()).await?;
        }

        if let Some(schema) = &update.schema {
            let schema_data = serde_json::to_string(schema)?;
            sqlx::query("UPDATE configurations SET schema_data = ?, updated_at = ? WHERE id = ?")
                .bind(&schema_data)
                .bind(&now)
                .bind(id)
                .execute(self.db.pool()).await?;
        }

        if let Some(status) = &update.status {
            let status_str = match status {
                ConfigurationStatus::Draft => "draft",
                ConfigurationStatus::Active => "active",
                ConfigurationStatus::Archived => "archived",
                ConfigurationStatus::Deleted => "deleted",
            };
            sqlx::query("UPDATE configurations SET status = ?, updated_at = ? WHERE id = ?")
                .bind(status_str)
                .bind(&now)
                .bind(id)
                .execute(self.db.pool()).await?;
        }

        if let Some(is_template) = update.is_template {
            sqlx::query("UPDATE configurations SET is_template = ?, updated_at = ? WHERE id = ?")
                .bind(is_template)
                .bind(&now)
                .bind(id)
                .execute(self.db.pool()).await?;
        }

        if let Some(tags) = &update.tags {
            let tags_json = serde_json::to_string(tags)?;
            sqlx::query("UPDATE configurations SET tags = ?, updated_at = ? WHERE id = ?")
                .bind(&tags_json)
                .bind(&now)
                .bind(id)
                .execute(self.db.pool()).await?;
        }

        if let Some(target_audience) = &update.target_audience {
            let audience_json = serde_json::to_string(target_audience)?;
            sqlx::query("UPDATE configurations SET target_audience = ?, updated_at = ? WHERE id = ?")
                .bind(&audience_json)
                .bind(&now)
                .bind(id)
                .execute(self.db.pool()).await?;
        }

        if let Some(difficulty_level) = &update.difficulty_level {
            sqlx::query("UPDATE configurations SET difficulty_level = ?, updated_at = ? WHERE id = ?")
                .bind(difficulty_level)
                .bind(&now)
                .bind(id)
                .execute(self.db.pool()).await?;
        }

        if let Some(estimated_minutes) = update.estimated_minutes {
            sqlx::query("UPDATE configurations SET estimated_minutes = ?, updated_at = ? WHERE id = ?")
                .bind(estimated_minutes)
                .bind(&now)
                .bind(id)
                .execute(self.db.pool()).await?;
        }

        if let Some(locale) = &update.locale {
            sqlx::query("UPDATE configurations SET locale = ?, updated_at = ? WHERE id = ?")
                .bind(locale)
                .bind(&now)
                .bind(id)
                .execute(self.db.pool()).await?;
        }

        if let Some(custom_metadata) = &update.custom_metadata {
            let metadata_json = serde_json::to_string(custom_metadata)?;
            sqlx::query("UPDATE configurations SET custom_metadata = ?, updated_at = ? WHERE id = ?")
                .bind(&metadata_json)
                .bind(&now)
                .bind(id)
                .execute(self.db.pool()).await?;
        }

        self.find_by_id(id).await
    }

    /// Change configuration status
    pub async fn update_status(&self, id: &str, status: ConfigurationStatus) -> Result<Option<StoredConfigurationSchema>> {
        let status_str = match status {
            ConfigurationStatus::Draft => "draft",
            ConfigurationStatus::Active => "active",
            ConfigurationStatus::Archived => "archived",
            ConfigurationStatus::Deleted => "deleted",
        };

        sqlx::query("UPDATE configurations SET status = ?, updated_at = ? WHERE id = ?")
            .bind(status_str)
            .bind(Utc::now())
            .bind(id)
            .execute(self.db.pool())
            .await?;

        self.find_by_id(id).await
    }

    /// Delete configuration (soft delete)
    pub async fn delete(&self, id: &str) -> Result<bool> {
        let result = sqlx::query(
            "UPDATE configurations SET status = 'deleted', updated_at = ? WHERE id = ? AND status != 'deleted'"
        )
        .bind(Utc::now())
        .bind(id)
        .execute(self.db.pool())
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// List configurations with filtering and pagination
    pub async fn list(&self, filter: ConfigurationFilter, limit: i32, offset: i32) -> Result<Vec<StoredConfigurationSchema>> {
        // Build query dynamically based on filter
        let mut query = "SELECT id, name, description, version, framework, category, schema_data, status, is_template, tags, target_audience, difficulty_level, estimated_minutes, locale, custom_metadata, created_by, created_at, updated_at FROM configurations WHERE status != 'deleted'".to_string();
        let mut bind_values: Vec<String> = Vec::new();

        if let Some(status) = &filter.status {
            query.push_str(" AND status = ?");
            bind_values.push(match status {
                ConfigurationStatus::Draft => "draft".to_string(),
                ConfigurationStatus::Active => "active".to_string(),
                ConfigurationStatus::Archived => "archived".to_string(),
                ConfigurationStatus::Deleted => "deleted".to_string(),
            });
        }

        if let Some(category) = &filter.category {
            query.push_str(" AND category = ?");
            bind_values.push(category.clone());
        }

        if let Some(framework) = &filter.framework {
            query.push_str(" AND framework = ?");
            bind_values.push(framework.clone());
        }

        if let Some(is_template) = filter.is_template {
            query.push_str(" AND is_template = ?");
            bind_values.push(is_template.to_string());
        }

        if let Some(difficulty_level) = &filter.difficulty_level {
            query.push_str(" AND difficulty_level = ?");
            bind_values.push(difficulty_level.clone());
        }

        if let Some(locale) = &filter.locale {
            query.push_str(" AND locale = ?");
            bind_values.push(locale.clone());
        }

        if let Some(created_by) = &filter.created_by {
            query.push_str(" AND created_by = ?");
            bind_values.push(created_by.clone());
        }

        if let Some(search_query) = &filter.search_query {
            query.push_str(" AND (name LIKE ? OR description LIKE ?)");
            let search_pattern = format!("%{}%", search_query);
            bind_values.push(search_pattern.clone());
            bind_values.push(search_pattern);
        }

        query.push_str(" ORDER BY updated_at DESC LIMIT ? OFFSET ?");
        bind_values.push(limit.to_string());
        bind_values.push(offset.to_string());

        // Execute query with proper parameter binding
        let mut sqlx_query = sqlx::query(&query);
        for value in &bind_values {
            sqlx_query = sqlx_query.bind(value);
        }

        let rows = sqlx_query.fetch_all(self.db.pool()).await?;

        let mut configurations = Vec::new();
        for row in rows {
            configurations.push(self.parse_configuration_row(row)?);
        }

        Ok(configurations)
    }

    /// Search configurations by content
    pub async fn search(&self, query: &str, limit: i32, offset: i32) -> Result<Vec<StoredConfigurationSchema>> {
        let filter = ConfigurationFilter {
            search_query: Some(query.to_string()),
            ..Default::default()
        };
        
        self.list(filter, limit, offset).await
    }

    /// Get configuration statistics
    pub async fn get_statistics(&self) -> Result<ConfigurationStatistics> {
        // Get total count
        let total_row = sqlx::query("SELECT COUNT(*) as count FROM configurations WHERE status != 'deleted'")
            .fetch_one(self.db.pool()).await?;
        let total_configurations: i32 = total_row.try_get("count")?;

        // Get active count
        let active_row = sqlx::query("SELECT COUNT(*) as count FROM configurations WHERE status = 'active'")
            .fetch_one(self.db.pool()).await?;
        let active_configurations: i32 = active_row.try_get("count")?;

        // Get template count
        let template_row = sqlx::query("SELECT COUNT(*) as count FROM configurations WHERE is_template = true AND status != 'deleted'")
            .fetch_one(self.db.pool()).await?;
        let template_configurations: i32 = template_row.try_get("count")?;

        // For simplicity, return basic statistics
        // In a real implementation, you'd calculate usage statistics from usage tracking
        Ok(ConfigurationStatistics {
            total_configurations,
            active_configurations,
            template_configurations,
            most_used_configurations: Vec::new(),
            usage_by_category: HashMap::new(),
            usage_by_framework: HashMap::new(),
            recent_activity: Vec::new(),
        })
    }

    /// Get configurations by category
    pub async fn list_by_category(&self, category: &str, limit: i32, offset: i32) -> Result<Vec<StoredConfigurationSchema>> {
        let filter = ConfigurationFilter {
            category: Some(category.to_string()),
            ..Default::default()
        };
        
        self.list(filter, limit, offset).await
    }

    /// Get configurations by framework
    pub async fn list_by_framework(&self, framework: &str, limit: i32, offset: i32) -> Result<Vec<StoredConfigurationSchema>> {
        let filter = ConfigurationFilter {
            framework: Some(framework.to_string()),
            ..Default::default()
        };
        
        self.list(filter, limit, offset).await
    }

    /// Get template configurations
    pub async fn list_templates(&self, limit: i32, offset: i32) -> Result<Vec<StoredConfigurationSchema>> {
        let filter = ConfigurationFilter {
            is_template: Some(true),
            status: Some(ConfigurationStatus::Active),
            ..Default::default()
        };
        
        self.list(filter, limit, offset).await
    }

    /// Duplicate configuration from template
    pub async fn duplicate_from_template(&self, request: DuplicateConfigurationRequest) -> Result<StoredConfigurationSchema> {
        let template = self.find_by_id(&request.template_id).await?
            .ok_or_else(|| ConfigurationError::ConfigurationNotFound("Template not found".to_string()))?;

        if !template.is_template {
            return Err(ConfigurationError::ValidationError("Source configuration is not a template".to_string()));
        }

        // Parse the template schema
        let mut template_schema: ConfigurationSchema = serde_json::from_str(&template.schema_data)?;
        
        // Apply customizations
        for (field_id, custom_value) in &request.customizations {
            if let Some(field) = template_schema.sections.iter_mut()
                .flat_map(|section| section.fields.iter_mut())
                .find(|field| field.id == *field_id) {
                field.default_value = Some(custom_value.clone());
            }
        }

        // Create new configuration
        let new_config = NewConfiguration {
            name: request.new_name,
            description: request.new_description,
            version: "1.0".to_string(),
            framework: template.framework,
            category: template.category,
            schema: template_schema,
            is_template: false,
            tags: serde_json::from_str(&template.tags).unwrap_or_default(),
            target_audience: serde_json::from_str(&template.target_audience).unwrap_or_default(),
            difficulty_level: template.difficulty_level,
            estimated_minutes: template.estimated_minutes,
            locale: template.locale,
            custom_metadata: serde_json::from_str(&template.custom_metadata).unwrap_or_default(),
            created_by: request.created_by,
        };

        self.create(new_config).await
    }

    /// Check if configuration exists
    pub async fn exists(&self, id: &str) -> Result<bool> {
        let count_row = sqlx::query("SELECT COUNT(*) as count FROM configurations WHERE id = ? AND status != 'deleted'")
            .bind(id)
            .fetch_one(self.db.pool())
            .await?;

        let count_value: i32 = count_row.try_get("count")?;
        Ok(count_value > 0)
    }

    /// Count configurations matching filter
    pub async fn count(&self, filter: ConfigurationFilter) -> Result<i32> {
        let mut query = "SELECT COUNT(*) as count FROM configurations WHERE status != 'deleted'".to_string();
        let mut bind_values: Vec<String> = Vec::new();

        if let Some(status) = &filter.status {
            query.push_str(" AND status = ?");
            bind_values.push(match status {
                ConfigurationStatus::Draft => "draft".to_string(),
                ConfigurationStatus::Active => "active".to_string(),
                ConfigurationStatus::Archived => "archived".to_string(),
                ConfigurationStatus::Deleted => "deleted".to_string(),
            });
        }

        if let Some(category) = &filter.category {
            query.push_str(" AND category = ?");
            bind_values.push(category.clone());
        }

        if let Some(framework) = &filter.framework {
            query.push_str(" AND framework = ?");
            bind_values.push(framework.clone());
        }

        if let Some(is_template) = filter.is_template {
            query.push_str(" AND is_template = ?");
            bind_values.push(is_template.to_string());
        }

        // Execute query with proper parameter binding
        let mut sqlx_query = sqlx::query(&query);
        for value in &bind_values {
            sqlx_query = sqlx_query.bind(value);
        }

        let count_row = sqlx_query.fetch_one(self.db.pool()).await?;
        let count_value: i32 = count_row.try_get("count")?;
        Ok(count_value)
    }

    /// Record configuration usage
    pub async fn record_usage(&self, usage: ConfigurationUsage) -> Result<()> {
        let usage_metadata_json = serde_json::to_string(&usage.usage_metadata)?;

        sqlx::query(
            "INSERT INTO configuration_usage (configuration_id, user_id, used_at, usage_context, usage_metadata) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(&usage.configuration_id)
        .bind(&usage.user_id)
        .bind(&usage.used_at)
        .bind(&usage.usage_context)
        .bind(&usage_metadata_json)
        .execute(self.db.pool())
        .await?;

        Ok(())
    }

    /// Get recent configurations
    pub async fn get_recent(&self, limit: i32) -> Result<Vec<StoredConfigurationSchema>> {
        let filter = ConfigurationFilter {
            status: Some(ConfigurationStatus::Active),
            ..Default::default()
        };
        
        self.list(filter, limit, 0).await
    }

    /// Helper method to parse configuration row
    fn parse_configuration_row(&self, row: sqlx::sqlite::SqliteRow) -> Result<StoredConfigurationSchema> {
        let status_str: String = row.try_get("status")?;
        let status = match status_str.as_str() {
            "draft" => ConfigurationStatus::Draft,
            "active" => ConfigurationStatus::Active,
            "archived" => ConfigurationStatus::Archived,
            "deleted" => ConfigurationStatus::Deleted,
            _ => ConfigurationStatus::Draft,
        };

        Ok(StoredConfigurationSchema {
            id: row.try_get("id")?,
            name: row.try_get("name")?,
            description: row.try_get("description")?,
            version: row.try_get("version")?,
            framework: row.try_get("framework")?,
            category: row.try_get("category")?,
            schema_data: row.try_get("schema_data")?,
            status,
            is_template: row.try_get("is_template")?,
            tags: row.try_get("tags")?,
            target_audience: row.try_get("target_audience")?,
            difficulty_level: row.try_get("difficulty_level")?,
            estimated_minutes: row.try_get("estimated_minutes")?,
            locale: row.try_get("locale")?,
            custom_metadata: row.try_get("custom_metadata")?,
            created_by: row.try_get("created_by")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}