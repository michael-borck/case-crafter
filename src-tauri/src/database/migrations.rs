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

        // Migration 006: Add AI configuration storage
        let migration_006 = Migration {
            version: "006".to_string(),
            name: "ai_configurations".to_string(),
            description: "Create AI provider configurations storage table".to_string(),
            up_sql: include_str!("migrations/006_ai_configurations.sql").to_string(),
            down_sql: r#"
                -- Drop AI configuration table and index
                DROP INDEX IF EXISTS idx_ai_configurations_updated_at;
                DROP TABLE IF EXISTS ai_configurations;
            "#.to_string(),
            dependencies: vec!["001".to_string()],
            created_at: Utc::now(),
        };

        self.register_migration(migration_006);

        // Migration 009: Add prompt templates for AI generation
        let migration_009 = Migration {
            version: "009".to_string(),
            name: "create_prompt_templates".to_string(),
            description: "Create prompt template management system for case study generation".to_string(),
            up_sql: include_str!("migrations/009_create_prompt_templates.sql").to_string(),
            down_sql: r#"
                -- Drop prompt template related tables and indexes
                DROP TABLE IF EXISTS template_usage;
                DROP TABLE IF EXISTS prompt_templates;
                DROP TABLE IF EXISTS template_categories;
                DROP TRIGGER IF EXISTS update_prompt_templates_updated_at;
            "#.to_string(),
            dependencies: vec!["001".to_string()],
            created_at: Utc::now(),
        };

        self.register_migration(migration_009);

        // Migration 010: Enhanced case study management system
        let migration_010 = Migration {
            version: "010".to_string(),
            name: "enhanced_case_study_management".to_string(),
            description: "Enhance case studies table for advanced content management with versioning and metadata".to_string(),
            up_sql: r#"
                -- First, backup existing case_studies table data if any exists
                CREATE TABLE IF NOT EXISTS case_studies_backup AS SELECT * FROM case_studies;
                
                -- Drop existing case_studies table
                DROP TABLE IF EXISTS case_studies;
                
                -- Create enhanced case_studies table
                CREATE TABLE case_studies (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT,
                    content TEXT NOT NULL,
                    summary TEXT,
                    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived', 'deleted')),
                    category_id TEXT,
                    industry TEXT NOT NULL,
                    difficulty_level TEXT NOT NULL,
                    duration_minutes INTEGER NOT NULL,
                    word_count INTEGER NOT NULL DEFAULT 0,
                    learning_objectives TEXT NOT NULL, -- JSON array
                    metadata TEXT NOT NULL DEFAULT '{}', -- JSON object for enhanced metadata
                    version INTEGER NOT NULL DEFAULT 1,
                    created_by TEXT,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    published_at DATETIME,
                    archived_at DATETIME
                );
                
                -- Create case study versions table for version control
                CREATE TABLE case_study_versions (
                    id TEXT PRIMARY KEY,
                    case_study_id TEXT NOT NULL,
                    version_number INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    summary TEXT,
                    changes_summary TEXT,
                    metadata TEXT NOT NULL DEFAULT '{}',
                    created_by TEXT,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (case_study_id) REFERENCES case_studies(id) ON DELETE CASCADE,
                    UNIQUE(case_study_id, version_number)
                );
                
                -- Create indexes for enhanced performance
                CREATE INDEX idx_case_studies_status ON case_studies(status);
                CREATE INDEX idx_case_studies_industry ON case_studies(industry);
                CREATE INDEX idx_case_studies_difficulty ON case_studies(difficulty_level);
                CREATE INDEX idx_case_studies_created_at ON case_studies(created_at);
                CREATE INDEX idx_case_studies_updated_at ON case_studies(updated_at);
                CREATE INDEX idx_case_studies_word_count ON case_studies(word_count);
                CREATE INDEX idx_case_studies_duration ON case_studies(duration_minutes);
                CREATE INDEX idx_case_studies_category ON case_studies(category_id);
                
                CREATE INDEX idx_case_study_versions_case_study_id ON case_study_versions(case_study_id);
                CREATE INDEX idx_case_study_versions_created_at ON case_study_versions(created_at);
                
                -- Create triggers for automatic updated_at timestamp
                CREATE TRIGGER update_case_studies_updated_at
                    AFTER UPDATE ON case_studies
                    FOR EACH ROW
                    WHEN NEW.updated_at = OLD.updated_at
                BEGIN
                    UPDATE case_studies SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                END;
                
                -- If there was existing data, attempt to migrate it (this is a simple example)
                -- In production, you'd want more sophisticated data migration
                INSERT INTO case_studies (
                    id, title, description, content, summary, status, industry, 
                    difficulty_level, duration_minutes, word_count, learning_objectives, 
                    metadata, created_by, created_at, updated_at
                )
                SELECT 
                    CAST(id AS TEXT) as id,
                    title,
                    description,
                    COALESCE(content, problem_statement, '') as content,
                    COALESCE(background_info, '') as summary,
                    CASE 
                        WHEN status = 'draft' THEN 'draft'
                        WHEN status = 'review' THEN 'review'
                        WHEN status = 'published' THEN 'published'
                        WHEN status = 'archived' THEN 'archived'
                        ELSE 'draft'
                    END as status,
                    'General' as industry, -- Default industry
                    COALESCE(difficulty_level, 'intermediate') as difficulty_level,
                    COALESCE(estimated_duration, 60) as duration_minutes,
                    LENGTH(COALESCE(content, problem_statement, '')) - LENGTH(REPLACE(COALESCE(content, problem_statement, ''), ' ', '')) + 1 as word_count,
                    COALESCE(learning_objectives, '["Critical thinking","Problem solving"]') as learning_objectives,
                    COALESCE(metadata, '{}') as metadata,
                    CAST(created_by AS TEXT) as created_by,
                    created_at,
                    updated_at
                FROM case_studies_backup
                WHERE EXISTS (SELECT 1 FROM case_studies_backup);
                
                -- Drop backup table
                DROP TABLE IF EXISTS case_studies_backup;
            "#.to_string(),
            down_sql: r#"
                -- Drop enhanced tables and indexes
                DROP TRIGGER IF EXISTS update_case_studies_updated_at;
                DROP INDEX IF EXISTS idx_case_studies_status;
                DROP INDEX IF EXISTS idx_case_studies_industry;
                DROP INDEX IF EXISTS idx_case_studies_difficulty;
                DROP INDEX IF EXISTS idx_case_studies_created_at;
                DROP INDEX IF EXISTS idx_case_studies_updated_at;
                DROP INDEX IF EXISTS idx_case_studies_word_count;
                DROP INDEX IF EXISTS idx_case_studies_duration;
                DROP INDEX IF EXISTS idx_case_studies_category;
                DROP INDEX IF EXISTS idx_case_study_versions_case_study_id;
                DROP INDEX IF EXISTS idx_case_study_versions_created_at;
                DROP TABLE IF EXISTS case_study_versions;
                DROP TABLE IF EXISTS case_studies;
                
                -- Restore original schema (simplified)
                CREATE TABLE case_studies (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT,
                    domain_id INTEGER NOT NULL REFERENCES domains(id),
                    template_id INTEGER REFERENCES configuration_templates(id),
                    difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
                    estimated_duration INTEGER,
                    learning_objectives TEXT,
                    tags TEXT,
                    content TEXT NOT NULL,
                    background_info TEXT,
                    problem_statement TEXT,
                    analysis_framework TEXT,
                    sample_solution TEXT,
                    metadata TEXT,
                    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
                    created_by INTEGER NOT NULL REFERENCES users(id),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    published_at DATETIME
                );
            "#.to_string(),
            dependencies: vec!["009".to_string()],
            created_at: Utc::now(),
        };

        self.register_migration(migration_010);

        // Migration 011: Assessment workflow integration
        let migration_011 = Migration {
            version: "011".to_string(),
            name: "assessment_workflows".to_string(),
            description: "Create assessment workflow integration tables for case study assessments".to_string(),
            up_sql: include_str!("migrations/011_assessment_workflows.sql").to_string(),
            down_sql: r#"
                -- Drop assessment integration tables and indexes
                DROP TRIGGER IF EXISTS update_assessment_workflows_updated_at;
                DROP TRIGGER IF EXISTS update_assessment_sessions_updated_at;
                DROP TRIGGER IF EXISTS update_assessment_questions_updated_at;
                DROP INDEX IF EXISTS idx_assessment_workflows_case_study_id;
                DROP INDEX IF EXISTS idx_assessment_workflows_status;
                DROP INDEX IF EXISTS idx_assessment_workflows_difficulty;
                DROP INDEX IF EXISTS idx_assessment_workflows_created_at;
                DROP INDEX IF EXISTS idx_assessment_workflows_updated_at;
                DROP INDEX IF EXISTS idx_assessment_sessions_workflow_id;
                DROP INDEX IF EXISTS idx_assessment_sessions_user_id;
                DROP INDEX IF EXISTS idx_assessment_sessions_state;
                DROP INDEX IF EXISTS idx_assessment_sessions_workflow_user;
                DROP INDEX IF EXISTS idx_assessment_sessions_created_at;
                DROP INDEX IF EXISTS idx_assessment_sessions_last_activity;
                DROP INDEX IF EXISTS idx_assessment_results_session_id;
                DROP INDEX IF EXISTS idx_assessment_results_workflow_id;
                DROP INDEX IF EXISTS idx_assessment_results_user_id;
                DROP INDEX IF EXISTS idx_assessment_results_passed;
                DROP INDEX IF EXISTS idx_assessment_results_generated_at;
                DROP INDEX IF EXISTS idx_assessment_questions_workflow_id;
                DROP INDEX IF EXISTS idx_assessment_questions_type;
                DROP INDEX IF EXISTS idx_assessment_questions_difficulty;
                DROP TABLE IF EXISTS assessment_questions_bank;
                DROP TABLE IF EXISTS assessment_results;
                DROP TABLE IF EXISTS assessment_sessions;
                DROP TABLE IF EXISTS assessment_workflows;
            "#.to_string(),
            dependencies: vec!["010".to_string()],
            created_at: Utc::now(),
        };

        self.register_migration(migration_011);

        // Migration 012: Dynamic Configuration System
        let migration_012 = Migration {
            version: "012".to_string(),
            name: "configuration_system".to_string(),
            description: "Create dynamic configuration system tables for configurable input fields and forms".to_string(),
            up_sql: include_str!("migrations/012_configuration_system.sql").to_string(),
            down_sql: r#"
                -- Drop configuration system tables and indexes
                DROP TRIGGER IF EXISTS update_configurations_updated_at;
                DROP TRIGGER IF EXISTS update_form_submissions_updated_at;
                DROP INDEX IF EXISTS idx_configurations_status;
                DROP INDEX IF EXISTS idx_configurations_category;
                DROP INDEX IF EXISTS idx_configurations_framework;
                DROP INDEX IF EXISTS idx_configurations_is_template;
                DROP INDEX IF EXISTS idx_configurations_difficulty_level;
                DROP INDEX IF EXISTS idx_configurations_locale;
                DROP INDEX IF EXISTS idx_configurations_created_by;
                DROP INDEX IF EXISTS idx_configurations_created_at;
                DROP INDEX IF EXISTS idx_configurations_updated_at;
                DROP INDEX IF EXISTS idx_configuration_usage_configuration_id;
                DROP INDEX IF EXISTS idx_configuration_usage_user_id;
                DROP INDEX IF EXISTS idx_configuration_usage_used_at;
                DROP INDEX IF EXISTS idx_configuration_usage_context;
                DROP INDEX IF EXISTS idx_form_submissions_configuration_id;
                DROP INDEX IF EXISTS idx_form_submissions_user_id;
                DROP INDEX IF EXISTS idx_form_submissions_status;
                DROP INDEX IF EXISTS idx_form_submissions_submitted_at;
                DROP TABLE IF EXISTS form_submissions;
                DROP TABLE IF EXISTS configuration_usage;
                DROP TABLE IF EXISTS configurations;
            "#.to_string(),
            dependencies: vec!["011".to_string()],
            created_at: Utc::now(),
        };

        self.register_migration(migration_012);
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