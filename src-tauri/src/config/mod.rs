// Configuration system for dynamic input fields and forms

pub mod schema;
pub mod models;
pub mod validation;
pub mod repository;
pub mod commands;

pub use models::*;
pub use schema::*;
pub use validation::*;
pub use repository::ConfigurationRepository;
pub use commands::ConfigurationService;

use thiserror::Error;

#[derive(Error, Debug)]
pub enum ConfigurationError {
    #[error("Schema validation error: {0}")]
    SchemaValidation(String),
    #[error("Field not found: {0}")]
    FieldNotFound(String),
    #[error("Invalid field type: {0}")]
    InvalidFieldType(String),
    #[error("Configuration not found: {0}")]
    ConfigurationNotFound(String),
    #[error("Validation error: {0}")]
    ValidationError(String),
    #[error("Dependency error: {0}")]
    DependencyError(String),
    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),
    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),
}

pub type Result<T> = std::result::Result<T, ConfigurationError>;