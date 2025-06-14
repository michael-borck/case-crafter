// AI provider abstraction layer for Case Crafter
// Supports multiple AI providers: OpenAI, Anthropic, Ollama

pub mod providers;
pub mod config;
pub mod models;
pub mod prompts;
pub mod commands;
pub mod errors;

pub use config::{AIConfig, ProviderConfig, ProviderType};
pub use errors::{AIError, Result};
pub use models::{
    GenerationRequest, GenerationResponse, GenerationStats, 
    StreamResponse, ModelInfo, ProviderCapabilities
};
pub use providers::AIProvider;
pub use prompts::{PromptTemplate, PromptManager, RenderedPrompt};

use std::sync::Arc;
use tokio::sync::RwLock;
use tauri::AppHandle;

/// Main AI manager that coordinates between different providers
#[derive(Clone)]
pub struct AIManager {
    config: Arc<RwLock<AIConfig>>,
    active_provider: Arc<RwLock<Option<Box<dyn AIProvider + Send + Sync>>>>,
    prompt_manager: Arc<PromptManager>,
    app_handle: AppHandle,
}

impl AIManager {
    /// Create a new AI manager instance
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            config: Arc::new(RwLock::new(AIConfig::default())),
            active_provider: Arc::new(RwLock::new(None)),
            prompt_manager: Arc::new(PromptManager::new()),
            app_handle,
        }
    }

    /// Initialize the AI manager with configuration
    pub async fn initialize(&self, config: AIConfig) -> Result<()> {
        *self.config.write().await = config.clone();
        self.switch_provider(&config.default_provider).await?;
        Ok(())
    }

    /// Switch to a different AI provider
    pub async fn switch_provider(&self, provider_type: &ProviderType) -> Result<()> {
        let config = self.config.read().await;
        let provider_config = config.get_provider_config(provider_type)
            .ok_or_else(|| AIError::ConfigurationError(format!("Provider {} not configured", provider_type)))?;

        let provider = providers::create_provider(provider_type.clone(), provider_config.clone()).await?;
        *self.active_provider.write().await = Some(provider);
        Ok(())
    }

    /// Generate content using the active provider
    pub async fn generate(&self, request: GenerationRequest) -> Result<GenerationResponse> {
        let provider = self.active_provider.read().await;
        let provider = provider.as_ref()
            .ok_or_else(|| AIError::ProviderNotInitialized)?;

        provider.generate(request).await
    }

    /// Generate content with streaming response
    pub async fn generate_stream(&self, request: GenerationRequest) -> Result<Box<dyn futures::Stream<Item = Result<StreamResponse>> + Unpin + Send>> {
        let provider = self.active_provider.read().await;
        let provider = provider.as_ref()
            .ok_or_else(|| AIError::ProviderNotInitialized)?;

        provider.generate_stream(request).await
    }

    /// Get available models for the active provider
    pub async fn get_available_models(&self) -> Result<Vec<ModelInfo>> {
        let provider = self.active_provider.read().await;
        let provider = provider.as_ref()
            .ok_or_else(|| AIError::ProviderNotInitialized)?;

        provider.get_models().await
    }

    /// Get current configuration
    pub async fn get_config(&self) -> AIConfig {
        self.config.read().await.clone()
    }

    /// Update configuration
    pub async fn update_config(&self, config: AIConfig) -> Result<()> {
        *self.config.write().await = config;
        Ok(())
    }

    /// Get prompt manager for template operations
    pub fn get_prompt_manager(&self) -> Arc<PromptManager> {
        self.prompt_manager.clone()
    }

    /// Validate provider configuration
    pub async fn validate_provider(&self, provider_type: &ProviderType) -> Result<bool> {
        let config = self.config.read().await;
        let provider_config = config.get_provider_config(provider_type)
            .ok_or_else(|| AIError::ConfigurationError(format!("Provider {} not configured", provider_type)))?;

        let provider = providers::create_provider(provider_type.clone(), provider_config.clone()).await?;
        provider.health_check().await
    }

    /// Get provider capabilities
    pub async fn get_provider_capabilities(&self, provider_type: &ProviderType) -> Result<ProviderCapabilities> {
        let config = self.config.read().await;
        let provider_config = config.get_provider_config(provider_type)
            .ok_or_else(|| AIError::ConfigurationError(format!("Provider {} not configured", provider_type)))?;

        let provider = providers::create_provider(provider_type.clone(), provider_config.clone()).await?;
        Ok(provider.get_capabilities())
    }

    /// Get generation statistics
    pub async fn get_stats(&self) -> Result<GenerationStats> {
        let provider = self.active_provider.read().await;
        let provider = provider.as_ref()
            .ok_or_else(|| AIError::ProviderNotInitialized)?;

        provider.get_stats().await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ai_manager_creation() {
        // Mock app handle would be needed for real testing
        // This is a placeholder for when we implement proper testing
    }

    #[test]
    fn test_config_validation() {
        let config = AIConfig::default();
        assert!(!config.providers.is_empty());
    }
}