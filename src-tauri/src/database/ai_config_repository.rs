use crate::ai::config::AIConfig;
use sqlx::{SqlitePool, Row};
use serde_json;

pub struct AIConfigRepository {
    pool: SqlitePool,
}

impl AIConfigRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Save AI configuration to database
    pub async fn save_config(&self, config: &AIConfig) -> Result<(), sqlx::Error> {
        let config_json = serde_json::to_string(config)
            .map_err(|e| sqlx::Error::Protocol(format!("Failed to serialize config: {}", e)))?;

        sqlx::query(
            r#"
            INSERT OR REPLACE INTO ai_configurations (id, config_data, updated_at)
            VALUES (1, ?1, datetime('now'))
            "#
        )
        .bind(&config_json)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Load AI configuration from database
    pub async fn load_config(&self) -> Result<Option<AIConfig>, sqlx::Error> {
        let row = sqlx::query("SELECT config_data FROM ai_configurations WHERE id = 1")
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = row {
            let config_data: String = row.get("config_data");
            let config: AIConfig = serde_json::from_str(&config_data)
                .map_err(|e| sqlx::Error::Protocol(format!("Failed to deserialize config: {}", e)))?;
            Ok(Some(config))
        } else {
            Ok(None)
        }
    }

    /// Check if configuration exists
    pub async fn config_exists(&self) -> Result<bool, sqlx::Error> {
        let row = sqlx::query("SELECT COUNT(*) as count FROM ai_configurations WHERE id = 1")
            .fetch_one(&self.pool)
            .await?;
        
        let count: i64 = row.get("count");
        Ok(count > 0)
    }
}