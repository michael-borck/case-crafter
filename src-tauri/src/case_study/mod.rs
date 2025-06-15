// Case study content management system
// Provides comprehensive case study lifecycle management with versioning, metadata, and search

pub mod manager;
pub mod models;
pub mod repository;
pub mod search;
pub mod version_control;
pub mod commands;

pub use manager::CaseStudyManager;
pub use models::{
    CaseStudy, CaseStudyMetadata, CaseStudyStatus, CaseStudyVersion, 
    NewCaseStudy, UpdateCaseStudy, CaseStudyFilter, CaseStudySearchQuery,
    CaseStudyTag, CaseStudyCategory, CaseStudyStatistics
};
pub use repository::CaseStudyRepository;
pub use search::CaseStudySearchEngine;
pub use version_control::CaseStudyVersionControl;

use crate::database::DatabaseManager;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Errors specific to case study management
#[derive(thiserror::Error, Debug)]
pub enum CaseStudyError {
    #[error("Case study not found: {0}")]
    NotFound(String),
    
    #[error("Case study already exists: {0}")]
    AlreadyExists(String),
    
    #[error("Invalid case study data: {0}")]
    InvalidData(String),
    
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
    
    #[error("Version conflict: {0}")]
    VersionConflict(String),
    
    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),
    
    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),
    
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

pub type Result<T> = std::result::Result<T, CaseStudyError>;