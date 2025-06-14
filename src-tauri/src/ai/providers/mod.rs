// AI provider implementations

pub mod openai;
pub mod anthropic;
pub mod ollama;

use crate::ai::{
    config::{ProviderConfig, ProviderType},
    errors::{AIError, Result},
    models::{
        GenerationRequest, GenerationResponse, GenerationStats, 
        ModelInfo, ProviderCapabilities, StreamResponse
    },
};
use async_trait::async_trait;
use futures::Stream;

/// Trait defining the interface for all AI providers
#[async_trait]
pub trait AIProvider: Send + Sync {
    /// Generate content using this provider
    async fn generate(&self, request: GenerationRequest) -> Result<GenerationResponse>;

    /// Generate content with streaming response
    async fn generate_stream(&self, request: GenerationRequest) -> Result<Box<dyn Stream<Item = Result<StreamResponse>> + Unpin + Send>>;

    /// Get available models for this provider
    async fn get_models(&self) -> Result<Vec<ModelInfo>>;

    /// Check if the provider is healthy and accessible
    async fn health_check(&self) -> Result<bool>;

    /// Get provider capabilities
    fn get_capabilities(&self) -> ProviderCapabilities;

    /// Get provider type
    fn get_provider_type(&self) -> ProviderType;

    /// Get generation statistics
    async fn get_stats(&self) -> Result<GenerationStats>;

    /// Get provider name for display
    fn get_name(&self) -> &str;

    /// Get provider description
    fn get_description(&self) -> &str;

    /// Validate a model name for this provider
    fn validate_model(&self, model_name: &str) -> Result<()>;

    /// Get default model for this provider
    fn get_default_model(&self) -> &str;

    /// Check if streaming is supported
    fn supports_streaming(&self) -> bool {
        self.get_capabilities().supports_streaming
    }

    /// Check if function calling is supported
    fn supports_functions(&self) -> bool {
        self.get_capabilities().supports_functions
    }

    /// Estimate cost for a request (if pricing is available)
    fn estimate_cost(&self, prompt_tokens: u32, completion_tokens: u32, model: &str) -> Option<f64>;
}

/// Factory function to create provider instances
pub async fn create_provider(
    provider_type: ProviderType,
    config: ProviderConfig,
) -> Result<Box<dyn AIProvider + Send + Sync>> {
    match provider_type {
        ProviderType::OpenAI => {
            let provider = openai::OpenAIProvider::new(config).await?;
            Ok(Box::new(provider))
        }
        ProviderType::Anthropic => {
            let provider = anthropic::AnthropicProvider::new(config).await?;
            Ok(Box::new(provider))
        }
        ProviderType::Ollama => {
            let provider = ollama::OllamaProvider::new(config).await?;
            Ok(Box::new(provider))
        }
    }
}

/// Utility function to validate provider configuration
pub fn validate_provider_config(config: &ProviderConfig) -> Result<()> {
    config.validate().map_err(|e| AIError::ConfigurationError(e))?;
    Ok(())
}

/// Get all supported provider types
pub fn get_supported_providers() -> Vec<ProviderType> {
    vec![
        ProviderType::OpenAI,
        ProviderType::Anthropic,
        ProviderType::Ollama,
    ]
}

/// Check if a provider type is supported
pub fn is_provider_supported(provider_type: &ProviderType) -> bool {
    get_supported_providers().contains(provider_type)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_supported_providers() {
        let providers = get_supported_providers();
        assert!(providers.contains(&ProviderType::OpenAI));
        assert!(providers.contains(&ProviderType::Anthropic));
        assert!(providers.contains(&ProviderType::Ollama));
    }

    #[test]
    fn test_provider_support_check() {
        assert!(is_provider_supported(&ProviderType::OpenAI));
        assert!(is_provider_supported(&ProviderType::Anthropic));
        assert!(is_provider_supported(&ProviderType::Ollama));
    }

    #[tokio::test]
    async fn test_provider_config_validation() {
        let config = ProviderConfig::ollama("http://localhost:11434");
        assert!(validate_provider_config(&config).is_ok());

        let mut invalid_config = ProviderConfig::openai("test-key");
        invalid_config.default_model = "".to_string();
        assert!(validate_provider_config(&invalid_config).is_err());
    }
}