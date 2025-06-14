use sqlx::{sqlite::SqliteConnectOptions, Pool, Sqlite, SqlitePool};
use std::path::Path;
use std::str::FromStr;
use tauri::AppHandle;

use super::migrations::{MigrationManager, MigrationError};

pub struct DatabaseManager {
    pool: SqlitePool,
}

impl DatabaseManager {
    /// Create a new database manager with connection to SQLite database
    pub async fn new(app_handle: &AppHandle) -> Result<Self, sqlx::Error> {
        let db_path = Self::get_database_path(app_handle)?;
        
        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| sqlx::Error::Io(e.into()))?;
        }

        // Create connection options
        let options = SqliteConnectOptions::from_str(&format!("sqlite://{}", db_path.display()))?
            .create_if_missing(true)
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
            .foreign_keys(true)
            .busy_timeout(std::time::Duration::from_secs(30));

        // Create connection pool
        let pool = SqlitePool::connect_with(options).await?;
        
        // Run any pending migrations
        let migration_manager = MigrationManager::new(pool.clone());
        migration_manager.initialize().await
            .map_err(|e| sqlx::Error::Protocol(e.to_string()))?;
        
        migration_manager.migrate().await
            .map_err(|e| sqlx::Error::Protocol(e.to_string()))?;

        Ok(Self { pool })
    }

    /// Get reference to the connection pool
    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    /// Get the database file path based on app data directory
    pub fn get_database_path(app_handle: &AppHandle) -> Result<std::path::PathBuf, sqlx::Error> {
        let app_data_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| sqlx::Error::Protocol(e.to_string()))?;

        let case_crafter_dir = app_data_dir.join("case-crafter");
        let db_path = case_crafter_dir.join("database").join("case_crafter.db");

        Ok(db_path)
    }

    /// Check database connection health
    pub async fn health_check(&self) -> Result<bool, sqlx::Error> {
        sqlx::query("SELECT 1")
            .fetch_one(&self.pool)
            .await?;
        Ok(true)
    }

    /// Get database statistics
    pub async fn get_stats(&self, app_handle: &AppHandle) -> Result<DatabaseStats, sqlx::Error> {
        let user_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
            .fetch_one(&self.pool)
            .await?;

        let case_study_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM case_studies")
            .fetch_one(&self.pool)
            .await?;

        let domain_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM domains")
            .fetch_one(&self.pool)
            .await?;

        let question_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM assessment_questions")
            .fetch_one(&self.pool)
            .await?;

        // Get database file size
        let db_path = Self::get_database_path(app_handle)?;
        let file_size = if db_path.exists() {
            std::fs::metadata(&db_path)
                .map(|m| m.len())
                .unwrap_or(0)
        } else {
            0
        };

        Ok(DatabaseStats {
            user_count: user_count as u32,
            case_study_count: case_study_count as u32,
            domain_count: domain_count as u32,
            question_count: question_count as u32,
            file_size_bytes: file_size,
        })
    }

    /// Run database maintenance tasks
    pub async fn maintenance(&self) -> Result<(), sqlx::Error> {
        // Run VACUUM to defragment the database
        sqlx::query("VACUUM").execute(&self.pool).await?;
        
        // Analyze tables for query optimization
        sqlx::query("ANALYZE").execute(&self.pool).await?;
        
        println!("Database maintenance completed");
        Ok(())
    }

    /// Create a backup of the database
    pub async fn backup(&self, app_handle: &AppHandle, backup_path: &Path) -> Result<(), Box<dyn std::error::Error>> {
        let source_path = Self::get_database_path(app_handle)?;
        
        // Ensure backup directory exists
        if let Some(parent) = backup_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        // Copy the database file
        std::fs::copy(&source_path, backup_path)?;
        
        println!("Database backup created: {}", backup_path.display());
        Ok(())
    }

    /// Restore database from backup
    pub async fn restore(&self, app_handle: &AppHandle, backup_path: &Path) -> Result<(), Box<dyn std::error::Error>> {
        if !backup_path.exists() {
            return Err("Backup file does not exist".into());
        }

        let target_path = Self::get_database_path(app_handle)?;
        
        // Close existing connections (in a real implementation, you'd want to 
        // coordinate this properly with the application state)
        self.pool.close().await;
        
        // Copy backup over current database
        std::fs::copy(backup_path, &target_path)?;
        
        println!("Database restored from: {}", backup_path.display());
        Ok(())
    }

    /// Execute raw SQL (for development/debugging)
    pub async fn execute_raw(&self, sql: &str) -> Result<u64, sqlx::Error> {
        let result = sqlx::query(sql).execute(&self.pool).await?;
        Ok(result.rows_affected())
    }

    /// Run migration commands
    pub async fn migrate(&self, command: &str) -> Result<(), MigrationError> {
        let migration_manager = MigrationManager::new(self.pool.clone());
        migration_manager.initialize().await?;

        match command {
            "up" | "migrate" => {
                migration_manager.migrate().await?;
            }
            "status" => {
                migration_manager.status().await?;
            }
            cmd if cmd.starts_with("rollback:") => {
                let version = cmd.strip_prefix("rollback:").unwrap();
                migration_manager.rollback_migration(version).await?;
            }
            _ => {
                println!("Unknown migration command: {}", command);
                println!("Available commands: migrate, status, rollback:<version>");
            }
        }

        Ok(())
    }
}

#[derive(Debug, serde::Serialize)]
pub struct DatabaseStats {
    pub user_count: u32,
    pub case_study_count: u32,
    pub domain_count: u32,
    pub question_count: u32,
    pub file_size_bytes: u64,
}

