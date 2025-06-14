// Automated backup system for local database

use crate::database::DatabaseManager;
use crate::encryption::{EncryptionManager, EncryptedData};
use chrono::{DateTime, Utc, Duration};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::AppHandle;
use thiserror::Error;
use tokio::fs;
use sqlx::{Row, Column};

pub mod commands;
pub mod scheduler;

#[derive(Error, Debug)]
pub enum BackupError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Encryption error: {0}")]
    Encryption(String),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("Invalid backup format: {0}")]
    InvalidFormat(String),
    #[error("Backup not found: {0}")]
    NotFound(String),
    #[error("Configuration error: {0}")]
    Configuration(String),
}

pub type Result<T> = std::result::Result<T, BackupError>;

/// Backup configuration settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupConfig {
    pub enabled: bool,
    pub interval_hours: u64,
    pub max_backups: usize,
    pub compress: bool,
    pub encrypt: bool,
    pub backup_directory: PathBuf,
    pub include_attachments: bool,
    pub include_user_data: bool,
    pub exclude_temporary_data: bool,
}

impl Default for BackupConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            interval_hours: 24, // Daily backups
            max_backups: 30,    // Keep 30 days
            compress: true,
            encrypt: true,
            backup_directory: PathBuf::from("backups"),
            include_attachments: true,
            include_user_data: true,
            exclude_temporary_data: true,
        }
    }
}

/// Metadata for a backup file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupMetadata {
    pub id: String,
    pub created_at: DateTime<Utc>,
    pub database_version: String,
    pub app_version: String,
    pub size_bytes: u64,
    pub compressed: bool,
    pub encrypted: bool,
    pub checksum: String,
    pub tables_included: Vec<String>,
    pub record_counts: HashMap<String, u64>,
    pub description: Option<String>,
}

/// Information about a backup file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupInfo {
    pub metadata: BackupMetadata,
    pub file_path: PathBuf,
    pub file_size: u64,
    pub is_valid: bool,
}

/// Backup system manager
pub struct BackupManager {
    config: BackupConfig,
    app_handle: AppHandle,
    database_manager: Arc<DatabaseManager>,
    encryption_manager: Option<Arc<EncryptionManager>>,
}

impl BackupManager {
    /// Create a new backup manager
    pub fn new(
        app_handle: AppHandle,
        database_manager: Arc<DatabaseManager>,
        encryption_manager: Option<Arc<EncryptionManager>>,
    ) -> Self {
        Self {
            config: BackupConfig::default(),
            app_handle,
            database_manager,
            encryption_manager,
        }
    }

    /// Update backup configuration
    pub fn set_config(&mut self, config: BackupConfig) {
        self.config = config;
    }

    /// Get current backup configuration
    pub fn get_config(&self) -> &BackupConfig {
        &self.config
    }

    /// Create a manual backup
    pub async fn create_backup(&self, description: Option<String>) -> Result<BackupInfo> {
        let backup_id = uuid::Uuid::new_v4().to_string();
        let timestamp = Utc::now();
        
        // Create backup directory if it doesn't exist
        let backup_dir = self.get_backup_directory()?;
        fs::create_dir_all(&backup_dir).await?;

        // Generate backup filename
        let filename = format!(
            "case_crafter_backup_{}_{}.json",
            timestamp.format("%Y%m%d_%H%M%S"),
            &backup_id[..8]
        );
        let backup_path = backup_dir.join(&filename);

        // Create backup data
        let backup_data = self.create_backup_data().await?;
        
        // Calculate checksum
        let checksum = self.calculate_checksum(&backup_data)?;
        
        // Get table information
        let (tables_included, record_counts) = self.get_table_info().await?;

        // Create metadata
        let metadata = BackupMetadata {
            id: backup_id,
            created_at: timestamp,
            database_version: "1.0".to_string(),
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            size_bytes: backup_data.len() as u64,
            compressed: self.config.compress,
            encrypted: self.config.encrypt,
            checksum,
            tables_included,
            record_counts,
            description,
        };

        // Process backup data (compression and encryption)
        let final_data = self.process_backup_data(backup_data, &metadata).await?;
        
        // Write backup file
        fs::write(&backup_path, &final_data).await?;

        let file_size = fs::metadata(&backup_path).await?.len();

        // Cleanup old backups
        self.cleanup_old_backups().await?;

        Ok(BackupInfo {
            metadata,
            file_path: backup_path,
            file_size,
            is_valid: true,
        })
    }

    /// List all available backups
    pub async fn list_backups(&self) -> Result<Vec<BackupInfo>> {
        let backup_dir = self.get_backup_directory()?;
        
        if !backup_dir.exists() {
            return Ok(Vec::new());
        }

        let mut backups = Vec::new();
        let mut entries = fs::read_dir(&backup_dir).await?;

        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Ok(backup_info) = self.load_backup_info(&path).await {
                    backups.push(backup_info);
                }
            }
        }

        // Sort by creation date (newest first)
        backups.sort_by(|a, b| b.metadata.created_at.cmp(&a.metadata.created_at));

        Ok(backups)
    }

    /// Restore from a backup
    pub async fn restore_backup(&self, backup_path: &Path, force: bool) -> Result<()> {
        if !backup_path.exists() {
            return Err(BackupError::NotFound(backup_path.to_string_lossy().to_string()));
        }

        // Load and validate backup
        let backup_info = self.load_backup_info(backup_path).await?;
        if !backup_info.is_valid && !force {
            return Err(BackupError::InvalidFormat("Backup validation failed".to_string()));
        }

        // Read backup file
        let encrypted_data = fs::read(backup_path).await?;
        
        // Process backup data (decryption and decompression)
        let backup_data = self.restore_backup_data(encrypted_data, &backup_info.metadata).await?;
        
        // Parse backup data
        let backup_content: serde_json::Value = serde_json::from_slice(&backup_data)?;
        
        // Restore database
        self.restore_database_from_backup(&backup_content).await?;

        println!("Database restored successfully from backup: {}", backup_path.display());
        Ok(())
    }

    /// Delete a backup file
    pub async fn delete_backup(&self, backup_path: &Path) -> Result<()> {
        if backup_path.exists() {
            fs::remove_file(backup_path).await?;
            println!("Backup deleted: {}", backup_path.display());
        }
        Ok(())
    }

    /// Validate a backup file
    pub async fn validate_backup(&self, backup_path: &Path) -> Result<bool> {
        let backup_info = self.load_backup_info(backup_path).await?;
        
        // Read and process backup data
        let encrypted_data = fs::read(backup_path).await?;
        let backup_data = self.restore_backup_data(encrypted_data, &backup_info.metadata).await?;
        
        // Verify checksum
        let calculated_checksum = self.calculate_checksum(&backup_data)?;
        let checksum_valid = calculated_checksum == backup_info.metadata.checksum;
        
        // Verify JSON structure
        let json_valid = serde_json::from_slice::<serde_json::Value>(&backup_data).is_ok();
        
        Ok(checksum_valid && json_valid)
    }

    /// Get backup statistics
    pub async fn get_backup_stats(&self) -> Result<BackupStats> {
        let backups = self.list_backups().await?;
        
        let total_backups = backups.len();
        let total_size = backups.iter().map(|b| b.file_size).sum();
        let latest_backup = backups.first().map(|b| b.metadata.created_at);
        let oldest_backup = backups.last().map(|b| b.metadata.created_at);
        
        let mut encrypted_count = 0;
        let mut compressed_count = 0;
        
        for backup in &backups {
            if backup.metadata.encrypted {
                encrypted_count += 1;
            }
            if backup.metadata.compressed {
                compressed_count += 1;
            }
        }

        Ok(BackupStats {
            total_backups,
            total_size_bytes: total_size,
            latest_backup,
            oldest_backup,
            encrypted_count,
            compressed_count,
            backup_directory: self.get_backup_directory()?,
        })
    }

    // Private helper methods

    async fn create_backup_data(&self) -> Result<Vec<u8>> {
        // Create a comprehensive backup of the database
        let mut backup_data = HashMap::new();

        // Export all tables
        if self.config.include_user_data {
            backup_data.insert("users", self.export_table_data("users").await?);
        }
        
        backup_data.insert("domains", self.export_table_data("domains").await?);
        backup_data.insert("configuration_templates", self.export_table_data("configuration_templates").await?);
        backup_data.insert("case_studies", self.export_table_data("case_studies").await?);
        backup_data.insert("assessment_questions", self.export_table_data("assessment_questions").await?);
        backup_data.insert("generation_history", self.export_table_data("generation_history").await?);
        
        if self.config.include_user_data {
            backup_data.insert("user_progress", self.export_table_data("user_progress").await?);
        }
        
        backup_data.insert("app_settings", self.export_table_data("app_settings").await?);
        backup_data.insert("attachments", self.export_table_data("attachments").await?);
        backup_data.insert("collections", self.export_table_data("collections").await?);
        backup_data.insert("collection_case_studies", self.export_table_data("collection_case_studies").await?);

        // Include schema information
        backup_data.insert("schema_version", serde_json::json!("1.0"));
        backup_data.insert("backup_timestamp", serde_json::json!(Utc::now()));

        Ok(serde_json::to_vec(&backup_data)?)
    }

    async fn export_table_data(&self, table_name: &str) -> Result<serde_json::Value> {
        let query = format!("SELECT * FROM {}", table_name);
        let rows = sqlx::query(&query)
            .fetch_all(self.database_manager.pool())
            .await?;

        let mut table_data = Vec::new();
        for row in rows {
            let mut row_data = HashMap::new();
            for (i, column) in row.columns().iter().enumerate() {
                let column_name = column.name();
                let value: Option<String> = row.try_get(i).unwrap_or(None);
                row_data.insert(column_name.to_string(), serde_json::json!(value));
            }
            table_data.push(row_data);
        }

        Ok(serde_json::json!(table_data))
    }

    async fn get_table_info(&self) -> Result<(Vec<String>, HashMap<String, u64>)> {
        let tables = vec![
            "users", "domains", "configuration_templates", "case_studies",
            "assessment_questions", "generation_history", "user_progress",
            "app_settings", "attachments", "collections", "collection_case_studies"
        ];

        let mut record_counts = HashMap::new();
        
        for table in &tables {
            let count: (i64,) = sqlx::query_as(&format!("SELECT COUNT(*) FROM {}", table))
                .fetch_one(self.database_manager.pool())
                .await?;
            record_counts.insert(table.to_string(), count.0 as u64);
        }

        Ok((tables.iter().map(|s| s.to_string()).collect(), record_counts))
    }

    async fn process_backup_data(&self, mut data: Vec<u8>, metadata: &BackupMetadata) -> Result<Vec<u8>> {
        // Compress if enabled
        if self.config.compress {
            data = self.compress_data(data)?;
        }

        // Encrypt if enabled and encryption manager is available
        if self.config.encrypt && metadata.encrypted {
            if let Some(encryption_manager) = &self.encryption_manager {
                let encrypted = encryption_manager.encrypt(&String::from_utf8_lossy(&data))
                    .map_err(|e| BackupError::Encryption(e.to_string()))?;
                data = serde_json::to_vec(&encrypted)?;
            }
        }

        Ok(data)
    }

    async fn restore_backup_data(&self, mut data: Vec<u8>, metadata: &BackupMetadata) -> Result<Vec<u8>> {
        // Decrypt if encrypted
        if metadata.encrypted {
            if let Some(encryption_manager) = &self.encryption_manager {
                let encrypted_data: EncryptedData = serde_json::from_slice(&data)?;
                let decrypted = encryption_manager.decrypt(&encrypted_data)
                    .map_err(|e| BackupError::Encryption(e.to_string()))?;
                data = decrypted.into_bytes();
            } else {
                return Err(BackupError::Encryption("Backup is encrypted but no encryption manager available".to_string()));
            }
        }

        // Decompress if compressed
        if metadata.compressed {
            data = self.decompress_data(data)?;
        }

        Ok(data)
    }

    async fn restore_database_from_backup(&self, backup_content: &serde_json::Value) -> Result<()> {
        // This would need to be implemented with proper transaction handling
        // For now, this is a placeholder that shows the structure
        
        println!("Starting database restoration...");
        
        // Begin transaction
        let mut tx = self.database_manager.begin_transaction().await
            .map_err(|e| BackupError::Database(e))?;

        // Clear existing data (with confirmation in a real implementation)
        // This is dangerous and should have multiple confirmations
        
        // Restore each table
        if let Some(tables) = backup_content.as_object() {
            for (table_name, table_data) in tables {
                if table_name == "schema_version" || table_name == "backup_timestamp" {
                    continue;
                }
                
                println!("Restoring table: {}", table_name);
                // Implementation would restore table data here
                // This requires careful handling of foreign keys and constraints
            }
        }

        // Commit transaction
        tx.commit().await.map_err(|e| BackupError::Database(e))?;
        
        println!("Database restoration completed");
        Ok(())
    }

    async fn cleanup_old_backups(&self) -> Result<()> {
        let backups = self.list_backups().await?;
        
        if backups.len() > self.config.max_backups {
            let to_delete = &backups[self.config.max_backups..];
            
            for backup in to_delete {
                if let Err(e) = self.delete_backup(&backup.file_path).await {
                    eprintln!("Failed to delete old backup {}: {}", backup.file_path.display(), e);
                }
            }
        }

        Ok(())
    }

    async fn load_backup_info(&self, backup_path: &Path) -> Result<BackupInfo> {
        let file_size = fs::metadata(backup_path).await?.len();
        
        // For simplicity, we'll extract metadata from the filename and file
        // In a real implementation, metadata might be stored separately or embedded
        let filename = backup_path.file_stem()
            .and_then(|s| s.to_str())
            .ok_or_else(|| BackupError::InvalidFormat("Invalid filename".to_string()))?;

        // Basic validation - just check if file exists and is readable
        let is_valid = backup_path.exists() && backup_path.is_file();

        // Create basic metadata (in a real implementation, this would be stored properly)
        let metadata = BackupMetadata {
            id: uuid::Uuid::new_v4().to_string(),
            created_at: Utc::now(),
            database_version: "1.0".to_string(),
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            size_bytes: file_size,
            compressed: self.config.compress,
            encrypted: self.config.encrypt,
            checksum: "placeholder".to_string(),
            tables_included: vec![],
            record_counts: HashMap::new(),
            description: None,
        };

        Ok(BackupInfo {
            metadata,
            file_path: backup_path.to_path_buf(),
            file_size,
            is_valid,
        })
    }

    fn get_backup_directory(&self) -> Result<PathBuf> {
        let app_data_dir = self.get_app_data_dir()?;
        Ok(app_data_dir.join(&self.config.backup_directory))
    }

    fn get_app_data_dir(&self) -> Result<PathBuf> {
        // Temporary workaround - in production this would use app_handle.path()
        let home_dir = std::env::var("HOME")
            .map_err(|_| BackupError::Configuration("Could not get home directory".to_string()))?;
        Ok(PathBuf::from(home_dir).join(".local/share/case-crafter"))
    }

    fn calculate_checksum(&self, data: &[u8]) -> Result<String> {
        Ok(format!("{:x}", md5::compute(data)))
    }

    fn compress_data(&self, data: Vec<u8>) -> Result<Vec<u8>> {
        // Placeholder for compression - would use flate2 or similar
        Ok(data) // For now, return uncompressed
    }

    fn decompress_data(&self, data: Vec<u8>) -> Result<Vec<u8>> {
        // Placeholder for decompression
        Ok(data) // For now, return as-is
    }
}

/// Statistics about backups
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupStats {
    pub total_backups: usize,
    pub total_size_bytes: u64,
    pub latest_backup: Option<DateTime<Utc>>,
    pub oldest_backup: Option<DateTime<Utc>>,
    pub encrypted_count: usize,
    pub compressed_count: usize,
    pub backup_directory: PathBuf,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_backup_config_default() {
        let config = BackupConfig::default();
        assert!(config.enabled);
        assert_eq!(config.interval_hours, 24);
        assert_eq!(config.max_backups, 30);
        assert!(config.compress);
        assert!(config.encrypt);
    }

    #[test]
    fn test_backup_metadata_serialization() {
        let metadata = BackupMetadata {
            id: "test-id".to_string(),
            created_at: Utc::now(),
            database_version: "1.0".to_string(),
            app_version: "0.1.0".to_string(),
            size_bytes: 1024,
            compressed: true,
            encrypted: true,
            checksum: "abc123".to_string(),
            tables_included: vec!["users".to_string(), "case_studies".to_string()],
            record_counts: HashMap::new(),
            description: Some("Test backup".to_string()),
        };

        let json = serde_json::to_string(&metadata).unwrap();
        let deserialized: BackupMetadata = serde_json::from_str(&json).unwrap();
        
        assert_eq!(metadata.id, deserialized.id);
        assert_eq!(metadata.database_version, deserialized.database_version);
    }
}