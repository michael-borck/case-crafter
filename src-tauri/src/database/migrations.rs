use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum MigrationError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("Migration {0} not found")]
    MigrationNotFound(String),
    #[error("Migration {0} has already been applied")]
    AlreadyApplied(String),
    #[error("Invalid migration version: {0}")]
    InvalidVersion(String),
    #[error("Migration dependency not satisfied: {0} requires {1}")]
    DependencyNotSatisfied(String, String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Migration {
    pub version: String,
    pub name: String,
    pub description: String,
    pub up_sql: String,
    pub down_sql: String,
    pub dependencies: Vec<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppliedMigration {
    pub version: String,
    pub name: String,
    pub applied_at: DateTime<Utc>,
    pub checksum: String,
}

pub struct MigrationManager {
    pool: SqlitePool,
    migrations: HashMap<String, Migration>,
}

impl MigrationManager {
    pub fn new(pool: SqlitePool) -> Self {
        let mut manager = Self {
            pool,
            migrations: HashMap::new(),
        };
        
        // Register all migrations
        manager.register_initial_migrations();
        manager
    }

    /// Initialize the migrations table if it doesn't exist
    pub async fn initialize(&self) -> Result<(), MigrationError> {
        let create_table_sql = r#"
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                checksum TEXT NOT NULL
            );
        "#;

        sqlx::query(create_table_sql)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Register a migration
    pub fn register_migration(&mut self, migration: Migration) {
        self.migrations.insert(migration.version.clone(), migration);
    }

    /// Get all applied migrations from the database
    pub async fn get_applied_migrations(&self) -> Result<Vec<AppliedMigration>, MigrationError> {
        let rows = sqlx::query("SELECT version, name, applied_at, checksum FROM schema_migrations ORDER BY applied_at")
            .fetch_all(&self.pool)
            .await?;

        let migrations = rows
            .into_iter()
            .map(|row| AppliedMigration {
                version: row.get("version"),
                name: row.get("name"),
                applied_at: row.get("applied_at"),
                checksum: row.get("checksum"),
            })
            .collect();

        Ok(migrations)
    }

    /// Get pending migrations that need to be applied
    pub async fn get_pending_migrations(&self) -> Result<Vec<&Migration>, MigrationError> {
        let applied = self.get_applied_migrations().await?;
        let applied_versions: std::collections::HashSet<String> = applied
            .into_iter()
            .map(|m| m.version)
            .collect();

        let mut pending: Vec<&Migration> = self
            .migrations
            .values()
            .filter(|m| !applied_versions.contains(&m.version))
            .collect();

        // Sort by version to ensure proper order
        pending.sort_by(|a, b| a.version.cmp(&b.version));

        Ok(pending)
    }

    /// Apply a single migration
    pub async fn apply_migration(&self, migration: &Migration) -> Result<(), MigrationError> {
        // Check if migration is already applied
        let applied = self.get_applied_migrations().await?;
        if applied.iter().any(|m| m.version == migration.version) {
            return Err(MigrationError::AlreadyApplied(migration.version.clone()));
        }

        // Check dependencies
        for dep in &migration.dependencies {
            if !applied.iter().any(|m| m.version == *dep) {
                return Err(MigrationError::DependencyNotSatisfied(
                    migration.version.clone(),
                    dep.clone(),
                ));
            }
        }

        // Start transaction
        let mut tx = self.pool.begin().await?;

        // Execute the migration SQL
        sqlx::query(&migration.up_sql)
            .execute(&mut *tx)
            .await?;

        // Calculate checksum
        let checksum = format!("{:x}", md5::compute(&migration.up_sql));

        // Record the migration
        sqlx::query(
            "INSERT INTO schema_migrations (version, name, applied_at, checksum) VALUES (?, ?, ?, ?)"
        )
        .bind(&migration.version)
        .bind(&migration.name)
        .bind(Utc::now())
        .bind(&checksum)
        .execute(&mut *tx)
        .await?;

        // Commit transaction
        tx.commit().await?;

        println!("Applied migration: {} - {}", migration.version, migration.name);
        Ok(())
    }

    /// Apply all pending migrations
    pub async fn migrate(&self) -> Result<usize, MigrationError> {
        let pending = self.get_pending_migrations().await?;
        let count = pending.len();

        for migration in pending {
            self.apply_migration(migration).await?;
        }

        if count > 0 {
            println!("Applied {} migrations", count);
        } else {
            println!("No pending migrations");
        }

        Ok(count)
    }

    /// Rollback a specific migration
    pub async fn rollback_migration(&self, version: &str) -> Result<(), MigrationError> {
        let migration = self
            .migrations
            .get(version)
            .ok_or_else(|| MigrationError::MigrationNotFound(version.to_string()))?;

        // Check if migration is applied
        let applied = self.get_applied_migrations().await?;
        if !applied.iter().any(|m| m.version == version) {
            return Err(MigrationError::MigrationNotFound(version.to_string()));
        }

        // Start transaction
        let mut tx = self.pool.begin().await?;

        // Execute the rollback SQL
        sqlx::query(&migration.down_sql)
            .execute(&mut *tx)
            .await?;

        // Remove migration record
        sqlx::query("DELETE FROM schema_migrations WHERE version = ?")
            .bind(version)
            .execute(&mut *tx)
            .await?;

        // Commit transaction
        tx.commit().await?;

        println!("Rolled back migration: {} - {}", migration.version, migration.name);
        Ok(())
    }

    /// Get migration status
    pub async fn status(&self) -> Result<(), MigrationError> {
        let applied = self.get_applied_migrations().await?;
        let pending = self.get_pending_migrations().await?;

        println!("Migration Status:");
        println!("================");
        
        if applied.is_empty() && pending.is_empty() {
            println!("No migrations found");
            return Ok(());
        }

        if !applied.is_empty() {
            println!("\nApplied migrations:");
            for migration in applied {
                println!("  ✓ {} - {} (applied: {})", 
                    migration.version, 
                    migration.name, 
                    migration.applied_at.format("%Y-%m-%d %H:%M:%S")
                );
            }
        }

        if !pending.is_empty() {
            println!("\nPending migrations:");
            for migration in pending {
                println!("  ○ {} - {}", migration.version, migration.name);
            }
        }

        Ok(())
    }

    /// Register all initial migrations
    fn register_initial_migrations(&mut self) {
        // Migration 001: Initial schema
        let migration_001 = Migration {
            version: "001".to_string(),
            name: "initial_schema".to_string(),
            description: "Create initial database schema for case studies, users, and configurations".to_string(),
            up_sql: include_str!("../../schema.sql").to_string(),
            down_sql: r#"
                -- Drop all tables in reverse dependency order
                DROP VIEW IF EXISTS user_progress_summary;
                DROP VIEW IF EXISTS case_study_summary;
                DROP TABLE IF EXISTS collection_case_studies;
                DROP TABLE IF EXISTS collections;
                DROP TABLE IF EXISTS attachments;
                DROP TABLE IF EXISTS app_settings;
                DROP TABLE IF EXISTS user_progress;
                DROP TABLE IF EXISTS generation_history;
                DROP TABLE IF EXISTS assessment_questions;
                DROP TABLE IF EXISTS case_studies;
                DROP TABLE IF EXISTS configuration_templates;
                DROP TABLE IF EXISTS domains;
                DROP TABLE IF EXISTS users;
            "#.to_string(),
            dependencies: vec![],
            created_at: Utc::now(),
        };

        self.register_migration(migration_001);

        // Migration 002: Add indexes for performance (example future migration)
        let migration_002 = Migration {
            version: "002".to_string(),
            name: "add_performance_indexes".to_string(),
            description: "Add additional indexes for improved query performance".to_string(),
            up_sql: r#"
                -- Additional performance indexes
                CREATE INDEX IF NOT EXISTS idx_case_studies_tags ON case_studies(tags);
                CREATE INDEX IF NOT EXISTS idx_case_studies_difficulty ON case_studies(difficulty_level);
                CREATE INDEX IF NOT EXISTS idx_user_progress_status_score ON user_progress(status, score);
                CREATE INDEX IF NOT EXISTS idx_generation_history_created_at ON generation_history(created_at);
            "#.to_string(),
            down_sql: r#"
                DROP INDEX IF EXISTS idx_case_studies_tags;
                DROP INDEX IF EXISTS idx_case_studies_difficulty;
                DROP INDEX IF EXISTS idx_user_progress_status_score;
                DROP INDEX IF EXISTS idx_generation_history_created_at;
            "#.to_string(),
            dependencies: vec!["001".to_string()],
            created_at: Utc::now(),
        };

        self.register_migration(migration_002);
    }
}

/// CLI-style migration runner for development and deployment
pub struct MigrationRunner;

impl MigrationRunner {
    /// Run migrations with command-line style interface
    pub async fn run(pool: SqlitePool, command: &str) -> Result<(), MigrationError> {
        let manager = MigrationManager::new(pool);
        manager.initialize().await?;

        match command {
            "migrate" | "up" => {
                manager.migrate().await?;
            }
            "status" => {
                manager.status().await?;
            }
            cmd if cmd.starts_with("rollback:") => {
                let version = cmd.strip_prefix("rollback:").unwrap();
                manager.rollback_migration(version).await?;
            }
            _ => {
                println!("Unknown migration command: {}", command);
                println!("Available commands: migrate, status, rollback:<version>");
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn test_migration_creation() {
        let migration = Migration {
            version: "001".to_string(),
            name: "test_migration".to_string(),
            description: "Test migration".to_string(),
            up_sql: "CREATE TABLE test (id INTEGER);".to_string(),
            down_sql: "DROP TABLE test;".to_string(),
            dependencies: vec![],
            created_at: Utc::now(),
        };

        assert_eq!(migration.version, "001");
        assert_eq!(migration.name, "test_migration");
        assert!(!migration.up_sql.is_empty());
        assert!(!migration.down_sql.is_empty());
    }
}