// Repository for managing prompt templates in the database

use crate::database::models::{
    PromptTemplate, NewPromptTemplate, UpdatePromptTemplate,
    TemplateUsage, NewTemplateUsage, TemplateCategory, NewTemplateCategory
};
use chrono::{DateTime, Utc};
use sqlx::{SqlitePool, Row};
use std::collections::HashMap;

pub type Result<T> = std::result::Result<T, sqlx::Error>;

/// Repository for prompt template operations
pub struct PromptTemplateRepository {
    pool: SqlitePool,
}

impl PromptTemplateRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Create a new prompt template
    pub async fn create(&self, template: NewPromptTemplate) -> Result<PromptTemplate> {
        let _result = sqlx::query(
            r#"
            INSERT INTO prompt_templates (
                template_id, name, description, category, system_prompt, user_prompt,
                variables, example_values, tags, version, is_active, is_system_template, created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&template.template_id)
        .bind(&template.name)
        .bind(&template.description)
        .bind(&template.category)
        .bind(&template.system_prompt)
        .bind(&template.user_prompt)
        .bind(&template.variables)
        .bind(&template.example_values)
        .bind(&template.tags)
        .bind(template.version.unwrap_or_else(|| "1.0.0".to_string()))
        .bind(template.is_active.unwrap_or(true))
        .bind(template.is_system_template.unwrap_or(false))
        .bind(template.created_by)
        .execute(&self.pool)
        .await?;

        self.find_by_template_id(&template.template_id).await?
            .ok_or_else(|| sqlx::Error::RowNotFound)
    }

    /// Find template by template_id (UUID)
    pub async fn find_by_template_id(&self, template_id: &str) -> Result<Option<PromptTemplate>> {
        let template = sqlx::query_as::<_, PromptTemplate>(
            "SELECT * FROM prompt_templates WHERE template_id = ?"
        )
        .bind(template_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(template)
    }

    /// Find template by database ID
    pub async fn find_by_id(&self, id: i64) -> Result<Option<PromptTemplate>> {
        let template = sqlx::query_as::<_, PromptTemplate>(
            "SELECT * FROM prompt_templates WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(template)
    }

    /// List all active templates
    pub async fn list_active(&self) -> Result<Vec<PromptTemplate>> {
        let templates = sqlx::query_as::<_, PromptTemplate>(
            "SELECT * FROM prompt_templates WHERE is_active = 1 ORDER BY name"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(templates)
    }

    /// List templates by category
    pub async fn list_by_category(&self, category: &str) -> Result<Vec<PromptTemplate>> {
        let templates = sqlx::query_as::<_, PromptTemplate>(
            "SELECT * FROM prompt_templates WHERE category = ? AND is_active = 1 ORDER BY name"
        )
        .bind(category)
        .fetch_all(&self.pool)
        .await?;

        Ok(templates)
    }

    /// Search templates by name or description
    pub async fn search(&self, query: &str) -> Result<Vec<PromptTemplate>> {
        let search_pattern = format!("%{}%", query);
        let templates = sqlx::query_as::<_, PromptTemplate>(
            r#"
            SELECT * FROM prompt_templates 
            WHERE (name LIKE ? OR description LIKE ?) AND is_active = 1
            ORDER BY 
                CASE WHEN name LIKE ? THEN 1 ELSE 2 END,
                name
            "#
        )
        .bind(&search_pattern)
        .bind(&search_pattern)
        .bind(&search_pattern)
        .fetch_all(&self.pool)
        .await?;

        Ok(templates)
    }

    /// Search templates by tags
    pub async fn search_by_tags(&self, tags: &[String]) -> Result<Vec<PromptTemplate>> {
        let mut query = "SELECT * FROM prompt_templates WHERE is_active = 1 AND (".to_string();
        let mut conditions = Vec::new();
        
        for (i, _) in tags.iter().enumerate() {
            conditions.push(format!("tags LIKE ?{}", i + 1));
        }
        
        query.push_str(&conditions.join(" OR "));
        query.push_str(") ORDER BY name");

        let mut sql_query = sqlx::query_as::<_, PromptTemplate>(&query);
        
        for tag in tags {
            let tag_pattern = format!("%\"{}\"", tag);
            sql_query = sql_query.bind(tag_pattern);
        }

        let templates = sql_query.fetch_all(&self.pool).await?;
        Ok(templates)
    }

    /// Update a template
    pub async fn update(&self, template_id: &str, update_data: UpdatePromptTemplate) -> Result<Option<PromptTemplate>> {
        let existing = self.find_by_template_id(template_id).await?;
        if existing.is_none() {
            return Ok(None);
        }

        let mut set_clauses = Vec::new();
        let mut values: Vec<Box<dyn sqlx::Encode<'_, sqlx::Sqlite> + Send + Sync>> = Vec::new();

        if let Some(name) = &update_data.name {
            set_clauses.push("name = ?");
            values.push(Box::new(name.clone()));
        }
        if let Some(description) = &update_data.description {
            set_clauses.push("description = ?");
            values.push(Box::new(description.clone()));
        }
        if let Some(category) = &update_data.category {
            set_clauses.push("category = ?");
            values.push(Box::new(category.clone()));
        }
        if let Some(system_prompt) = &update_data.system_prompt {
            set_clauses.push("system_prompt = ?");
            values.push(Box::new(system_prompt.clone()));
        }
        if let Some(user_prompt) = &update_data.user_prompt {
            set_clauses.push("user_prompt = ?");
            values.push(Box::new(user_prompt.clone()));
        }
        if let Some(variables) = &update_data.variables {
            set_clauses.push("variables = ?");
            values.push(Box::new(variables.clone()));
        }
        if let Some(example_values) = &update_data.example_values {
            set_clauses.push("example_values = ?");
            values.push(Box::new(example_values.clone()));
        }
        if let Some(tags) = &update_data.tags {
            set_clauses.push("tags = ?");
            values.push(Box::new(tags.clone()));
        }
        if let Some(version) = &update_data.version {
            set_clauses.push("version = ?");
            values.push(Box::new(version.clone()));
        }
        if let Some(is_active) = update_data.is_active {
            set_clauses.push("is_active = ?");
            values.push(Box::new(is_active));
        }

        if set_clauses.is_empty() {
            return self.find_by_template_id(template_id).await;
        }

        set_clauses.push("updated_at = datetime('now')");

        let query = format!(
            "UPDATE prompt_templates SET {} WHERE template_id = ?",
            set_clauses.join(", ")
        );

        // Note: Dynamic query building is complex with type safety. Using simplified approach instead.

        // Simplified update approach
        sqlx::query(
            r#"
            UPDATE prompt_templates 
            SET name = COALESCE(?, name),
                description = COALESCE(?, description),
                category = COALESCE(?, category),
                system_prompt = COALESCE(?, system_prompt),
                user_prompt = COALESCE(?, user_prompt),
                variables = COALESCE(?, variables),
                example_values = COALESCE(?, example_values),
                tags = COALESCE(?, tags),
                version = COALESCE(?, version),
                is_active = COALESCE(?, is_active),
                updated_at = datetime('now')
            WHERE template_id = ?
            "#
        )
        .bind(&update_data.name)
        .bind(&update_data.description)
        .bind(&update_data.category)
        .bind(&update_data.system_prompt)
        .bind(&update_data.user_prompt)
        .bind(&update_data.variables)
        .bind(&update_data.example_values)
        .bind(&update_data.tags)
        .bind(&update_data.version)
        .bind(update_data.is_active)
        .bind(template_id)
        .execute(&self.pool)
        .await?;

        self.find_by_template_id(template_id).await
    }

    /// Delete a template (soft delete by setting is_active = false)
    pub async fn delete(&self, template_id: &str) -> Result<bool> {
        let rows_affected = sqlx::query(
            "UPDATE prompt_templates SET is_active = 0, updated_at = datetime('now') WHERE template_id = ?"
        )
        .bind(template_id)
        .execute(&self.pool)
        .await?
        .rows_affected();

        Ok(rows_affected > 0)
    }

    /// Hard delete a template (permanently remove)
    pub async fn hard_delete(&self, template_id: &str) -> Result<bool> {
        let rows_affected = sqlx::query(
            "DELETE FROM prompt_templates WHERE template_id = ?"
        )
        .bind(template_id)
        .execute(&self.pool)
        .await?
        .rows_affected();

        Ok(rows_affected > 0)
    }

    /// Get template usage statistics
    pub async fn get_usage_stats(&self, template_id: &str) -> Result<HashMap<String, serde_json::Value>> {
        let stats = sqlx::query(
            r#"
            SELECT 
                COUNT(*) as total_uses,
                SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_uses,
                SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_uses,
                AVG(execution_time_ms) as avg_execution_time,
                COUNT(DISTINCT user_id) as unique_users,
                MIN(created_at) as first_used,
                MAX(created_at) as last_used
            FROM template_usage 
            WHERE template_id = ?
            "#
        )
        .bind(template_id)
        .fetch_one(&self.pool)
        .await?;

        let mut result = HashMap::new();
        result.insert("total_uses".to_string(), serde_json::json!(stats.get::<i64, _>("total_uses")));
        result.insert("successful_uses".to_string(), serde_json::json!(stats.get::<i64, _>("successful_uses")));
        result.insert("failed_uses".to_string(), serde_json::json!(stats.get::<i64, _>("failed_uses")));
        result.insert("avg_execution_time".to_string(), serde_json::json!(stats.get::<Option<f64>, _>("avg_execution_time")));
        result.insert("unique_users".to_string(), serde_json::json!(stats.get::<i64, _>("unique_users")));
        result.insert("first_used".to_string(), serde_json::json!(stats.get::<Option<String>, _>("first_used")));
        result.insert("last_used".to_string(), serde_json::json!(stats.get::<Option<String>, _>("last_used")));

        Ok(result)
    }

    /// Record template usage
    pub async fn record_usage(&self, usage: NewTemplateUsage) -> Result<TemplateUsage> {
        let result = sqlx::query(
            r#"
            INSERT INTO template_usage (
                template_id, user_id, generation_id, variables_used, 
                success, error_message, execution_time_ms
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&usage.template_id)
        .bind(usage.user_id)
        .bind(usage.generation_id)
        .bind(&usage.variables_used)
        .bind(usage.success)
        .bind(&usage.error_message)
        .bind(usage.execution_time_ms)
        .execute(&self.pool)
        .await?;

        let usage_record = sqlx::query_as::<_, TemplateUsage>(
            "SELECT * FROM template_usage WHERE id = ?"
        )
        .bind(result.last_insert_rowid())
        .fetch_one(&self.pool)
        .await?;

        Ok(usage_record)
    }

    /// Get template categories
    pub async fn get_categories(&self) -> Result<Vec<TemplateCategory>> {
        let categories = sqlx::query_as::<_, TemplateCategory>(
            "SELECT * FROM template_categories WHERE is_active = 1 ORDER BY sort_order, name"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(categories)
    }

    /// Create template category
    pub async fn create_category(&self, category: NewTemplateCategory) -> Result<TemplateCategory> {
        let sort_order = category.sort_order.unwrap_or_else(|| {
            // Get next sort order
            0 // In practice, you'd query for the max sort_order + 1
        });

        let result = sqlx::query(
            r#"
            INSERT INTO template_categories (name, description, icon, color, sort_order, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&category.name)
        .bind(&category.description)
        .bind(&category.icon)
        .bind(&category.color)
        .bind(sort_order)
        .bind(category.is_active.unwrap_or(true))
        .execute(&self.pool)
        .await?;

        let category_record = sqlx::query_as::<_, TemplateCategory>(
            "SELECT * FROM template_categories WHERE id = ?"
        )
        .bind(result.last_insert_rowid())
        .fetch_one(&self.pool)
        .await?;

        Ok(category_record)
    }

    /// Get most popular templates
    pub async fn get_popular_templates(&self, limit: i64) -> Result<Vec<(PromptTemplate, i64)>> {
        let results = sqlx::query(
            r#"
            SELECT pt.*, COUNT(tu.id) as usage_count
            FROM prompt_templates pt
            LEFT JOIN template_usage tu ON pt.template_id = tu.template_id
            WHERE pt.is_active = 1
            GROUP BY pt.id
            ORDER BY usage_count DESC, pt.name
            LIMIT ?
            "#
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        let mut templates = Vec::new();
        for row in results {
            let template = PromptTemplate {
                id: row.get("id"),
                template_id: row.get("template_id"),
                name: row.get("name"),
                description: row.get("description"),
                category: row.get("category"),
                system_prompt: row.get("system_prompt"),
                user_prompt: row.get("user_prompt"),
                variables: row.get("variables"),
                example_values: row.get("example_values"),
                tags: row.get("tags"),
                version: row.get("version"),
                is_active: row.get("is_active"),
                is_system_template: row.get("is_system_template"),
                created_by: row.get("created_by"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            };
            let usage_count: i64 = row.get("usage_count");
            templates.push((template, usage_count));
        }

        Ok(templates)
    }

    /// Get user's templates
    pub async fn list_by_user(&self, user_id: i64) -> Result<Vec<PromptTemplate>> {
        let templates = sqlx::query_as::<_, PromptTemplate>(
            r#"
            SELECT * FROM prompt_templates 
            WHERE created_by = ? AND is_active = 1 
            ORDER BY updated_at DESC
            "#
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(templates)
    }

    /// Clone a template for a user
    pub async fn clone_template(&self, template_id: &str, user_id: i64, new_name: Option<String>) -> Result<PromptTemplate> {
        let original = self.find_by_template_id(template_id).await?
            .ok_or_else(|| sqlx::Error::RowNotFound)?;

        let new_template_id = uuid::Uuid::new_v4().to_string();
        let name = new_name.unwrap_or_else(|| format!("{} (Copy)", original.name));

        let new_template = NewPromptTemplate {
            template_id: new_template_id,
            name,
            description: format!("Cloned from: {}", original.description),
            category: original.category,
            system_prompt: original.system_prompt,
            user_prompt: original.user_prompt,
            variables: original.variables,
            example_values: original.example_values,
            tags: original.tags,
            version: Some("1.0.0".to_string()),
            is_active: Some(true),
            is_system_template: Some(false),
            created_by: Some(user_id),
        };

        self.create(new_template).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    async fn create_test_pool() -> SqlitePool {
        SqlitePoolOptions::new()
            .connect(":memory:")
            .await
            .expect("Failed to create test database")
    }

    #[tokio::test]
    async fn test_create_and_find_template() {
        let pool = create_test_pool().await;
        let repo = PromptTemplateRepository::new(pool);

        // This test would require running migrations first
        // For now, it's a placeholder to show the testing approach
    }
}