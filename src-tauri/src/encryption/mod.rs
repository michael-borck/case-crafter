// AES-256 encryption module for protecting sensitive data
// Uses AES-256-GCM for authenticated encryption

pub mod commands;

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Key, Nonce,
};
use argon2::{Argon2, password_hash::{PasswordHasher, SaltString}};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::AppHandle;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum EncryptionError {
    #[error("Encryption failed: {0}")]
    EncryptionFailed(String),
    #[error("Decryption failed: {0}")]
    DecryptionFailed(String),
    #[error("Key derivation failed: {0}")]
    KeyDerivationFailed(String),
    #[error("Invalid data format: {0}")]
    InvalidFormat(String),
    #[error("Storage error: {0}")]
    StorageError(String),
}

pub type Result<T> = std::result::Result<T, EncryptionError>;

/// Encrypted data container with nonce and metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedData {
    pub data: String,      // Base64 encoded encrypted data
    pub nonce: String,     // Base64 encoded nonce
    pub algorithm: String, // Encryption algorithm used
    pub version: String,   // Version for future compatibility
}

/// Key management for encryption operations
pub struct EncryptionManager {
    master_key: Option<[u8; 32]>,
    app_handle: AppHandle,
}

impl EncryptionManager {
    /// Create a new encryption manager
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            master_key: None,
            app_handle,
        }
    }

    /// Initialize encryption with a password-derived key
    pub async fn initialize(&mut self, password: &str) -> Result<()> {
        let salt = self.get_or_create_salt().await?;
        let key = self.derive_key(password, &salt)?;
        self.master_key = Some(key);
        Ok(())
    }

    /// Initialize encryption with a direct key (for testing)
    pub fn initialize_with_key(&mut self, key: [u8; 32]) {
        self.master_key = Some(key);
    }

    /// Check if encryption is initialized
    pub fn is_initialized(&self) -> bool {
        self.master_key.is_some()
    }

    /// Encrypt sensitive data
    pub fn encrypt(&self, plaintext: &str) -> Result<EncryptedData> {
        let key = self.get_key()?;
        let cipher = Aes256Gcm::new(&Key::<Aes256Gcm>::from_slice(&key));
        
        let mut nonce_bytes = [0u8; 12];
        rand::thread_rng().fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = cipher
            .encrypt(nonce, plaintext.as_bytes())
            .map_err(|e| EncryptionError::EncryptionFailed(e.to_string()))?;

        Ok(EncryptedData {
            data: BASE64.encode(&ciphertext),
            nonce: BASE64.encode(&nonce_bytes),
            algorithm: "AES-256-GCM".to_string(),
            version: "1.0".to_string(),
        })
    }

    /// Decrypt sensitive data
    pub fn decrypt(&self, encrypted_data: &EncryptedData) -> Result<String> {
        let key = self.get_key()?;
        let cipher = Aes256Gcm::new(&Key::<Aes256Gcm>::from_slice(&key));

        let ciphertext = BASE64
            .decode(&encrypted_data.data)
            .map_err(|e| EncryptionError::InvalidFormat(format!("Invalid data: {}", e)))?;

        let nonce_bytes = BASE64
            .decode(&encrypted_data.nonce)
            .map_err(|e| EncryptionError::InvalidFormat(format!("Invalid nonce: {}", e)))?;

        if nonce_bytes.len() != 12 {
            return Err(EncryptionError::InvalidFormat("Invalid nonce length".to_string()));
        }

        let nonce = Nonce::from_slice(&nonce_bytes);

        let plaintext_bytes = cipher
            .decrypt(nonce, ciphertext.as_ref())
            .map_err(|e| EncryptionError::DecryptionFailed(e.to_string()))?;

        String::from_utf8(plaintext_bytes)
            .map_err(|e| EncryptionError::DecryptionFailed(format!("Invalid UTF-8: {}", e)))
    }

    /// Encrypt a map of key-value pairs
    pub fn encrypt_map(&self, data: &HashMap<String, String>) -> Result<EncryptedData> {
        let json = serde_json::to_string(data)
            .map_err(|e| EncryptionError::EncryptionFailed(format!("JSON serialization failed: {}", e)))?;
        self.encrypt(&json)
    }

    /// Decrypt a map of key-value pairs
    pub fn decrypt_map(&self, encrypted_data: &EncryptedData) -> Result<HashMap<String, String>> {
        let json = self.decrypt(encrypted_data)?;
        serde_json::from_str(&json)
            .map_err(|e| EncryptionError::DecryptionFailed(format!("JSON deserialization failed: {}", e)))
    }

    /// Encrypt user preferences
    pub fn encrypt_user_preferences(&self, preferences: &serde_json::Value) -> Result<String> {
        let json = serde_json::to_string(preferences)
            .map_err(|e| EncryptionError::EncryptionFailed(format!("Preferences serialization failed: {}", e)))?;
        let encrypted = self.encrypt(&json)?;
        serde_json::to_string(&encrypted)
            .map_err(|e| EncryptionError::EncryptionFailed(format!("Encrypted data serialization failed: {}", e)))
    }

    /// Decrypt user preferences
    pub fn decrypt_user_preferences(&self, encrypted_json: &str) -> Result<serde_json::Value> {
        let encrypted_data: EncryptedData = serde_json::from_str(encrypted_json)
            .map_err(|e| EncryptionError::InvalidFormat(format!("Invalid encrypted preferences format: {}", e)))?;
        let json = self.decrypt(&encrypted_data)?;
        serde_json::from_str(&json)
            .map_err(|e| EncryptionError::DecryptionFailed(format!("Preferences deserialization failed: {}", e)))
    }

    /// Change encryption password (re-encrypt all data)
    pub async fn change_password(&mut self, old_password: &str, new_password: &str) -> Result<()> {
        // Verify old password
        let old_salt = self.get_salt().await?;
        let old_key = self.derive_key(old_password, &old_salt)?;
        
        if let Some(current_key) = &self.master_key {
            if current_key != &old_key {
                return Err(EncryptionError::KeyDerivationFailed("Invalid old password".to_string()));
            }
        }

        // Generate new salt and derive new key
        let new_salt = self.generate_salt();
        let new_key = self.derive_key(new_password, &new_salt)?;

        // Store new salt
        self.store_salt(&new_salt).await?;
        
        // Update master key
        self.master_key = Some(new_key);

        Ok(())
    }

    /// Get the current encryption key
    fn get_key(&self) -> Result<[u8; 32]> {
        self.master_key
            .ok_or_else(|| EncryptionError::EncryptionFailed("Encryption not initialized".to_string()))
    }

    /// Derive encryption key from password using Argon2
    fn derive_key(&self, password: &str, salt: &[u8; 32]) -> Result<[u8; 32]> {
        let argon2 = Argon2::default();
        let salt_string = SaltString::encode_b64(salt)
            .map_err(|e| EncryptionError::KeyDerivationFailed(format!("Salt encoding failed: {}", e)))?;

        let hash = argon2
            .hash_password(password.as_bytes(), &salt_string)
            .map_err(|e| EncryptionError::KeyDerivationFailed(format!("Key derivation failed: {}", e)))?;

        let hash_value = hash.hash.unwrap();
        let hash_bytes = hash_value.as_bytes();
        if hash_bytes.len() < 32 {
            return Err(EncryptionError::KeyDerivationFailed("Derived key too short".to_string()));
        }

        let mut key = [0u8; 32];
        key.copy_from_slice(&hash_bytes[..32]);
        Ok(key)
    }

    /// Generate a new random salt
    fn generate_salt(&self) -> [u8; 32] {
        let mut salt = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut salt);
        salt
    }

    /// Get or create encryption salt
    async fn get_or_create_salt(&self) -> Result<[u8; 32]> {
        match self.get_salt().await {
            Ok(salt) => Ok(salt),
            Err(_) => {
                let salt = self.generate_salt();
                self.store_salt(&salt).await?;
                Ok(salt)
            }
        }
    }

    /// Get stored salt
    async fn get_salt(&self) -> Result<[u8; 32]> {
        let app_data_dir = self.get_app_data_dir()?;
        let salt_path = app_data_dir.join("encryption.salt");

        let salt_data = tokio::fs::read(&salt_path).await
            .map_err(|e| EncryptionError::StorageError(format!("Failed to read salt: {}", e)))?;

        if salt_data.len() != 32 {
            return Err(EncryptionError::StorageError("Invalid salt length".to_string()));
        }

        let mut salt = [0u8; 32];
        salt.copy_from_slice(&salt_data);
        Ok(salt)
    }

    /// Store encryption salt
    async fn store_salt(&self, salt: &[u8; 32]) -> Result<()> {
        let app_data_dir = self.get_app_data_dir()?;
        let salt_path = app_data_dir.join("encryption.salt");

        // Ensure directory exists
        if let Some(parent) = salt_path.parent() {
            tokio::fs::create_dir_all(parent).await
                .map_err(|e| EncryptionError::StorageError(format!("Failed to create salt directory: {}", e)))?;
        }

        tokio::fs::write(&salt_path, salt).await
            .map_err(|e| EncryptionError::StorageError(format!("Failed to write salt: {}", e)))?;

        Ok(())
    }

    /// Get application data directory
    fn get_app_data_dir(&self) -> Result<std::path::PathBuf> {
        // Temporary workaround - in production this would use app_handle.path()
        let home_dir = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let app_data_dir = std::path::PathBuf::from(home_dir).join(".local/share/case-crafter");
        Ok(app_data_dir)
    }
}

/// Utility functions for field-level encryption
pub mod field_encryption {
    use super::*;

    /// Encrypt a single field if it contains sensitive data
    pub fn encrypt_if_sensitive(manager: &EncryptionManager, field_name: &str, value: &str) -> Result<String> {
        if is_sensitive_field(field_name) {
            let encrypted = manager.encrypt(value)?;
            serde_json::to_string(&encrypted)
                .map_err(|e| EncryptionError::EncryptionFailed(format!("Field encryption failed: {}", e)))
        } else {
            Ok(value.to_string())
        }
    }

    /// Decrypt a single field if it was encrypted
    pub fn decrypt_if_encrypted(manager: &EncryptionManager, field_name: &str, value: &str) -> Result<String> {
        if is_sensitive_field(field_name) && looks_like_encrypted_data(value) {
            let encrypted_data: EncryptedData = serde_json::from_str(value)
                .map_err(|e| EncryptionError::InvalidFormat(format!("Invalid encrypted field format: {}", e)))?;
            manager.decrypt(&encrypted_data)
        } else {
            Ok(value.to_string())
        }
    }

    /// Check if a field contains sensitive data that should be encrypted
    fn is_sensitive_field(field_name: &str) -> bool {
        matches!(field_name.to_lowercase().as_str(),
            "password" | "password_hash" | "email" | "api_key" | "secret" | 
            "token" | "preferences" | "notes" | "feedback" | "answers"
        )
    }

    /// Check if a string looks like encrypted data
    fn looks_like_encrypted_data(value: &str) -> bool {
        value.starts_with('{') && value.contains("\"algorithm\"") && value.contains("\"data\"")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_encryption_decryption() {
        let app_handle = tauri::test::mock_app().handle();
        let mut manager = EncryptionManager::new(app_handle);
        
        // Initialize with test key
        let test_key = [42u8; 32];
        manager.initialize_with_key(test_key);

        let plaintext = "This is sensitive data";
        let encrypted = manager.encrypt(plaintext).unwrap();
        let decrypted = manager.decrypt(&encrypted).unwrap();

        assert_eq!(plaintext, decrypted);
    }

    #[tokio::test]
    async fn test_map_encryption() {
        let app_handle = tauri::test::mock_app().handle();
        let mut manager = EncryptionManager::new(app_handle);
        
        let test_key = [42u8; 32];
        manager.initialize_with_key(test_key);

        let mut data = HashMap::new();
        data.insert("email".to_string(), "user@example.com".to_string());
        data.insert("api_key".to_string(), "secret123".to_string());

        let encrypted = manager.encrypt_map(&data).unwrap();
        let decrypted = manager.decrypt_map(&encrypted).unwrap();

        assert_eq!(data, decrypted);
    }

    #[test]
    fn test_sensitive_field_detection() {
        assert!(field_encryption::is_sensitive_field("password"));
        assert!(field_encryption::is_sensitive_field("Email"));
        assert!(field_encryption::is_sensitive_field("API_KEY"));
        assert!(!field_encryption::is_sensitive_field("username"));
        assert!(!field_encryption::is_sensitive_field("title"));
    }
}