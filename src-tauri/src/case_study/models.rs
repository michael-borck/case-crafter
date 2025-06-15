// Data models for case study content management

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::collections::HashMap;

/// Main case study model
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CaseStudy {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub content: String,
    pub summary: Option<String>,
    pub status: CaseStudyStatus,
    pub category_id: Option<String>,
    pub industry: String,
    pub difficulty_level: String,
    pub duration_minutes: i32,
    pub word_count: i32,
    pub learning_objectives: Vec<String>, // JSON array in DB
    pub metadata: CaseStudyMetadata,
    pub version: i32,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub published_at: Option<DateTime<Utc>>,
    pub archived_at: Option<DateTime<Utc>>,
}

/// Case study status enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::Type)]
#[sqlx(type_name = "case_study_status", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum CaseStudyStatus {
    Draft,
    Review,
    Published,
    Archived,
    Deleted,
}

/// Extended metadata for case studies
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaseStudyMetadata {
    pub company_size: Option<String>,
    pub geographical_context: Option<String>,
    pub time_period: Option<String>,
    pub business_functions: Vec<String>,
    pub key_stakeholders: Vec<String>,
    pub decision_points: Vec<String>,
    pub complexity_score: f64,
    pub estimated_reading_time: i32,
    pub language: String,
    pub source: Option<String>,
    pub ai_generated: bool,
    pub generation_params: Option<serde_json::Value>,
    pub custom_fields: HashMap<String, serde_json::Value>,
}

/// Model for creating new case studies
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewCaseStudy {
    pub title: String,
    pub description: Option<String>,
    pub content: String,
    pub summary: Option<String>,
    pub category_id: Option<String>,
    pub industry: String,
    pub difficulty_level: String,
    pub duration_minutes: i32,
    pub learning_objectives: Vec<String>,
    pub metadata: CaseStudyMetadata,
    pub created_by: Option<String>,
}

/// Model for updating case studies
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCaseStudy {
    pub title: Option<String>,
    pub description: Option<String>,
    pub content: Option<String>,
    pub summary: Option<String>,
    pub category_id: Option<String>,
    pub industry: Option<String>,
    pub difficulty_level: Option<String>,
    pub duration_minutes: Option<i32>,
    pub learning_objectives: Option<Vec<String>>,
    pub metadata: Option<CaseStudyMetadata>,
}

/// Case study version tracking
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CaseStudyVersion {
    pub id: String,
    pub case_study_id: String,
    pub version_number: i32,
    pub title: String,
    pub content: String,
    pub summary: Option<String>,
    pub changes_summary: Option<String>,
    pub metadata: CaseStudyMetadata,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// Case study filtering options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaseStudyFilter {
    pub status: Option<CaseStudyStatus>,
    pub category_id: Option<String>,
    pub industry: Option<String>,
    pub difficulty_level: Option<String>,
    pub created_by: Option<String>,
    pub created_after: Option<DateTime<Utc>>,
    pub created_before: Option<DateTime<Utc>>,
    pub min_duration: Option<i32>,
    pub max_duration: Option<i32>,
    pub min_word_count: Option<i32>,
    pub max_word_count: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub business_functions: Option<Vec<String>>,
    pub has_questions: Option<bool>,
}

/// Search query structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaseStudySearchQuery {
    pub query: String,
    pub filters: Option<CaseStudyFilter>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>, // "asc" or "desc"
    pub limit: Option<i32>,
    pub offset: Option<i32>,
    pub include_content: bool,
    pub include_archived: bool,
}

/// Case study tag model
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CaseStudyTag {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub category: Option<String>,
    pub usage_count: i32,
    pub created_at: DateTime<Utc>,
}

/// Case study category model
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CaseStudyCategory {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub parent_id: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub sort_order: i32,
    pub case_study_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Statistical information about case studies
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaseStudyStatistics {
    pub total_count: i32,
    pub published_count: i32,
    pub draft_count: i32,
    pub archived_count: i32,
    pub average_word_count: f64,
    pub average_duration: f64,
    pub most_popular_industry: Option<String>,
    pub most_popular_difficulty: Option<String>,
    pub categories_distribution: HashMap<String, i32>,
    pub monthly_creation_trend: Vec<MonthlyCount>,
    pub top_tags: Vec<TagUsage>,
}

/// Monthly count for trend analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonthlyCount {
    pub year: i32,
    pub month: i32,
    pub count: i32,
}

/// Tag usage statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagUsage {
    pub tag_name: String,
    pub usage_count: i32,
}

/// Case study relationship mapping
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CaseStudyRelation {
    pub id: String,
    pub case_study_id: String,
    pub related_case_study_id: String,
    pub relation_type: String, // "similar", "prerequisite", "follow_up", "alternative"
    pub strength: f64, // 0.0 to 1.0
    pub created_at: DateTime<Utc>,
}

/// Case study usage analytics
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CaseStudyUsage {
    pub id: String,
    pub case_study_id: String,
    pub user_id: Option<String>,
    pub session_id: Option<String>,
    pub action: String, // "view", "download", "generate_questions", "complete"
    pub duration_seconds: Option<i32>,
    pub metadata: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

/// Case study export format
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaseStudyExport {
    pub format: String, // "json", "pdf", "docx", "html"
    pub include_metadata: bool,
    pub include_questions: bool,
    pub include_analytics: bool,
    pub template: Option<String>,
}

impl Default for CaseStudyMetadata {
    fn default() -> Self {
        Self {
            company_size: None,
            geographical_context: None,
            time_period: None,
            business_functions: Vec::new(),
            key_stakeholders: Vec::new(),
            decision_points: Vec::new(),
            complexity_score: 0.0,
            estimated_reading_time: 0,
            language: "en".to_string(),
            source: None,
            ai_generated: false,
            generation_params: None,
            custom_fields: HashMap::new(),
        }
    }
}

impl Default for CaseStudyFilter {
    fn default() -> Self {
        Self {
            status: None,
            category_id: None,
            industry: None,
            difficulty_level: None,
            created_by: None,
            created_after: None,
            created_before: None,
            min_duration: None,
            max_duration: None,
            min_word_count: None,
            max_word_count: None,
            tags: None,
            business_functions: None,
            has_questions: None,
        }
    }
}

impl Default for CaseStudySearchQuery {
    fn default() -> Self {
        Self {
            query: String::new(),
            filters: None,
            sort_by: Some("updated_at".to_string()),
            sort_order: Some("desc".to_string()),
            limit: Some(20),
            offset: Some(0),
            include_content: true,
            include_archived: false,
        }
    }
}

impl CaseStudy {
    /// Calculate word count from content
    pub fn calculate_word_count(&self) -> i32 {
        self.content.split_whitespace().count() as i32
    }

    /// Estimate reading time in minutes (assuming 200 words per minute)
    pub fn estimate_reading_time(&self) -> i32 {
        (self.word_count as f64 / 200.0).ceil() as i32
    }

    /// Check if case study is editable
    pub fn is_editable(&self) -> bool {
        matches!(self.status, CaseStudyStatus::Draft | CaseStudyStatus::Review)
    }

    /// Check if case study is public
    pub fn is_public(&self) -> bool {
        self.status == CaseStudyStatus::Published
    }

    /// Get display-friendly status
    pub fn status_display(&self) -> &'static str {
        match self.status {
            CaseStudyStatus::Draft => "Draft",
            CaseStudyStatus::Review => "Under Review",
            CaseStudyStatus::Published => "Published",
            CaseStudyStatus::Archived => "Archived",
            CaseStudyStatus::Deleted => "Deleted",
        }
    }
}

impl CaseStudyMetadata {
    /// Add a custom field
    pub fn add_custom_field(&mut self, key: String, value: serde_json::Value) {
        self.custom_fields.insert(key, value);
    }

    /// Get a custom field
    pub fn get_custom_field(&self, key: &str) -> Option<&serde_json::Value> {
        self.custom_fields.get(key)
    }

    /// Remove a custom field
    pub fn remove_custom_field(&mut self, key: &str) -> Option<serde_json::Value> {
        self.custom_fields.remove(key)
    }

    /// Calculate complexity score based on various factors
    pub fn calculate_complexity_score(
        &self, 
        word_count: i32, 
        stakeholder_count: usize,
        decision_point_count: usize,
        business_function_count: usize
    ) -> f64 {
        let length_score = (word_count as f64 / 1000.0).min(3.0);
        let stakeholder_score = (stakeholder_count as f64 * 0.2).min(1.0);
        let decision_score = (decision_point_count as f64 * 0.3).min(1.5);
        let function_score = (business_function_count as f64 * 0.2).min(1.0);
        
        (length_score + stakeholder_score + decision_score + function_score).min(5.0)
    }
}

impl std::fmt::Display for CaseStudyStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CaseStudyStatus::Draft => write!(f, "draft"),
            CaseStudyStatus::Review => write!(f, "review"),
            CaseStudyStatus::Published => write!(f, "published"),
            CaseStudyStatus::Archived => write!(f, "archived"),
            CaseStudyStatus::Deleted => write!(f, "deleted"),
        }
    }
}

impl std::str::FromStr for CaseStudyStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "draft" => Ok(CaseStudyStatus::Draft),
            "review" => Ok(CaseStudyStatus::Review),
            "published" => Ok(CaseStudyStatus::Published),
            "archived" => Ok(CaseStudyStatus::Archived),
            "deleted" => Ok(CaseStudyStatus::Deleted),
            _ => Err(format!("Invalid case study status: {}", s)),
        }
    }
}