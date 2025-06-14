// Repository implementations with encryption support for sensitive fields

use crate::database::models::*;
use crate::encryption::{EncryptionManager, field_encryption};
use sqlx::{SqlitePool, Row};
use std::sync::Arc;

pub type Result<T> = std::result::Result<T, sqlx::Error>;

/// User repository with encryption support for sensitive fields
pub struct EncryptedUserRepository {
    pool: SqlitePool,
    encryption_manager: Arc<EncryptionManager>,
}

impl EncryptedUserRepository {
    pub fn new(pool: SqlitePool, encryption_manager: Arc<EncryptionManager>) -> Self {
        Self { pool, encryption_manager }
    }

    pub async fn create(&self, mut user: NewUser) -> Result<User> {
        // Encrypt sensitive fields
        if let Some(ref email) = user.email {
            user.email = Some(field_encryption::encrypt_if_sensitive(
                &self.encryption_manager, 
                "email", 
                email
            ).map_err(|e| sqlx::Error::Protocol(e.to_string()))?);
        }

        if let Some(ref preferences) = user.preferences {
            user.preferences = Some(field_encryption::encrypt_if_sensitive(
                &self.encryption_manager, 
                "preferences", 
                preferences
            ).map_err(|e| sqlx::Error::Protocol(e.to_string()))?);
        }

        let result = sqlx::query_as!(
            User,
            r#"
            INSERT INTO users (username, email, full_name, password_hash, role, preferences, created_at, updated_at)
            VALUES (?, ?, ?, ?, COALESCE(?, 'user'), ?, datetime('now'), datetime('now'))
            RETURNING id, username, email, full_name, password_hash, role, preferences, 
                     created_at as "created_at: DateTime<Utc>", 
                     updated_at as "updated_at: DateTime<Utc>"
            "#,
            user.username,
            user.email,
            user.full_name,
            user.password_hash,
            user.role,
            user.preferences
        )
        .fetch_one(&self.pool)
        .await?;

        // Decrypt fields for return
        self.decrypt_user_fields(result).await
    }

    pub async fn find_by_id(&self, id: i64) -> Result<Option<User>> {
        let user = sqlx::query_as!(
            User,
            r#"
            SELECT id, username, email, full_name, password_hash, role, preferences,
                   created_at as "created_at: DateTime<Utc>", 
                   updated_at as "updated_at: DateTime<Utc>"
            FROM users WHERE id = ?
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await?;

        match user {
            Some(u) => Ok(Some(self.decrypt_user_fields(u).await?)),
            None => Ok(None),
        }
    }

    pub async fn find_by_username(&self, username: &str) -> Result<Option<User>> {
        let user = sqlx::query_as!(
            User,
            r#"
            SELECT id, username, email, full_name, password_hash, role, preferences,
                   created_at as "created_at: DateTime<Utc>", 
                   updated_at as "updated_at: DateTime<Utc>"
            FROM users WHERE username = ?
            "#,
            username
        )
        .fetch_optional(&self.pool)
        .await?;

        match user {
            Some(u) => Ok(Some(self.decrypt_user_fields(u).await?)),
            None => Ok(None),
        }
    }

    pub async fn list_all(&self) -> Result<Vec<User>> {
        let users = sqlx::query_as!(
            User,
            r#"
            SELECT id, username, email, full_name, password_hash, role, preferences,
                   created_at as "created_at: DateTime<Utc>", 
                   updated_at as "updated_at: DateTime<Utc>"
            FROM users ORDER BY created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let mut decrypted_users = Vec::new();
        for user in users {
            decrypted_users.push(self.decrypt_user_fields(user).await?);
        }
        Ok(decrypted_users)
    }

    pub async fn update_preferences(&self, id: i64, preferences: &str) -> Result<bool> {
        let encrypted_preferences = field_encryption::encrypt_if_sensitive(
            &self.encryption_manager,
            "preferences",
            preferences
        ).map_err(|e| sqlx::Error::Protocol(e.to_string()))?;

        let result = sqlx::query!(
            r#"
            UPDATE users 
            SET preferences = ?, updated_at = datetime('now')
            WHERE id = ?
            "#,
            encrypted_preferences,
            id
        )
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Decrypt sensitive fields in a user record
    async fn decrypt_user_fields(&self, mut user: User) -> Result<User> {
        if let Some(ref email) = user.email {
            user.email = Some(field_encryption::decrypt_if_encrypted(
                &self.encryption_manager,
                "email",
                email
            ).map_err(|e| sqlx::Error::Protocol(e.to_string()))?);
        }

        if let Some(ref preferences) = user.preferences {
            user.preferences = Some(field_encryption::decrypt_if_encrypted(
                &self.encryption_manager,
                "preferences",
                preferences
            ).map_err(|e| sqlx::Error::Protocol(e.to_string()))?);
        }

        Ok(user)
    }
}

/// User progress repository with encryption for answers and feedback
pub struct EncryptedUserProgressRepository {
    pool: SqlitePool,
    encryption_manager: Arc<EncryptionManager>,
}

impl EncryptedUserProgressRepository {
    pub fn new(pool: SqlitePool, encryption_manager: Arc<EncryptionManager>) -> Self {
        Self { pool, encryption_manager }
    }

    pub async fn create(&self, mut progress: NewUserProgress) -> Result<UserProgress> {
        // Encrypt sensitive fields
        if let Some(ref answers) = progress.answers {
            progress.answers = Some(field_encryption::encrypt_if_sensitive(
                &self.encryption_manager,
                "answers",
                answers
            ).map_err(|e| sqlx::Error::Protocol(e.to_string()))?);
        }

        if let Some(ref feedback) = progress.feedback {
            progress.feedback = Some(field_encryption::encrypt_if_sensitive(
                &self.encryption_manager,
                "feedback",
                feedback
            ).map_err(|e| sqlx::Error::Protocol(e.to_string()))?);
        }

        if let Some(ref notes) = progress.notes {
            progress.notes = Some(field_encryption::encrypt_if_sensitive(
                &self.encryption_manager,
                "notes",
                notes
            ).map_err(|e| sqlx::Error::Protocol(e.to_string()))?);
        }

        let result = sqlx::query_as!(
            UserProgress,
            r#"
            INSERT INTO user_progress (
                user_id, case_study_id, status, time_spent, answers, score, 
                feedback, notes, started_at, last_accessed, created_at
            )
            VALUES (?, ?, COALESCE(?, 'not_started'), COALESCE(?, 0), ?, ?, ?, ?, 
                    COALESCE(?, datetime('now')), datetime('now'), datetime('now'))
            RETURNING id, user_id, case_study_id, status, time_spent, answers, score, 
                     feedback, notes,
                     started_at as "started_at: Option<DateTime<Utc>>",
                     completed_at as "completed_at: Option<DateTime<Utc>>",
                     last_accessed as "last_accessed: DateTime<Utc>",
                     created_at as "created_at: DateTime<Utc>"
            "#,
            progress.user_id,
            progress.case_study_id,
            progress.status,
            progress.time_spent,
            progress.answers,
            progress.score,
            progress.feedback,
            progress.notes,
            progress.started_at
        )
        .fetch_one(&self.pool)
        .await?;

        self.decrypt_progress_fields(result).await
    }

    pub async fn find_by_user_and_case_study(&self, user_id: i64, case_study_id: i64) -> Result<Option<UserProgress>> {
        let progress = sqlx::query_as!(
            UserProgress,
            r#"
            SELECT id, user_id, case_study_id, status, time_spent, answers, score, 
                   feedback, notes,
                   started_at as "started_at: Option<DateTime<Utc>>",
                   completed_at as "completed_at: Option<DateTime<Utc>>",
                   last_accessed as "last_accessed: DateTime<Utc>",
                   created_at as "created_at: DateTime<Utc>"
            FROM user_progress 
            WHERE user_id = ? AND case_study_id = ?
            "#,
            user_id,
            case_study_id
        )
        .fetch_optional(&self.pool)
        .await?;

        match progress {
            Some(p) => Ok(Some(self.decrypt_progress_fields(p).await?)),
            None => Ok(None),
        }
    }

    pub async fn update_answers(&self, user_id: i64, case_study_id: i64, answers: &str) -> Result<bool> {
        let encrypted_answers = field_encryption::encrypt_if_sensitive(
            &self.encryption_manager,
            "answers",
            answers
        ).map_err(|e| sqlx::Error::Protocol(e.to_string()))?;

        let result = sqlx::query!(
            r#"
            UPDATE user_progress 
            SET answers = ?, last_accessed = datetime('now')
            WHERE user_id = ? AND case_study_id = ?
            "#,
            encrypted_answers,
            user_id,
            case_study_id
        )
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Decrypt sensitive fields in a user progress record
    async fn decrypt_progress_fields(&self, mut progress: UserProgress) -> Result<UserProgress> {
        if let Some(ref answers) = progress.answers {
            progress.answers = Some(field_encryption::decrypt_if_encrypted(
                &self.encryption_manager,
                "answers",
                answers
            ).map_err(|e| sqlx::Error::Protocol(e.to_string()))?);
        }

        if let Some(ref feedback) = progress.feedback {
            progress.feedback = Some(field_encryption::decrypt_if_encrypted(
                &self.encryption_manager,
                "feedback",
                feedback
            ).map_err(|e| sqlx::Error::Protocol(e.to_string()))?);
        }

        if let Some(ref notes) = progress.notes {
            progress.notes = Some(field_encryption::decrypt_if_encrypted(
                &self.encryption_manager,
                "notes",
                notes
            ).map_err(|e| sqlx::Error::Protocol(e.to_string()))?);
        }

        Ok(progress)
    }
}

/// App settings repository with encryption for sensitive configuration values
pub struct EncryptedAppSettingRepository {
    pool: SqlitePool,
    encryption_manager: Arc<EncryptionManager>,
}

impl EncryptedAppSettingRepository {
    pub fn new(pool: SqlitePool, encryption_manager: Arc<EncryptionManager>) -> Self {
        Self { pool, encryption_manager }
    }

    pub async fn get_by_key(&self, key: &str) -> Result<Option<AppSetting>> {
        let setting = sqlx::query_as!(
            AppSetting,
            r#"
            SELECT id, key, value, data_type, description, is_user_configurable,
                   created_at as "created_at: DateTime<Utc>",
                   updated_at as "updated_at: DateTime<Utc>"
            FROM app_settings WHERE key = ?
            "#,
            key
        )
        .fetch_optional(&self.pool)
        .await?;

        match setting {
            Some(s) => Ok(Some(self.decrypt_setting_fields(s).await?)),
            None => Ok(None),
        }
    }

    pub async fn set_value(&self, key: &str, value: &str) -> Result<bool> {
        let encrypted_value = if self.is_sensitive_setting(key) {
            field_encryption::encrypt_if_sensitive(
                &self.encryption_manager,
                "secret",
                value
            ).map_err(|e| sqlx::Error::Protocol(e.to_string()))?
        } else {
            value.to_string()
        };

        let result = sqlx::query!(
            r#"
            INSERT INTO app_settings (key, value, data_type, created_at, updated_at)
            VALUES (?, ?, 'string', datetime('now'), datetime('now'))
            ON CONFLICT (key) DO UPDATE SET 
                value = excluded.value,
                updated_at = datetime('now')
            "#,
            key,
            encrypted_value
        )
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn list_user_configurable(&self) -> Result<Vec<AppSetting>> {
        let settings = sqlx::query_as!(
            AppSetting,
            r#"
            SELECT id, key, value, data_type, description, is_user_configurable,
                   created_at as "created_at: DateTime<Utc>",
                   updated_at as "updated_at: DateTime<Utc>"
            FROM app_settings 
            WHERE is_user_configurable = true
            ORDER BY key
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let mut decrypted_settings = Vec::new();
        for setting in settings {
            decrypted_settings.push(self.decrypt_setting_fields(setting).await?);
        }
        Ok(decrypted_settings)
    }

    /// Check if a setting contains sensitive data
    fn is_sensitive_setting(&self, key: &str) -> bool {
        key.to_lowercase().contains("password") ||
        key.to_lowercase().contains("secret") ||
        key.to_lowercase().contains("token") ||
        key.to_lowercase().contains("key") ||
        key.to_lowercase().contains("api")
    }

    /// Decrypt sensitive fields in an app setting record
    async fn decrypt_setting_fields(&self, mut setting: AppSetting) -> Result<AppSetting> {
        if self.is_sensitive_setting(&setting.key) {
            setting.value = field_encryption::decrypt_if_encrypted(
                &self.encryption_manager,
                "secret",
                &setting.value
            ).map_err(|e| sqlx::Error::Protocol(e.to_string()))?;
        }

        Ok(setting)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::encryption::EncryptionManager;
    use std::sync::Arc;

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect(":memory:").await.unwrap();
        
        // Create tables for testing
        sqlx::query(r#"
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT,
                full_name TEXT,
                password_hash TEXT,
                role TEXT NOT NULL DEFAULT 'user',
                preferences TEXT,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        "#)
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_encrypted_user_creation() {
        let pool = setup_test_db().await;
        let app_handle = tauri::test::mock_app().handle();
        let mut encryption_manager = EncryptionManager::new(app_handle);
        encryption_manager.initialize_with_key([42u8; 32]);
        let encryption_manager = Arc::new(encryption_manager);

        let repo = EncryptedUserRepository::new(pool, encryption_manager);

        let new_user = NewUser {
            username: "testuser".to_string(),
            email: Some("test@example.com".to_string()),
            full_name: Some("Test User".to_string()),
            password_hash: Some("hashedpassword".to_string()),
            role: Some("user".to_string()),
            preferences: Some(r#"{"theme": "dark"}"#.to_string()),
        };

        let created_user = repo.create(new_user).await.unwrap();
        assert_eq!(created_user.username, "testuser");
        assert_eq!(created_user.email, Some("test@example.com".to_string()));
    }
}