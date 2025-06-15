// Error types for AI provider abstraction layer

use thiserror::Error;

/// AI-related error types
#[derive(Error, Debug)]
pub enum AIError {
    #[error("Provider not initialized")]
    ProviderNotInitialized,

    #[error("Configuration error: {0}")]
    ConfigurationError(String),

    #[error("Provider error: {0}")]
    ProviderError(String),

    #[error("Network error: {0}")]
    NetworkError(String),

    #[error("Authentication error: {0}")]
    AuthenticationError(String),

    #[error("Rate limit exceeded: {0}")]
    RateLimitError(String),

    #[error("Invalid request: {0}")]
    InvalidRequest(String),

    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("Parsing error: {0}")]
    ParsingError(String),

    #[error("Template error: {0}")]
    TemplateError(String),

    #[error("Model not found: {0}")]
    ModelNotFound(String),

    #[error("Quota exceeded: {0}")]
    QuotaExceeded(String),

    #[error("Timeout error: {0}")]
    TimeoutError(String),

    #[error("Streaming error: {0}")]
    StreamingError(String),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("HTTP error: {0}")]
    HttpError(#[from] reqwest::Error),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Unknown error: {0}")]
    Unknown(String),
}

impl AIError {
    /// Check if the error is retryable
    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            AIError::NetworkError(_) |
            AIError::RateLimitError(_) |
            AIError::TimeoutError(_) |
            AIError::HttpError(_)
        )
    }

    /// Get error category for logging/metrics
    pub fn category(&self) -> &'static str {
        match self {
            AIError::ProviderNotInitialized => "initialization",
            AIError::ConfigurationError(_) => "configuration",
            AIError::ProviderError(_) => "provider",
            AIError::NetworkError(_) => "network",
            AIError::AuthenticationError(_) => "authentication",
            AIError::RateLimitError(_) => "rate_limit",
            AIError::InvalidRequest(_) => "validation",
            AIError::ValidationError(_) => "validation",
            AIError::ParsingError(_) => "parsing",
            AIError::TemplateError(_) => "template",
            AIError::ModelNotFound(_) => "model",
            AIError::QuotaExceeded(_) => "quota",
            AIError::TimeoutError(_) => "timeout",
            AIError::StreamingError(_) => "streaming",
            AIError::SerializationError(_) => "serialization",
            AIError::HttpError(_) => "http",
            AIError::IoError(_) => "io",
            AIError::Unknown(_) => "unknown",
        }
    }

    /// Convert to user-friendly message
    pub fn user_message(&self) -> String {
        match self {
            AIError::ProviderNotInitialized => "AI provider is not configured. Please check your settings.".to_string(),
            AIError::ConfigurationError(_) => "AI configuration is invalid. Please verify your provider settings.".to_string(),
            AIError::AuthenticationError(_) => "AI provider authentication failed. Please check your API key.".to_string(),
            AIError::RateLimitError(_) => "AI provider rate limit exceeded. Please try again later.".to_string(),
            AIError::NetworkError(_) => "Network connection failed. Please check your internet connection.".to_string(),
            AIError::QuotaExceeded(_) => "AI provider quota exceeded. Please check your usage limits.".to_string(),
            AIError::ModelNotFound(_) => "The requested AI model is not available. Please try a different model.".to_string(),
            AIError::TimeoutError(_) => "AI request timed out. Please try again.".to_string(),
            AIError::ValidationError(msg) => format!("Validation failed: {}", msg),
            _ => "An unexpected error occurred while processing your AI request.".to_string(),
        }
    }
}

/// Result type alias for AI operations
pub type Result<T> = std::result::Result<T, AIError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_retryable() {
        assert!(AIError::NetworkError("test".to_string()).is_retryable());
        assert!(AIError::RateLimitError("test".to_string()).is_retryable());
        assert!(!AIError::AuthenticationError("test".to_string()).is_retryable());
        assert!(!AIError::ConfigurationError("test".to_string()).is_retryable());
    }

    #[test]
    fn test_error_categories() {
        assert_eq!(AIError::NetworkError("test".to_string()).category(), "network");
        assert_eq!(AIError::AuthenticationError("test".to_string()).category(), "authentication");
        assert_eq!(AIError::ProviderNotInitialized.category(), "initialization");
    }

    #[test]
    fn test_user_messages() {
        let error = AIError::ProviderNotInitialized;
        assert!(error.user_message().contains("not configured"));
        
        let error = AIError::AuthenticationError("test".to_string());
        assert!(error.user_message().contains("authentication failed"));
    }
}