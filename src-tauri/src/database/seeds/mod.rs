// Database seeding system for sample data

use crate::database::{DatabaseManager, models::*};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

pub mod sample_data;
pub mod commands;

#[derive(Error, Debug)]
pub enum SeedError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("Seeding error: {0}")]
    Seeding(String),
    #[error("Validation error: {0}")]
    Validation(String),
}

pub type Result<T> = std::result::Result<T, SeedError>;

/// Configuration for database seeding
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeedConfig {
    pub reset_database: bool,
    pub seed_users: bool,
    pub seed_domains: bool,
    pub seed_case_studies: bool,
    pub seed_assessment_questions: bool,
    pub seed_app_settings: bool,
    pub seed_user_progress: bool,
    pub seed_collections: bool,
    pub case_studies_per_domain: usize,
    pub questions_per_case_study: usize,
    pub max_users: usize,
}

impl Default for SeedConfig {
    fn default() -> Self {
        Self {
            reset_database: false,
            seed_users: true,
            seed_domains: true,
            seed_case_studies: true,
            seed_assessment_questions: true,
            seed_app_settings: true,
            seed_user_progress: true,
            seed_collections: true,
            case_studies_per_domain: 5,
            questions_per_case_study: 3,
            max_users: 10,
        }
    }
}

/// Statistics from seeding operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeedStats {
    pub users_created: usize,
    pub domains_created: usize,
    pub case_studies_created: usize,
    pub questions_created: usize,
    pub settings_created: usize,
    pub progress_records_created: usize,
    pub collections_created: usize,
    pub total_records_created: usize,
    pub duration_ms: u64,
}

/// Database seeder for creating sample data
pub struct DatabaseSeeder {
    database_manager: std::sync::Arc<DatabaseManager>,
}

impl DatabaseSeeder {
    pub fn new(database_manager: std::sync::Arc<DatabaseManager>) -> Self {
        Self { database_manager }
    }

    /// Run the complete seeding process
    pub async fn seed(&self, config: SeedConfig) -> Result<SeedStats> {
        let start_time = std::time::Instant::now();
        let mut stats = SeedStats {
            users_created: 0,
            domains_created: 0,
            case_studies_created: 0,
            questions_created: 0,
            settings_created: 0,
            progress_records_created: 0,
            collections_created: 0,
            total_records_created: 0,
            duration_ms: 0,
        };

        println!("Starting database seeding with config: {:?}", config);

        // Reset database if requested
        if config.reset_database {
            self.reset_database().await?;
            println!("Database reset completed");
        }

        // Check if data already exists
        let existing_data = self.check_existing_data().await?;
        if existing_data && !config.reset_database {
            println!("Sample data already exists. Use reset_database=true to recreate.");
            return Ok(stats);
        }

        // Seed in dependency order
        let mut user_ids = Vec::new();
        let mut domain_ids = Vec::new();
        let mut case_study_ids = Vec::new();

        // 1. Seed users first (needed for created_by fields)
        if config.seed_users {
            user_ids = self.seed_users(config.max_users).await?;
            stats.users_created = user_ids.len();
            println!("Created {} users", stats.users_created);
        }

        // 2. Seed domains
        if config.seed_domains {
            domain_ids = self.seed_domains().await?;
            stats.domains_created = domain_ids.len();
            println!("Created {} domains", stats.domains_created);
        }

        // 3. Seed app settings
        if config.seed_app_settings {
            stats.settings_created = self.seed_app_settings().await?;
            println!("Created {} app settings", stats.settings_created);
        }

        // 4. Seed case studies (requires users and domains)
        if config.seed_case_studies && !user_ids.is_empty() && !domain_ids.is_empty() {
            case_study_ids = self.seed_case_studies(&user_ids, &domain_ids, config.case_studies_per_domain).await?;
            stats.case_studies_created = case_study_ids.len();
            println!("Created {} case studies", stats.case_studies_created);
        }

        // 5. Seed assessment questions (requires case studies)
        if config.seed_assessment_questions && !case_study_ids.is_empty() {
            stats.questions_created = self.seed_assessment_questions(&case_study_ids, config.questions_per_case_study).await?;
            println!("Created {} assessment questions", stats.questions_created);
        }

        // 6. Seed user progress (requires users and case studies)
        if config.seed_user_progress && !user_ids.is_empty() && !case_study_ids.is_empty() {
            stats.progress_records_created = self.seed_user_progress(&user_ids, &case_study_ids).await?;
            println!("Created {} user progress records", stats.progress_records_created);
        }

        // 7. Seed collections (requires users and case studies)
        if config.seed_collections && !user_ids.is_empty() && !case_study_ids.is_empty() {
            stats.collections_created = self.seed_collections(&user_ids, &case_study_ids).await?;
            println!("Created {} collections", stats.collections_created);
        }

        stats.total_records_created = stats.users_created + stats.domains_created + 
            stats.case_studies_created + stats.questions_created + stats.settings_created +
            stats.progress_records_created + stats.collections_created;

        stats.duration_ms = start_time.elapsed().as_millis() as u64;

        println!("Database seeding completed in {}ms", stats.duration_ms);
        println!("Total records created: {}", stats.total_records_created);

        Ok(stats)
    }

    /// Reset database by clearing all tables
    async fn reset_database(&self) -> Result<()> {
        let tables = vec![
            "collection_case_studies",
            "collections", 
            "user_progress",
            "assessment_questions",
            "generation_history",
            "attachments",
            "case_studies",
            "configuration_templates",
            "app_settings",
            "domains",
            "users"
        ];

        for table in tables {
            let query = format!("DELETE FROM {}", table);
            sqlx::query(&query)
                .execute(self.database_manager.pool())
                .await?;
        }

        // Reset auto-increment sequences
        sqlx::query("DELETE FROM sqlite_sequence")
            .execute(self.database_manager.pool())
            .await?;

        Ok(())
    }

    /// Check if sample data already exists
    async fn check_existing_data(&self) -> Result<bool> {
        let user_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
            .fetch_one(self.database_manager.pool())
            .await?;

        let domain_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM domains")
            .fetch_one(self.database_manager.pool())
            .await?;

        let case_study_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM case_studies")
            .fetch_one(self.database_manager.pool())
            .await?;

        Ok(user_count.0 > 0 || domain_count.0 > 0 || case_study_count.0 > 0)
    }

    /// Seed sample users
    async fn seed_users(&self, max_users: usize) -> Result<Vec<i64>> {
        let sample_users = sample_data::get_sample_users(max_users);
        let mut user_ids = Vec::new();

        for user_data in sample_users {
            let result = sqlx::query(
                r#"
                INSERT INTO users (username, email, full_name, password_hash, role, preferences, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                "#
            )
            .bind(&user_data.username)
            .bind(&user_data.email)
            .bind(&user_data.full_name)
            .bind(&user_data.password_hash)
            .bind(user_data.role.unwrap_or_else(|| "user".to_string()))
            .bind(&user_data.preferences)
            .execute(self.database_manager.pool())
            .await?;

            user_ids.push(result.last_insert_rowid());
        }

        Ok(user_ids)
    }

    /// Seed sample domains
    async fn seed_domains(&self) -> Result<Vec<i64>> {
        let sample_domains = sample_data::get_sample_domains();
        let mut domain_ids = Vec::new();

        for domain_data in sample_domains {
            let result = sqlx::query(
                r#"
                INSERT INTO domains (name, description, color, icon, created_at)
                VALUES (?, ?, ?, ?, datetime('now'))
                "#
            )
            .bind(&domain_data.name)
            .bind(&domain_data.description)
            .bind(&domain_data.color)
            .bind(&domain_data.icon)
            .execute(self.database_manager.pool())
            .await?;

            domain_ids.push(result.last_insert_rowid());
        }

        Ok(domain_ids)
    }

    /// Seed sample case studies
    async fn seed_case_studies(&self, user_ids: &[i64], domain_ids: &[i64], per_domain: usize) -> Result<Vec<i64>> {
        let mut case_study_ids = Vec::new();
        let sample_case_studies = sample_data::get_sample_case_studies();

        for (domain_index, &domain_id) in domain_ids.iter().enumerate() {
            for i in 0..per_domain {
                if let Some(case_study_template) = sample_case_studies.get(i % sample_case_studies.len()) {
                    let created_by = user_ids[i % user_ids.len()];
                    
                    // Customize case study for the domain
                    let customized_case_study = sample_data::customize_case_study_for_domain(
                        case_study_template, 
                        domain_index, 
                        i
                    );

                    let result = sqlx::query(
                        r#"
                        INSERT INTO case_studies (
                            title, description, domain_id, difficulty_level, estimated_duration,
                            learning_objectives, tags, content, background_info, problem_statement,
                            analysis_framework, sample_solution, metadata, status, created_by,
                            created_at, updated_at
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                        "#
                    )
                    .bind(&customized_case_study.title)
                    .bind(&customized_case_study.description)
                    .bind(domain_id)
                    .bind(&customized_case_study.difficulty_level)
                    .bind(customized_case_study.estimated_duration)
                    .bind(&customized_case_study.learning_objectives)
                    .bind(&customized_case_study.tags)
                    .bind(&customized_case_study.content)
                    .bind(&customized_case_study.background_info)
                    .bind(&customized_case_study.problem_statement)
                    .bind(&customized_case_study.analysis_framework)
                    .bind(&customized_case_study.sample_solution)
                    .bind(&customized_case_study.metadata)
                    .bind(customized_case_study.status.unwrap_or_else(|| "published".to_string()))
                    .bind(created_by)
                    .execute(self.database_manager.pool())
                    .await?;

                    case_study_ids.push(result.last_insert_rowid());
                }
            }
        }

        Ok(case_study_ids)
    }

    /// Seed sample assessment questions
    async fn seed_assessment_questions(&self, case_study_ids: &[i64], per_case_study: usize) -> Result<usize> {
        let mut total_questions = 0;
        let sample_questions = sample_data::get_sample_assessment_questions();

        for &case_study_id in case_study_ids {
            for i in 0..per_case_study {
                if let Some(question_template) = sample_questions.get(i % sample_questions.len()) {
                    let customized_question = sample_data::customize_question_for_case_study(
                        question_template,
                        case_study_id,
                        i
                    );

                    sqlx::query(
                        r#"
                        INSERT INTO assessment_questions (
                            case_study_id, question_text, question_type, options,
                            correct_answer, sample_answer, rubric, points, order_index,
                            is_required, created_at
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                        "#
                    )
                    .bind(case_study_id)
                    .bind(&customized_question.question_text)
                    .bind(&customized_question.question_type)
                    .bind(&customized_question.options)
                    .bind(&customized_question.correct_answer)
                    .bind(&customized_question.sample_answer)
                    .bind(&customized_question.rubric)
                    .bind(customized_question.points.unwrap_or(10))
                    .bind(customized_question.order_index.unwrap_or(i as i64))
                    .bind(customized_question.is_required.unwrap_or(true))
                    .execute(self.database_manager.pool())
                    .await?;

                    total_questions += 1;
                }
            }
        }

        Ok(total_questions)
    }

    /// Seed sample app settings
    async fn seed_app_settings(&self) -> Result<usize> {
        let sample_settings = sample_data::get_sample_app_settings();
        let mut settings_created = 0;

        for setting_data in sample_settings {
            sqlx::query(
                r#"
                INSERT INTO app_settings (key, value, data_type, description, is_user_configurable, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                "#
            )
            .bind(&setting_data.key)
            .bind(&setting_data.value)
            .bind(setting_data.data_type.unwrap_or_else(|| "string".to_string()))
            .bind(&setting_data.description)
            .bind(setting_data.is_user_configurable.unwrap_or(false))
            .execute(self.database_manager.pool())
            .await?;

            settings_created += 1;
        }

        Ok(settings_created)
    }

    /// Seed sample user progress
    async fn seed_user_progress(&self, user_ids: &[i64], case_study_ids: &[i64]) -> Result<usize> {
        let mut progress_created = 0;

        // Create progress for some user-case study combinations
        for (user_index, &user_id) in user_ids.iter().enumerate() {
            let case_studies_to_assign = case_study_ids.len().min(3 + user_index % 5); // Vary assignment count
            
            for i in 0..case_studies_to_assign {
                let case_study_id = case_study_ids[i % case_study_ids.len()];
                let progress_data = sample_data::generate_user_progress(user_id, case_study_id, i);

                // Determine completed_at based on status
                let completed_at = if progress_data.status.as_deref() == Some("completed") || progress_data.status.as_deref() == Some("reviewed") {
                    Some("2024-01-15T10:30:00Z")
                } else {
                    None
                };

                sqlx::query(
                    r#"
                    INSERT INTO user_progress (
                        user_id, case_study_id, status, time_spent, answers, score,
                        feedback, notes, started_at, completed_at, last_accessed, created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                    "#
                )
                .bind(progress_data.user_id)
                .bind(progress_data.case_study_id)
                .bind(&progress_data.status)
                .bind(progress_data.time_spent)
                .bind(&progress_data.answers)
                .bind(progress_data.score)
                .bind(&progress_data.feedback)
                .bind(&progress_data.notes)
                .bind(progress_data.started_at)
                .bind(completed_at)
                .execute(self.database_manager.pool())
                .await?;

                progress_created += 1;
            }
        }

        Ok(progress_created)
    }

    /// Seed sample collections
    async fn seed_collections(&self, user_ids: &[i64], case_study_ids: &[i64]) -> Result<usize> {
        let sample_collections = sample_data::get_sample_collections();
        let mut collections_created = 0;

        for collection_data in sample_collections {
            let created_by = user_ids[collections_created % user_ids.len()];

            let result = sqlx::query(
                r#"
                INSERT INTO collections (name, description, is_public, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
                "#
            )
            .bind(&collection_data.name)
            .bind(&collection_data.description)
            .bind(collection_data.is_public.unwrap_or(true))
            .bind(created_by)
            .execute(self.database_manager.pool())
            .await?;

            let collection_id = result.last_insert_rowid();

            // Add some case studies to each collection
            let case_studies_per_collection = case_study_ids.len().min(5);
            for (index, &case_study_id) in case_study_ids.iter().take(case_studies_per_collection).enumerate() {
                sqlx::query(
                    r#"
                    INSERT INTO collection_case_studies (collection_id, case_study_id, order_index, added_at)
                    VALUES (?, ?, ?, datetime('now'))
                    "#
                )
                .bind(collection_id)
                .bind(case_study_id)
                .bind(index as i64)
                .execute(self.database_manager.pool())
                .await?;
            }

            collections_created += 1;
        }

        Ok(collections_created)
    }

    /// Get seeding statistics
    pub async fn get_current_stats(&self) -> Result<HashMap<String, i64>> {
        let mut stats = HashMap::new();

        let tables = vec![
            "users", "domains", "case_studies", "assessment_questions",
            "app_settings", "user_progress", "collections", "collection_case_studies"
        ];

        for table in tables {
            let query = format!("SELECT COUNT(*) FROM {}", table);
            let count: (i64,) = sqlx::query_as(&query)
                .fetch_one(self.database_manager.pool())
                .await?;
            stats.insert(table.to_string(), count.0);
        }

        Ok(stats)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_seed_config_default() {
        let config = SeedConfig::default();
        assert!(config.seed_users);
        assert!(config.seed_domains);
        assert_eq!(config.case_studies_per_domain, 5);
        assert_eq!(config.max_users, 10);
    }

    #[test]
    fn test_seed_stats_serialization() {
        let stats = SeedStats {
            users_created: 10,
            domains_created: 5,
            case_studies_created: 25,
            questions_created: 75,
            settings_created: 20,
            progress_records_created: 50,
            collections_created: 3,
            total_records_created: 188,
            duration_ms: 1500,
        };

        let json = serde_json::to_string(&stats).unwrap();
        let deserialized: SeedStats = serde_json::from_str(&json).unwrap();
        
        assert_eq!(stats.users_created, deserialized.users_created);
        assert_eq!(stats.total_records_created, deserialized.total_records_created);
    }
}