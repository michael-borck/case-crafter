// AI provider abstraction layer for Case Crafter
// Supports multiple AI providers: OpenAI, Anthropic, Ollama

pub mod providers;
pub mod config;
pub mod models;
pub mod prompts;
pub mod commands;
pub mod errors;
pub mod model_config;
pub mod case_study_generator;
pub mod question_generator;

pub use config::{AIConfig, ProviderConfig, ProviderType};
pub use errors::{AIError, Result};
pub use models::{
    GenerationRequest, GenerationResponse, GenerationStats, 
    StreamResponse, ModelInfo, ProviderCapabilities
};
pub use providers::AIProvider;
pub use prompts::{PromptTemplate, PromptManager, RenderedPrompt};
pub use model_config::{
    ModelConfig, ModelConfigManager, ModelSelectionCriteria, 
    ModelPerformancePriority, ModelUseCase, ModelCapabilities,
    ParameterConstraints, ParameterRange
};
pub use case_study_generator::{
    CaseStudyGenerator, CaseStudyGenerationParams, GeneratedCaseStudy,
    DifficultyLevel, CompanySize, CaseStudyMetadata
};
pub use question_generator::{
    QuestionGenerator, QuestionGenerationParams, GeneratedAssessment,
    AssessmentQuestion, QuestionType, QuestionDifficulty, QuestionOption, AssessmentMetadata
};

use std::sync::Arc;
use tokio::sync::RwLock;
use tauri::AppHandle;
use crate::database::AIConfigRepository;
use sqlx::SqlitePool;

/// Main AI manager that coordinates between different providers
#[derive(Clone)]
pub struct AIManager {
    config: Arc<RwLock<AIConfig>>,
    active_provider: Arc<RwLock<Option<Box<dyn AIProvider + Send + Sync>>>>,
    prompt_manager: Arc<PromptManager>,
    model_config_manager: Arc<RwLock<ModelConfigManager>>,
    config_repository: Arc<AIConfigRepository>,
    app_handle: AppHandle,
}

impl AIManager {
    /// Create a new AI manager instance
    pub fn new(app_handle: AppHandle, pool: SqlitePool) -> Self {
        Self {
            config: Arc::new(RwLock::new(AIConfig::default())),
            active_provider: Arc::new(RwLock::new(None)),
            prompt_manager: Arc::new(PromptManager::new()),
            model_config_manager: Arc::new(RwLock::new(ModelConfigManager::new())),
            config_repository: Arc::new(AIConfigRepository::new(pool)),
            app_handle,
        }
    }

    /// Initialize the AI manager and load configuration from database
    pub async fn initialize_from_database(&self) -> Result<()> {
        // Try to load existing configuration from database
        match self.config_repository.load_config().await {
            Ok(Some(saved_config)) => {
                *self.config.write().await = saved_config.clone();
                // Try to switch to the default provider
                if let Err(e) = self.switch_provider(&saved_config.default_provider).await {
                    // If switching fails, just log it - we'll use default config
                    eprintln!("Warning: Could not switch to saved provider: {}", e);
                }
            },
            Ok(None) => {
                // No saved config, use default and save it
                let default_config = AIConfig::default();
                if let Err(e) = self.config_repository.save_config(&default_config).await {
                    eprintln!("Warning: Could not save default config: {}", e);
                }
                *self.config.write().await = default_config.clone();
                // Try to switch to default provider
                if let Err(e) = self.switch_provider(&default_config.default_provider).await {
                    eprintln!("Warning: Could not switch to default provider: {}", e);
                }
            },
            Err(e) => {
                eprintln!("Warning: Could not load config from database: {}", e);
                // Fall back to default config
                let default_config = AIConfig::default();
                *self.config.write().await = default_config.clone();
            }
        }
        Ok(())
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

    /// Update configuration and save to database
    pub async fn update_config(&self, config: AIConfig) -> Result<()> {
        // Save to database first
        self.config_repository.save_config(&config).await
            .map_err(|e| AIError::ConfigurationError(format!("Failed to save config: {}", e)))?;
        
        // Update in-memory config
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

    /// Get model configuration manager
    pub async fn get_model_config_manager(&self) -> Arc<RwLock<ModelConfigManager>> {
        self.model_config_manager.clone()
    }

    /// Get all available model configurations
    pub async fn get_all_model_configs(&self) -> Vec<ModelConfig> {
        let manager = self.model_config_manager.read().await;
        manager.get_all_models().into_iter().cloned().collect()
    }

    /// Get model configurations by provider
    pub async fn get_models_by_provider(&self, provider: &ProviderType) -> Vec<ModelConfig> {
        let manager = self.model_config_manager.read().await;
        manager.get_models_by_provider(provider).into_iter().cloned().collect()
    }

    /// Select best model based on criteria
    pub async fn select_best_model(&self, criteria: &ModelSelectionCriteria) -> Result<ModelConfig> {
        let manager = self.model_config_manager.read().await;
        manager.select_best_model(criteria).map(|config| config.clone())
    }

    /// Get recommended models for a use case
    pub async fn get_recommended_models(&self, use_case: &ModelUseCase) -> Vec<ModelConfig> {
        let manager = self.model_config_manager.read().await;
        manager.get_recommended_models(use_case).into_iter().cloned().collect()
    }

    /// Validate generation parameters for a specific model
    pub async fn validate_model_parameters(&self, model_id: &str, params: &models::GenerationParams) -> Result<()> {
        let manager = self.model_config_manager.read().await;
        manager.validate_parameters(model_id, params)
    }

    /// Auto-adjust parameters to fit model constraints
    pub async fn adjust_model_parameters(&self, model_id: &str, params: &models::GenerationParams) -> Result<models::GenerationParams> {
        let manager = self.model_config_manager.read().await;
        manager.adjust_parameters(model_id, params)
    }

    /// Estimate cost for a generation request
    pub async fn estimate_generation_cost(&self, model_id: &str, input_tokens: u32, estimated_output_tokens: u32) -> Result<f64> {
        let manager = self.model_config_manager.read().await;
        let model_config = manager.get_model_config(model_id)
            .ok_or_else(|| AIError::ConfigurationError(format!("Model '{}' not found", model_id)))?;
        
        Ok(manager.estimate_model_cost(model_config, input_tokens, estimated_output_tokens))
    }

    /// Update model availability (useful for checking Ollama models)
    pub async fn update_model_availability(&self, model_id: &str, available: bool) {
        let mut manager = self.model_config_manager.write().await;
        manager.update_model_availability(model_id, available);
    }

    /// Generate content with dynamic model selection
    pub async fn generate_with_auto_model(&self, mut request: GenerationRequest, criteria: ModelSelectionCriteria) -> Result<GenerationResponse> {
        // Select the best model based on criteria
        let model_config = self.select_best_model(&criteria).await?;
        
        // Update the request with the selected model
        request.model = model_config.id.clone();
        
        // Adjust parameters to fit model constraints
        request.params = self.adjust_model_parameters(&model_config.id, &request.params).await?;
        
        // Switch to the model's provider if needed
        let current_config = self.config.read().await;
        if current_config.default_provider != model_config.provider {
            drop(current_config);
            self.switch_provider(&model_config.provider).await?;
        }
        
        // Generate with the selected model
        self.generate(request).await
    }

    /// Create a case study generator instance
    pub fn create_case_study_generator(&self) -> case_study_generator::CaseStudyGenerator {
        case_study_generator::CaseStudyGenerator::new(self.clone())
    }

    /// Create a question generator instance
    pub fn create_question_generator(&self) -> question_generator::QuestionGenerator {
        question_generator::QuestionGenerator::new(self.clone())
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