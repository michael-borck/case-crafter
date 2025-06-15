use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// User entity for multi-user support
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub email: Option<String>,
    pub full_name: Option<String>,
    pub password_hash: Option<String>,
    pub role: String,
    pub preferences: Option<String>, // JSON string
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// New user data for creation
#[derive(Debug, Serialize, Deserialize)]
pub struct NewUser {
    pub username: String,
    pub email: Option<String>,
    pub full_name: Option<String>,
    pub password_hash: Option<String>,
    pub role: Option<String>,
    pub preferences: Option<String>,
}

/// User update data
#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateUser {
    pub email: Option<String>,
    pub full_name: Option<String>,
    pub password_hash: Option<String>,
    pub role: Option<String>,
    pub preferences: Option<String>,
}

/// Domain entity for categorizing case studies
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Domain {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// New domain data for creation
#[derive(Debug, Serialize, Deserialize)]
pub struct NewDomain {
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
}

/// Configuration template for dynamic form generation
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ConfigurationTemplate {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub domain_id: Option<i64>,
    pub template_data: String, // JSON schema
    pub is_default: bool,
    pub is_active: bool,
    pub created_by: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// New configuration template data
#[derive(Debug, Serialize, Deserialize)]
pub struct NewConfigurationTemplate {
    pub name: String,
    pub description: Option<String>,
    pub domain_id: Option<i64>,
    pub template_data: String,
    pub is_default: Option<bool>,
    pub is_active: Option<bool>,
    pub created_by: Option<i64>,
}

/// Case study entity - main content
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CaseStudy {
    pub id: i64,
    pub title: String,
    pub description: Option<String>,
    pub domain_id: i64,
    pub template_id: Option<i64>,
    pub difficulty_level: Option<String>,
    pub estimated_duration: Option<i64>, // minutes
    pub learning_objectives: Option<String>, // JSON array
    pub tags: Option<String>, // JSON array
    pub content: String, // Markdown content
    pub background_info: Option<String>,
    pub problem_statement: Option<String>,
    pub analysis_framework: Option<String>,
    pub sample_solution: Option<String>,
    pub metadata: Option<String>, // JSON
    pub status: String,
    pub created_by: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub published_at: Option<DateTime<Utc>>,
}

/// New case study data for creation
#[derive(Debug, Serialize, Deserialize)]
pub struct NewCaseStudy {
    pub title: String,
    pub description: Option<String>,
    pub domain_id: i64,
    pub template_id: Option<i64>,
    pub difficulty_level: Option<String>,
    pub estimated_duration: Option<i64>,
    pub learning_objectives: Option<String>,
    pub tags: Option<String>,
    pub content: String,
    pub background_info: Option<String>,
    pub problem_statement: Option<String>,
    pub analysis_framework: Option<String>,
    pub sample_solution: Option<String>,
    pub metadata: Option<String>,
    pub status: Option<String>,
    pub created_by: i64,
}

/// Case study update data
#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCaseStudy {
    pub title: Option<String>,
    pub description: Option<String>,
    pub domain_id: Option<i64>,
    pub template_id: Option<i64>,
    pub difficulty_level: Option<String>,
    pub estimated_duration: Option<i64>,
    pub learning_objectives: Option<String>,
    pub tags: Option<String>,
    pub content: Option<String>,
    pub background_info: Option<String>,
    pub problem_statement: Option<String>,
    pub analysis_framework: Option<String>,
    pub sample_solution: Option<String>,
    pub metadata: Option<String>,
    pub status: Option<String>,
}

/// Assessment question linked to case studies
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AssessmentQuestion {
    pub id: i64,
    pub case_study_id: i64,
    pub question_text: String,
    pub question_type: String,
    pub options: Option<String>, // JSON array for multiple choice
    pub correct_answer: Option<String>,
    pub sample_answer: Option<String>,
    pub rubric: Option<String>, // JSON rubric
    pub points: i64,
    pub order_index: i64,
    pub is_required: bool,
    pub created_at: DateTime<Utc>,
}

/// New assessment question data
#[derive(Debug, Serialize, Deserialize)]
pub struct NewAssessmentQuestion {
    pub case_study_id: i64,
    pub question_text: String,
    pub question_type: String,
    pub options: Option<String>,
    pub correct_answer: Option<String>,
    pub sample_answer: Option<String>,
    pub rubric: Option<String>,
    pub points: Option<i64>,
    pub order_index: Option<i64>,
    pub is_required: Option<bool>,
}

/// AI generation history and prompts
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GenerationHistory {
    pub id: i64,
    pub case_study_id: Option<i64>,
    pub generation_type: String,
    pub prompt_template: Option<String>,
    pub user_input: Option<String>, // JSON of user inputs
    pub ai_provider: Option<String>,
    pub model_name: Option<String>,
    pub prompt_tokens: Option<i64>,
    pub completion_tokens: Option<i64>,
    pub generation_time_ms: Option<i64>,
    pub success: bool,
    pub error_message: Option<String>,
    pub created_by: Option<i64>,
    pub created_at: DateTime<Utc>,
}

/// New generation history record
#[derive(Debug, Serialize, Deserialize)]
pub struct NewGenerationHistory {
    pub case_study_id: Option<i64>,
    pub generation_type: String,
    pub prompt_template: Option<String>,
    pub user_input: Option<String>,
    pub ai_provider: Option<String>,
    pub model_name: Option<String>,
    pub prompt_tokens: Option<i64>,
    pub completion_tokens: Option<i64>,
    pub generation_time_ms: Option<i64>,
    pub success: Option<bool>,
    pub error_message: Option<String>,
    pub created_by: Option<i64>,
}

/// User learning analytics and progress tracking
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserProgress {
    pub id: i64,
    pub user_id: i64,
    pub case_study_id: i64,
    pub status: String,
    pub time_spent: i64, // seconds
    pub answers: Option<String>, // JSON of user answers
    pub score: Option<f64>, // percentage
    pub feedback: Option<String>,
    pub notes: Option<String>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub last_accessed: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

/// New user progress record
#[derive(Debug, Serialize, Deserialize)]
pub struct NewUserProgress {
    pub user_id: i64,
    pub case_study_id: i64,
    pub status: Option<String>,
    pub time_spent: Option<i64>,
    pub answers: Option<String>,
    pub score: Option<f64>,
    pub feedback: Option<String>,
    pub notes: Option<String>,
    pub started_at: Option<DateTime<Utc>>,
}

/// Application settings and configuration
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AppSetting {
    pub id: i64,
    pub key: String,
    pub value: String,
    pub data_type: String,
    pub description: Option<String>,
    pub is_user_configurable: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// New app setting data
#[derive(Debug, Serialize, Deserialize)]
pub struct NewAppSetting {
    pub key: String,
    pub value: String,
    pub data_type: Option<String>,
    pub description: Option<String>,
    pub is_user_configurable: Option<bool>,
}

/// File attachments for case studies
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Attachment {
    pub id: i64,
    pub case_study_id: i64,
    pub filename: String,
    pub original_name: Option<String>,
    pub file_path: String,
    pub file_size: Option<i64>,
    pub mime_type: Option<String>,
    pub description: Option<String>,
    pub uploaded_by: Option<i64>,
    pub created_at: DateTime<Utc>,
}

/// New attachment data
#[derive(Debug, Serialize, Deserialize)]
pub struct NewAttachment {
    pub case_study_id: i64,
    pub filename: String,
    pub original_name: Option<String>,
    pub file_path: String,
    pub file_size: Option<i64>,
    pub mime_type: Option<String>,
    pub description: Option<String>,
    pub uploaded_by: Option<i64>,
}

/// Collections/playlists of case studies
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Collection {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub is_public: bool,
    pub created_by: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// New collection data
#[derive(Debug, Serialize, Deserialize)]
pub struct NewCollection {
    pub name: String,
    pub description: Option<String>,
    pub is_public: Option<bool>,
    pub created_by: i64,
}

/// Collection-CaseStudy relationship
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CollectionCaseStudy {
    pub collection_id: i64,
    pub case_study_id: i64,
    pub order_index: i64,
    pub added_at: DateTime<Utc>,
}

/// New collection-case study association
#[derive(Debug, Serialize, Deserialize)]
pub struct NewCollectionCaseStudy {
    pub collection_id: i64,
    pub case_study_id: i64,
    pub order_index: Option<i64>,
}

// View models for aggregated data

/// Case study summary view with joined data
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CaseStudySummary {
    pub id: i64,
    pub title: String,
    pub description: Option<String>,
    pub difficulty_level: Option<String>,
    pub estimated_duration: Option<i64>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub domain_name: String,
    pub domain_color: Option<String>,
    pub author: String,
    pub question_count: i64,
}

/// User progress summary with aggregated statistics
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserProgressSummary {
    pub user_id: i64,
    pub username: String,
    pub completed_count: i64,
    pub in_progress_count: i64,
    pub total_attempted: i64,
    pub average_score: Option<f64>,
    pub total_time_spent: i64,
}

// Enums for type safety

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UserRole {
    Admin,
    Instructor,
    User,
}

impl std::fmt::Display for UserRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            UserRole::Admin => write!(f, "admin"),
            UserRole::Instructor => write!(f, "instructor"),
            UserRole::User => write!(f, "user"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DifficultyLevel {
    Beginner,
    Intermediate,
    Advanced,
}

impl std::fmt::Display for DifficultyLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DifficultyLevel::Beginner => write!(f, "beginner"),
            DifficultyLevel::Intermediate => write!(f, "intermediate"),
            DifficultyLevel::Advanced => write!(f, "advanced"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CaseStudyStatus {
    Draft,
    Review,
    Published,
    Archived,
}

impl std::fmt::Display for CaseStudyStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CaseStudyStatus::Draft => write!(f, "draft"),
            CaseStudyStatus::Review => write!(f, "review"),
            CaseStudyStatus::Published => write!(f, "published"),
            CaseStudyStatus::Archived => write!(f, "archived"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum QuestionType {
    MultipleChoice,
    ShortAnswer,
    Essay,
    Analysis,
    Reflection,
}

impl std::fmt::Display for QuestionType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            QuestionType::MultipleChoice => write!(f, "multiple_choice"),
            QuestionType::ShortAnswer => write!(f, "short_answer"),
            QuestionType::Essay => write!(f, "essay"),
            QuestionType::Analysis => write!(f, "analysis"),
            QuestionType::Reflection => write!(f, "reflection"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProgressStatus {
    NotStarted,
    InProgress,
    Completed,
    Reviewed,
}

impl std::fmt::Display for ProgressStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProgressStatus::NotStarted => write!(f, "not_started"),
            ProgressStatus::InProgress => write!(f, "in_progress"),
            ProgressStatus::Completed => write!(f, "completed"),
            ProgressStatus::Reviewed => write!(f, "reviewed"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GenerationType {
    CaseStudy,
    Questions,
    Outline,
    Background,
}

impl std::fmt::Display for GenerationType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            GenerationType::CaseStudy => write!(f, "case_study"),
            GenerationType::Questions => write!(f, "questions"),
            GenerationType::Outline => write!(f, "outline"),
            GenerationType::Background => write!(f, "background"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DataType {
    String,
    Number,
    Boolean,
    Json,
}

impl std::fmt::Display for DataType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DataType::String => write!(f, "string"),
            DataType::Number => write!(f, "number"),
            DataType::Boolean => write!(f, "boolean"),
            DataType::Json => write!(f, "json"),
        }
    }
}

/// Prompt template stored in database
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PromptTemplate {
    pub id: i64,
    pub template_id: String, // UUID for external reference
    pub name: String,
    pub description: String,
    pub category: String,
    pub system_prompt: Option<String>,
    pub user_prompt: String,
    pub variables: String, // JSON array of TemplateVariable
    pub example_values: Option<String>, // JSON object
    pub tags: Option<String>, // JSON array
    pub version: String,
    pub is_active: bool,
    pub is_system_template: bool, // Whether it's a built-in template
    pub created_by: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// New prompt template for creation
#[derive(Debug, Serialize, Deserialize)]
pub struct NewPromptTemplate {
    pub template_id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub system_prompt: Option<String>,
    pub user_prompt: String,
    pub variables: String, // JSON array
    pub example_values: Option<String>, // JSON object
    pub tags: Option<String>, // JSON array
    pub version: Option<String>,
    pub is_active: Option<bool>,
    pub is_system_template: Option<bool>,
    pub created_by: Option<i64>,
}

/// Update data for prompt templates
#[derive(Debug, Serialize, Deserialize)]
pub struct UpdatePromptTemplate {
    pub name: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub system_prompt: Option<String>,
    pub user_prompt: Option<String>,
    pub variables: Option<String>,
    pub example_values: Option<String>,
    pub tags: Option<String>,
    pub version: Option<String>,
    pub is_active: Option<bool>,
}

/// Template usage statistics
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TemplateUsage {
    pub id: i64,
    pub template_id: String,
    pub user_id: Option<i64>,
    pub generation_id: Option<i64>, // Link to generation_history
    pub variables_used: Option<String>, // JSON object
    pub success: bool,
    pub error_message: Option<String>,
    pub execution_time_ms: Option<i64>,
    pub created_at: DateTime<Utc>,
}

/// New template usage record
#[derive(Debug, Serialize, Deserialize)]
pub struct NewTemplateUsage {
    pub template_id: String,
    pub user_id: Option<i64>,
    pub generation_id: Option<i64>,
    pub variables_used: Option<String>,
    pub success: bool,
    pub error_message: Option<String>,
    pub execution_time_ms: Option<i64>,
}

/// Template categories with metadata
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TemplateCategory {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub sort_order: i64,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

/// New template category
#[derive(Debug, Serialize, Deserialize)]
pub struct NewTemplateCategory {
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub sort_order: Option<i64>,
    pub is_active: Option<bool>,
}