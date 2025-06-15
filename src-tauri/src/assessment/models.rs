// Assessment workflow models

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Assessment workflow that connects case studies with questions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssessmentWorkflowModel {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub case_study_id: String,
    pub workflow_type: AssessmentWorkflowType,
    pub configuration: AssessmentConfiguration,
    pub status: AssessmentWorkflowStatus,
    pub estimated_duration: i32, // minutes
    pub difficulty_level: String,
    pub learning_objectives: Vec<String>,
    pub instructions: Option<String>,
    pub metadata: AssessmentMetadata,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub published_at: Option<DateTime<Utc>>,
}

/// Types of assessment workflows
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AssessmentWorkflowType {
    Sequential,     // Questions asked in order
    Adaptive,       // Questions adapt based on previous answers
    Timed,          // Time-constrained assessment
    Interactive,    // Interactive case study exploration
    Portfolio,      // Multiple case studies in sequence
}

/// Status of assessment workflow
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AssessmentWorkflowStatus {
    Draft,
    Review,
    Published,
    Archived,
    Deleted,
}

/// Assessment configuration settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssessmentConfiguration {
    pub time_limit: Option<i32>, // minutes
    pub allow_retakes: bool,
    pub max_attempts: Option<i32>,
    pub randomize_questions: bool,
    pub randomize_options: bool,
    pub show_feedback: bool,
    pub show_correct_answers: bool,
    pub require_all_questions: bool,
    pub passing_score: Option<f64>, // percentage
    pub question_weighting: QuestionWeighting,
    pub navigation_settings: NavigationSettings,
    pub scoring_settings: ScoringSettings,
}

/// Question weighting configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuestionWeighting {
    pub use_equal_weights: bool,
    pub custom_weights: HashMap<String, f64>, // question_id -> weight
    pub difficulty_multipliers: HashMap<String, f64>, // difficulty -> multiplier
}

/// Navigation settings for assessment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationSettings {
    pub allow_backward_navigation: bool,
    pub allow_question_skipping: bool,
    pub show_progress_indicator: bool,
    pub show_question_palette: bool,
    pub auto_submit_on_time_limit: bool,
}

/// Scoring and feedback settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoringSettings {
    pub immediate_feedback: bool,
    pub show_score_during_assessment: bool,
    pub detailed_feedback_on_completion: bool,
    pub show_correct_answers_after: bool,
    pub penalty_for_wrong_answers: Option<f64>,
    pub partial_credit_enabled: bool,
}

/// Enhanced metadata for assessments
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssessmentMetadata {
    pub tags: Vec<String>,
    pub categories: Vec<String>,
    pub target_audience: Vec<String>,
    pub prerequisites: Vec<String>,
    pub competencies_assessed: Vec<String>,
    pub bloom_taxonomy_levels: Vec<String>,
    pub industry_alignment: Option<String>,
    pub certification_mapping: HashMap<String, String>,
    pub accessibility_features: Vec<String>,
    pub language: String,
    pub version: String,
    pub author_notes: Option<String>,
}

/// Assessment session for a user taking an assessment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssessmentSessionModel {
    pub id: String,
    pub workflow_id: String,
    pub user_id: String,
    pub session_state: SessionState,
    pub current_question_id: Option<String>,
    pub responses: HashMap<String, QuestionResponse>,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub last_activity: DateTime<Utc>,
    pub time_spent: i32, // seconds
    pub attempt_number: i32,
    pub completion_percentage: f64,
    pub current_score: Option<f64>,
    pub final_score: Option<f64>,
    pub passed: Option<bool>,
    pub session_data: SessionData,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Session state tracking
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SessionState {
    NotStarted,
    InProgress,
    Paused,
    Completed,
    Submitted,
    TimedOut,
    Abandoned,
}

/// User response to a question
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuestionResponse {
    pub question_id: String,
    pub answer: ResponseAnswer,
    pub response_time: i32, // seconds
    pub attempts: i32,
    pub confidence_level: Option<i32>, // 1-5 scale
    pub flagged_for_review: bool,
    pub submitted_at: DateTime<Utc>,
    pub is_correct: Option<bool>,
    pub partial_credit: Option<f64>,
    pub feedback_shown: bool,
}

/// Different types of answers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ResponseAnswer {
    SingleChoice(String),                    // option_id
    MultipleChoice(Vec<String>),            // option_ids
    TextInput(String),                      // text response
    NumericInput(f64),                      // numeric response
    Essay(String),                          // long text response
    Ranking(Vec<String>),                   // ordered option_ids
    Matching(HashMap<String, String>),      // item_id -> match_id
    TrueFalse(bool),                        // boolean response
    FileUpload(String),                     // file path or reference
}

/// Session-specific data and state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionData {
    pub question_sequence: Vec<String>,     // Actual question order for this session
    pub time_per_question: HashMap<String, i32>, // question_id -> seconds spent
    pub navigation_history: Vec<NavigationEvent>,
    pub bookmarked_questions: Vec<String>,
    pub notes: HashMap<String, String>,     // question_id -> user notes
    pub case_study_interactions: Vec<CaseStudyInteraction>,
    pub adaptive_data: Option<AdaptiveSessionData>,
    pub browser_data: BrowserSessionData,
}

/// Navigation events during assessment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationEvent {
    pub timestamp: DateTime<Utc>,
    pub event_type: NavigationEventType,
    pub from_question: Option<String>,
    pub to_question: Option<String>,
    pub additional_data: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NavigationEventType {
    QuestionViewed,
    QuestionAnswered,
    QuestionSkipped,
    QuestionRevisited,
    SectionCompleted,
    AssessmentPaused,
    AssessmentResumed,
    CaseStudyAccessed,
    HelpRequested,
}

/// Case study interaction tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaseStudyInteraction {
    pub timestamp: DateTime<Utc>,
    pub interaction_type: CaseStudyInteractionType,
    pub section: Option<String>,
    pub duration: i32, // seconds
    pub data: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CaseStudyInteractionType {
    SectionViewed,
    DocumentDownloaded,
    VideoWatched,
    NoteAdded,
    HighlightCreated,
    BookmarkAdded,
    SearchPerformed,
    QuestionReferenced,
}

/// Adaptive assessment session data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdaptiveSessionData {
    pub estimated_ability: f64,
    pub confidence_interval: (f64, f64),
    pub questions_attempted: i32,
    pub questions_correct: i32,
    pub difficulty_progression: Vec<f64>,
    pub stopping_criteria_met: bool,
    pub next_question_difficulty: Option<f64>,
}

/// Browser and technical session data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserSessionData {
    pub user_agent: Option<String>,
    pub screen_resolution: Option<String>,
    pub timezone: Option<String>,
    pub connection_events: Vec<ConnectionEvent>,
    pub performance_metrics: PerformanceMetrics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionEvent {
    pub timestamp: DateTime<Utc>,
    pub event_type: String, // "disconnect", "reconnect", "slow_connection"
    pub duration: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub average_response_time: f64,
    pub page_load_times: Vec<f64>,
    pub network_latency: Option<f64>,
    pub client_errors: Vec<String>,
}

/// Assessment results and analytics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssessmentResult {
    pub session_id: String,
    pub workflow_id: String,
    pub user_id: String,
    pub overall_score: f64,
    pub percentage_score: f64,
    pub passed: bool,
    pub completion_time: i32, // seconds
    pub question_results: Vec<QuestionResult>,
    pub competency_scores: HashMap<String, f64>,
    pub difficulty_performance: HashMap<String, f64>,
    pub time_analysis: TimeAnalysis,
    pub learning_insights: LearningInsights,
    pub recommendations: Vec<LearningRecommendation>,
    pub generated_at: DateTime<Utc>,
}

/// Individual question result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuestionResult {
    pub question_id: String,
    pub correct: bool,
    pub score: f64,
    pub max_score: f64,
    pub response_time: i32,
    pub attempts: i32,
    pub difficulty_level: String,
    pub competencies: Vec<String>,
    pub bloom_level: Option<String>,
}

/// Time analysis for assessment performance
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeAnalysis {
    pub total_time: i32,
    pub effective_time: i32, // excluding pauses
    pub average_time_per_question: f64,
    pub time_distribution: HashMap<String, i32>, // question_id -> time
    pub rushed_questions: Vec<String>, // questions answered too quickly
    pub overtime_questions: Vec<String>, // questions taking too long
}

/// Learning insights derived from assessment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningInsights {
    pub strengths: Vec<String>,
    pub weaknesses: Vec<String>,
    pub knowledge_gaps: Vec<String>,
    pub learning_style_indicators: HashMap<String, f64>,
    pub confidence_patterns: Vec<ConfidencePattern>,
    pub error_patterns: Vec<ErrorPattern>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfidencePattern {
    pub pattern_type: String,
    pub description: String,
    pub questions_affected: Vec<String>,
    pub confidence_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorPattern {
    pub pattern_type: String,
    pub description: String,
    pub frequency: i32,
    pub questions_affected: Vec<String>,
    pub suggested_remediation: String,
}

/// Learning recommendations based on assessment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningRecommendation {
    pub recommendation_type: RecommendationType,
    pub title: String,
    pub description: String,
    pub priority: RecommendationPriority,
    pub estimated_time: Option<i32>, // minutes
    pub resources: Vec<LearningResource>,
    pub success_criteria: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RecommendationType {
    StudyArea,
    PracticeExercise,
    AdditionalReading,
    SkillDevelopment,
    ConceptReview,
    AdvancedTopic,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RecommendationPriority {
    Critical,
    High,
    Medium,
    Low,
    Optional,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningResource {
    pub resource_type: ResourceType,
    pub title: String,
    pub url: Option<String>,
    pub description: Option<String>,
    pub estimated_time: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ResourceType {
    CaseStudy,
    Article,
    Video,
    Exercise,
    Quiz,
    Simulation,
    Book,
    Course,
}

/// New assessment workflow creation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewAssessmentWorkflow {
    pub title: String,
    pub description: Option<String>,
    pub case_study_id: String,
    pub workflow_type: AssessmentWorkflowType,
    pub configuration: AssessmentConfiguration,
    pub estimated_duration: i32,
    pub difficulty_level: String,
    pub learning_objectives: Vec<String>,
    pub instructions: Option<String>,
    pub metadata: AssessmentMetadata,
    pub created_by: Option<String>,
}

/// Assessment workflow update
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateAssessmentWorkflow {
    pub title: Option<String>,
    pub description: Option<String>,
    pub workflow_type: Option<AssessmentWorkflowType>,
    pub configuration: Option<AssessmentConfiguration>,
    pub estimated_duration: Option<i32>,
    pub difficulty_level: Option<String>,
    pub learning_objectives: Option<Vec<String>>,
    pub instructions: Option<String>,
    pub metadata: Option<AssessmentMetadata>,
}

/// Assessment workflow filter for queries
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AssessmentWorkflowFilter {
    pub status: Option<AssessmentWorkflowStatus>,
    pub workflow_type: Option<AssessmentWorkflowType>,
    pub difficulty_level: Option<String>,
    pub case_study_id: Option<String>,
    pub created_by: Option<String>,
    pub created_after: Option<DateTime<Utc>>,
    pub created_before: Option<DateTime<Utc>>,
    pub min_duration: Option<i32>,
    pub max_duration: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub categories: Option<Vec<String>>,
    pub target_audience: Option<Vec<String>>,
}

/// Assessment session filter
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AssessmentSessionFilter {
    pub workflow_id: Option<String>,
    pub user_id: Option<String>,
    pub session_state: Option<SessionState>,
    pub started_after: Option<DateTime<Utc>>,
    pub started_before: Option<DateTime<Utc>>,
    pub completed: Option<bool>,
    pub passed: Option<bool>,
    pub min_score: Option<f64>,
    pub max_score: Option<f64>,
}

/// Assessment statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssessmentStatistics {
    pub total_workflows: i32,
    pub published_workflows: i32,
    pub total_sessions: i32,
    pub completed_sessions: i32,
    pub average_completion_rate: f64,
    pub average_score: f64,
    pub average_time: f64, // minutes
    pub pass_rate: f64,
    pub most_popular_workflow: Option<String>,
    pub difficulty_distribution: HashMap<String, i32>,
    pub workflow_type_distribution: HashMap<String, i32>,
    pub monthly_activity: Vec<MonthlyActivity>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonthlyActivity {
    pub year: i32,
    pub month: i32,
    pub sessions_started: i32,
    pub sessions_completed: i32,
    pub average_score: f64,
}

impl Default for AssessmentConfiguration {
    fn default() -> Self {
        Self {
            time_limit: None,
            allow_retakes: true,
            max_attempts: Some(3),
            randomize_questions: false,
            randomize_options: false,
            show_feedback: true,
            show_correct_answers: true,
            require_all_questions: true,
            passing_score: Some(70.0),
            question_weighting: QuestionWeighting::default(),
            navigation_settings: NavigationSettings::default(),
            scoring_settings: ScoringSettings::default(),
        }
    }
}

impl Default for QuestionWeighting {
    fn default() -> Self {
        Self {
            use_equal_weights: true,
            custom_weights: HashMap::new(),
            difficulty_multipliers: HashMap::new(),
        }
    }
}

impl Default for NavigationSettings {
    fn default() -> Self {
        Self {
            allow_backward_navigation: true,
            allow_question_skipping: false,
            show_progress_indicator: true,
            show_question_palette: true,
            auto_submit_on_time_limit: true,
        }
    }
}

impl Default for ScoringSettings {
    fn default() -> Self {
        Self {
            immediate_feedback: false,
            show_score_during_assessment: false,
            detailed_feedback_on_completion: true,
            show_correct_answers_after: true,
            penalty_for_wrong_answers: None,
            partial_credit_enabled: true,
        }
    }
}

impl Default for AssessmentMetadata {
    fn default() -> Self {
        Self {
            tags: Vec::new(),
            categories: Vec::new(),
            target_audience: Vec::new(),
            prerequisites: Vec::new(),
            competencies_assessed: Vec::new(),
            bloom_taxonomy_levels: Vec::new(),
            industry_alignment: None,
            certification_mapping: HashMap::new(),
            accessibility_features: Vec::new(),
            language: "en".to_string(),
            version: "1.0".to_string(),
            author_notes: None,
        }
    }
}