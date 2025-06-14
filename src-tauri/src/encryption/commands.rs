// Tauri commands for encryption management

use crate::encryption::{EncryptionManager, EncryptedData};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, State};
use tokio::sync::Mutex;

// Type alias for the encryption manager state
type EncryptionState = Arc<Mutex<EncryptionManager>>;

/// Initialize encryption with a password
#[tauri::command]
pub async fn initialize_encryption(
    password: String,
    encryption_state: State<'_, EncryptionState>,
) -> std::result::Result<bool, String> {
    let mut manager = encryption_state.lock().await;
    manager
        .initialize(&password)
        .await
        .map(|_| true)
        .map_err(|e| e.to_string())
}

/// Check if encryption is initialized
#[tauri::command]
pub async fn is_encryption_initialized(
    encryption_state: State<'_, EncryptionState>,
) -> std::result::Result<bool, String> {
    let manager = encryption_state.lock().await;
    Ok(manager.is_initialized())
}

/// Encrypt a single value
#[tauri::command]
pub async fn encrypt_value(
    value: String,
    encryption_state: State<'_, EncryptionState>,
) -> std::result::Result<EncryptedData, String> {
    let manager = encryption_state.lock().await;
    manager.encrypt(&value).map_err(|e| e.to_string())
}

/// Decrypt a single value
#[tauri::command]
pub async fn decrypt_value(
    encrypted_data: EncryptedData,
    encryption_state: State<'_, EncryptionState>,
) -> std::result::Result<String, String> {
    let manager = encryption_state.lock().await;
    manager.decrypt(&encrypted_data).map_err(|e| e.to_string())
}

/// Encrypt user preferences
#[tauri::command]
pub async fn encrypt_user_preferences(
    preferences: Value,
    encryption_state: State<'_, EncryptionState>,
) -> std::result::Result<String, String> {
    let manager = encryption_state.lock().await;
    manager
        .encrypt_user_preferences(&preferences)
        .map_err(|e| e.to_string())
}

/// Decrypt user preferences
#[tauri::command]
pub async fn decrypt_user_preferences(
    encrypted_preferences: String,
    encryption_state: State<'_, EncryptionState>,
) -> std::result::Result<Value, String> {
    let manager = encryption_state.lock().await;
    manager
        .decrypt_user_preferences(&encrypted_preferences)
        .map_err(|e| e.to_string())
}

/// Encrypt a map of key-value pairs
#[tauri::command]
pub async fn encrypt_map(
    data: HashMap<String, String>,
    encryption_state: State<'_, EncryptionState>,
) -> std::result::Result<EncryptedData, String> {
    let manager = encryption_state.lock().await;
    manager.encrypt_map(&data).map_err(|e| e.to_string())
}

/// Decrypt a map of key-value pairs
#[tauri::command]
pub async fn decrypt_map(
    encrypted_data: EncryptedData,
    encryption_state: State<'_, EncryptionState>,
) -> std::result::Result<HashMap<String, String>, String> {
    let manager = encryption_state.lock().await;
    manager.decrypt_map(&encrypted_data).map_err(|e| e.to_string())
}

/// Change encryption password
#[tauri::command]
pub async fn change_encryption_password(
    old_password: String,
    new_password: String,
    encryption_state: State<'_, EncryptionState>,
) -> std::result::Result<bool, String> {
    let mut manager = encryption_state.lock().await;
    manager
        .change_password(&old_password, &new_password)
        .await
        .map(|_| true)
        .map_err(|e| e.to_string())
}

/// Validate encryption password (check if it can decrypt existing data)
#[tauri::command]
pub async fn validate_encryption_password(
    password: String,
    app_handle: AppHandle,
) -> std::result::Result<bool, String> {
    let mut temp_manager = EncryptionManager::new(app_handle);
    
    match temp_manager.initialize(&password).await {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// Export encryption configuration (for backup purposes)
#[tauri::command]
pub async fn export_encryption_config(
    app_handle: AppHandle,
) -> std::result::Result<HashMap<String, String>, String> {
    let app_data_dir = get_app_data_dir(&app_handle)?;
    let salt_path = app_data_dir.join("encryption.salt");
    
    let mut config = HashMap::new();
    
    if salt_path.exists() {
        config.insert("has_salt".to_string(), "true".to_string());
        config.insert("salt_path".to_string(), salt_path.to_string_lossy().to_string());
    } else {
        config.insert("has_salt".to_string(), "false".to_string());
    }
    
    config.insert("encryption_algorithm".to_string(), "AES-256-GCM".to_string());
    config.insert("key_derivation".to_string(), "Argon2".to_string());
    
    Ok(config)
}

/// Test encryption functionality
#[tauri::command]
pub async fn test_encryption(
    test_data: String,
    encryption_state: State<'_, EncryptionState>,
) -> std::result::Result<bool, String> {
    let manager = encryption_state.lock().await;
    
    if !manager.is_initialized() {
        return Err("Encryption not initialized".to_string());
    }
    
    // Test encryption and decryption
    let encrypted = manager.encrypt(&test_data).map_err(|e| e.to_string())?;
    let decrypted = manager.decrypt(&encrypted).map_err(|e| e.to_string())?;
    
    Ok(test_data == decrypted)
}

/// Get encryption statistics
#[tauri::command]
pub async fn get_encryption_stats(
    app_handle: AppHandle,
) -> std::result::Result<HashMap<String, Value>, String> {
    let app_data_dir = get_app_data_dir(&app_handle)?;
    let salt_path = app_data_dir.join("encryption.salt");
    
    let mut stats = HashMap::new();
    
    stats.insert("algorithm".to_string(), Value::String("AES-256-GCM".to_string()));
    stats.insert("key_derivation".to_string(), Value::String("Argon2".to_string()));
    stats.insert("salt_exists".to_string(), Value::Bool(salt_path.exists()));
    
    if salt_path.exists() {
        if let Ok(metadata) = std::fs::metadata(&salt_path) {
            stats.insert("salt_size_bytes".to_string(), Value::Number(metadata.len().into()));
            if let Ok(modified) = metadata.modified() {
                if let Ok(duration) = modified.duration_since(std::time::UNIX_EPOCH) {
                    stats.insert("salt_created_timestamp".to_string(), Value::Number(duration.as_secs().into()));
                }
            }
        }
    }
    
    stats.insert("nonce_size_bytes".to_string(), Value::Number(12.into()));
    stats.insert("key_size_bytes".to_string(), Value::Number(32.into()));
    
    Ok(stats)
}

// Helper function to get app data directory
fn get_app_data_dir(_app_handle: &AppHandle) -> std::result::Result<std::path::PathBuf, String> {
    // Temporary workaround - in production this would use app_handle.path()
    let home_dir = std::env::var("HOME").map_err(|_| "Could not get home directory".to_string())?;
    let app_data_dir = std::path::PathBuf::from(home_dir).join(".local/share/case-crafter");
    Ok(app_data_dir)
}

/// Setup encryption state for Tauri app
pub fn setup_encryption_state(app_handle: AppHandle) -> EncryptionState {
    let manager = EncryptionManager::new(app_handle);
    Arc::new(Mutex::new(manager))
}

// Note: Tauri command handler generation is done in main.rs
// This function is not needed but kept for reference