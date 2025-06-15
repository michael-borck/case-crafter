// Assessment workflow integration module

pub mod models;
pub mod repository;
pub mod workflow;
pub mod session;
pub mod commands;

pub use models::*;
pub use repository::AssessmentRepository;
pub use workflow::AssessmentWorkflow;
pub use session::AssessmentSession;

use thiserror::Error;

#[derive(Error, Debug)]
pub enum AssessmentError {
    #[error("Assessment not found: {0}")]
    NotFound(String),
    #[error("Assessment session error: {0}")]
    SessionError(String),
    #[error("Invalid assessment state: {0}")]
    InvalidState(String),
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
    #[error("Validation error: {0}")]
    ValidationError(String),
    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),
    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),
    #[error("Case study error: {0}")]
    CaseStudyError(String),
    #[error("AI generation error: {0}")]
    AIError(String),
}

pub type Result<T> = std::result::Result<T, AssessmentError>;