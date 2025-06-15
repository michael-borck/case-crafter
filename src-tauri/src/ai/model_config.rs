// Dynamic AI model configuration and selection system

use crate::ai::errors::{AIError, Result};
use crate::ai::models::{GenerationParams, ModelInfo};
use crate::ai::ProviderType;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Configuration for a specific model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub id: String,
    pub name: String,
    pub provider: ProviderType,
    pub description: Option<String>,
    pub context_length: Option<u32>,
    pub input_cost_per_1k: Option<f64>,  // Cost per 1K input tokens
    pub output_cost_per_1k: Option<f64>, // Cost per 1K output tokens
    pub capabilities: ModelCapabilities,
    pub default_params: GenerationParams,
    pub param_constraints: ParameterConstraints,
    pub is_available: bool,
    pub is_recommended: bool,
}

/// Model capabilities and features
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelCapabilities {
    pub supports_streaming: bool,
    pub supports_function_calling: bool,
    pub supports_vision: bool,
    pub supports_system_prompt: bool,
    pub max_output_tokens: Option<u32>,
    pub supported_formats: Vec<String>, // e.g., ["text", "json", "markdown"]
}

/// Constraints for model parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterConstraints {
    pub temperature: Option<ParameterRange<f32>>,
    pub max_tokens: Option<ParameterRange<u32>>,
    pub top_p: Option<ParameterRange<f32>>,
    pub top_k: Option<ParameterRange<u32>>,
    pub frequency_penalty: Option<ParameterRange<f32>>,
    pub presence_penalty: Option<ParameterRange<f32>>,
    pub allowed_stop_sequences: Option<Vec<String>>,
}

/// Range constraint for a parameter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterRange<T> {
    pub min: T,
    pub max: T,
    pub default: T,
    pub step: Option<T>,
}

/// Model selection criteria
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelSelectionCriteria {
    pub provider_preference: Option<ProviderType>,
    pub max_cost_per_request: Option<f64>,
    pub min_context_length: Option<u32>,
    pub required_capabilities: Vec<String>,
    pub performance_priority: ModelPerformancePriority,
    pub use_case: ModelUseCase,
}

/// Performance priority for model selection
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ModelPerformancePriority {
    Speed,       // Fastest response time
    Quality,     // Best output quality
    Cost,        // Lowest cost
    Balanced,    // Balance of all factors
}

/// Use case categories for better model selection
#[derive(Debug, Clone, Serialize, Deserialize, Eq, Hash, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ModelUseCase {
    CaseStudyGeneration,
    QuestionGeneration,
    ContentAnalysis,
    SummaryGeneration,
    CodeGeneration,
    GeneralChat,
    CreativeWriting,
}

/// Dynamic model configuration manager
pub struct ModelConfigManager {
    models: HashMap<String, ModelConfig>,
    provider_models: HashMap<ProviderType, Vec<String>>,
    use_case_recommendations: HashMap<ModelUseCase, Vec<String>>,
}

impl Default for ModelConfigManager {
    fn default() -> Self {
        Self::new()
    }
}

impl ModelConfigManager {
    /// Create a new model configuration manager
    pub fn new() -> Self {
        let mut manager = Self {
            models: HashMap::new(),
            provider_models: HashMap::new(),
            use_case_recommendations: HashMap::new(),
        };
        
        manager.load_default_configurations();
        manager
    }

    /// Load default model configurations
    fn load_default_configurations(&mut self) {
        // OpenAI Models
        self.add_model(create_gpt4_turbo_config());
        self.add_model(create_gpt4_config());
        self.add_model(create_gpt35_turbo_config());
        
        // Anthropic Models
        self.add_model(create_claude_3_opus_config());
        self.add_model(create_claude_3_sonnet_config());
        self.add_model(create_claude_3_haiku_config());
        
        // Ollama Models (local)
        self.add_model(create_llama2_config());
        self.add_model(create_mistral_config());
        self.add_model(create_codellama_config());

        // Set up use case recommendations
        self.setup_use_case_recommendations();
    }

    /// Add a model configuration
    pub fn add_model(&mut self, config: ModelConfig) {
        let model_id = config.id.clone();
        let provider = config.provider.clone();
        
        self.models.insert(model_id.clone(), config);
        
        self.provider_models
            .entry(provider)
            .or_insert_with(Vec::new)
            .push(model_id);
    }

    /// Get all available models
    pub fn get_all_models(&self) -> Vec<&ModelConfig> {
        self.models.values().filter(|m| m.is_available).collect()
    }

    /// Get models by provider
    pub fn get_models_by_provider(&self, provider: &ProviderType) -> Vec<&ModelConfig> {
        self.provider_models
            .get(provider)
            .map(|model_ids| {
                model_ids
                    .iter()
                    .filter_map(|id| self.models.get(id))
                    .filter(|m| m.is_available)
                    .collect()
            })
            .unwrap_or_default()
    }

    /// Get model configuration by ID
    pub fn get_model_config(&self, model_id: &str) -> Option<&ModelConfig> {
        self.models.get(model_id)
    }

    /// Select best model based on criteria
    pub fn select_best_model(&self, criteria: &ModelSelectionCriteria) -> Result<&ModelConfig> {
        let mut candidates: Vec<&ModelConfig> = self.get_all_models();

        // Filter by provider preference
        if let Some(provider) = &criteria.provider_preference {
            candidates = candidates.into_iter()
                .filter(|m| &m.provider == provider)
                .collect();
        }

        // Filter by context length requirement
        if let Some(min_context) = criteria.min_context_length {
            candidates = candidates.into_iter()
                .filter(|m| m.context_length.unwrap_or(0) >= min_context)
                .collect();
        }

        // Filter by capabilities
        for capability in &criteria.required_capabilities {
            candidates = candidates.into_iter()
                .filter(|m| self.model_has_capability(m, capability))
                .collect();
        }

        // Filter by cost if specified
        if let Some(max_cost) = criteria.max_cost_per_request {
            candidates = candidates.into_iter()
                .filter(|m| self.estimate_model_cost(m, 1000, 500) <= max_cost)
                .collect();
        }

        if candidates.is_empty() {
            return Err(AIError::ConfigurationError(
                "No models match the specified criteria".to_string()
            ));
        }

        // Score and rank candidates
        let mut scored_candidates: Vec<(&ModelConfig, f64)> = candidates
            .into_iter()
            .map(|model| (model, self.score_model(model, criteria)))
            .collect();

        scored_candidates.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        Ok(scored_candidates[0].0)
    }

    /// Get recommended models for a specific use case
    pub fn get_recommended_models(&self, use_case: &ModelUseCase) -> Vec<&ModelConfig> {
        self.use_case_recommendations
            .get(use_case)
            .map(|model_ids| {
                model_ids
                    .iter()
                    .filter_map(|id| self.models.get(id))
                    .filter(|m| m.is_available)
                    .collect()
            })
            .unwrap_or_default()
    }

    /// Validate generation parameters against model constraints
    pub fn validate_parameters(&self, model_id: &str, params: &GenerationParams) -> Result<()> {
        let config = self.get_model_config(model_id)
            .ok_or_else(|| AIError::ConfigurationError(format!("Model '{}' not found", model_id)))?;

        let constraints = &config.param_constraints;

        // Validate temperature
        if let (Some(temp), Some(range)) = (params.temperature, &constraints.temperature) {
            if temp < range.min || temp > range.max {
                return Err(AIError::ConfigurationError(format!(
                    "Temperature {} is outside valid range [{}, {}]",
                    temp, range.min, range.max
                )));
            }
        }

        // Validate max_tokens
        if let (Some(tokens), Some(range)) = (params.max_tokens, &constraints.max_tokens) {
            if tokens < range.min || tokens > range.max {
                return Err(AIError::ConfigurationError(format!(
                    "Max tokens {} is outside valid range [{}, {}]",
                    tokens, range.min, range.max
                )));
            }
        }

        // Validate top_p
        if let (Some(top_p), Some(range)) = (params.top_p, &constraints.top_p) {
            if top_p < range.min || top_p > range.max {
                return Err(AIError::ConfigurationError(format!(
                    "Top-p {} is outside valid range [{}, {}]",
                    top_p, range.min, range.max
                )));
            }
        }

        // Validate top_k
        if let (Some(top_k), Some(range)) = (params.top_k, &constraints.top_k) {
            if top_k < range.min || top_k > range.max {
                return Err(AIError::ConfigurationError(format!(
                    "Top-k {} is outside valid range [{}, {}]",
                    top_k, range.min, range.max
                )));
            }
        }

        // Validate frequency_penalty
        if let (Some(penalty), Some(range)) = (params.frequency_penalty, &constraints.frequency_penalty) {
            if penalty < range.min || penalty > range.max {
                return Err(AIError::ConfigurationError(format!(
                    "Frequency penalty {} is outside valid range [{}, {}]",
                    penalty, range.min, range.max
                )));
            }
        }

        // Validate presence_penalty
        if let (Some(penalty), Some(range)) = (params.presence_penalty, &constraints.presence_penalty) {
            if penalty < range.min || penalty > range.max {
                return Err(AIError::ConfigurationError(format!(
                    "Presence penalty {} is outside valid range [{}, {}]",
                    penalty, range.min, range.max
                )));
            }
        }

        Ok(())
    }

    /// Auto-adjust parameters to fit model constraints
    pub fn adjust_parameters(&self, model_id: &str, params: &GenerationParams) -> Result<GenerationParams> {
        let config = self.get_model_config(model_id)
            .ok_or_else(|| AIError::ConfigurationError(format!("Model '{}' not found", model_id)))?;

        let constraints = &config.param_constraints;
        let mut adjusted = params.clone();

        // Adjust temperature
        if let (Some(temp), Some(range)) = (adjusted.temperature, &constraints.temperature) {
            adjusted.temperature = Some(temp.clamp(range.min, range.max));
        }

        // Adjust max_tokens
        if let (Some(tokens), Some(range)) = (adjusted.max_tokens, &constraints.max_tokens) {
            adjusted.max_tokens = Some(tokens.clamp(range.min, range.max));
        }

        // Adjust top_p
        if let (Some(top_p), Some(range)) = (adjusted.top_p, &constraints.top_p) {
            adjusted.top_p = Some(top_p.clamp(range.min, range.max));
        }

        // Adjust top_k
        if let (Some(top_k), Some(range)) = (adjusted.top_k, &constraints.top_k) {
            adjusted.top_k = Some(top_k.clamp(range.min, range.max));
        }

        // Adjust frequency_penalty
        if let (Some(penalty), Some(range)) = (adjusted.frequency_penalty, &constraints.frequency_penalty) {
            adjusted.frequency_penalty = Some(penalty.clamp(range.min, range.max));
        }

        // Adjust presence_penalty
        if let (Some(penalty), Some(range)) = (adjusted.presence_penalty, &constraints.presence_penalty) {
            adjusted.presence_penalty = Some(penalty.clamp(range.min, range.max));
        }

        Ok(adjusted)
    }

    /// Estimate cost for a model based on token usage
    pub fn estimate_model_cost(&self, model: &ModelConfig, input_tokens: u32, output_tokens: u32) -> f64 {
        let input_cost = model.input_cost_per_1k.unwrap_or(0.0) * (input_tokens as f64 / 1000.0);
        let output_cost = model.output_cost_per_1k.unwrap_or(0.0) * (output_tokens as f64 / 1000.0);
        input_cost + output_cost
    }

    /// Get parameter constraints for a model
    pub fn get_parameter_constraints(&self, model_id: &str) -> Option<&ParameterConstraints> {
        self.models.get(model_id).map(|config| &config.param_constraints)
    }

    /// Update model availability
    pub fn update_model_availability(&mut self, model_id: &str, available: bool) {
        if let Some(config) = self.models.get_mut(model_id) {
            config.is_available = available;
        }
    }

    /// Convert ModelConfig to ModelInfo for compatibility
    pub fn to_model_info(&self, config: &ModelConfig) -> ModelInfo {
        ModelInfo {
            id: config.id.clone(),
            name: config.name.clone(),
            description: config.description.clone(),
            context_length: config.context_length,
            max_output_tokens: config.capabilities.max_output_tokens,
            supports_streaming: config.capabilities.supports_streaming,
            supports_functions: config.capabilities.supports_function_calling,
            cost_per_input_token: config.input_cost_per_1k,
            cost_per_output_token: config.output_cost_per_1k,
            created_at: Some(chrono::Utc::now()),
        }
    }

    // Private helper methods

    fn model_has_capability(&self, model: &ModelConfig, capability: &str) -> bool {
        match capability {
            "streaming" => model.capabilities.supports_streaming,
            "function_calling" => model.capabilities.supports_function_calling,
            "vision" => model.capabilities.supports_vision,
            "system_prompt" => model.capabilities.supports_system_prompt,
            _ => model.capabilities.supported_formats.contains(&capability.to_string()),
        }
    }

    fn score_model(&self, model: &ModelConfig, criteria: &ModelSelectionCriteria) -> f64 {
        let mut score = 0.0;

        // Base score for availability and recommendation
        if model.is_available {
            score += 10.0;
        }
        if model.is_recommended {
            score += 5.0;
        }

        // Score based on performance priority
        match criteria.performance_priority {
            ModelPerformancePriority::Speed => {
                // Prefer models known for speed (simplified heuristic)
                if model.id.contains("turbo") || model.id.contains("haiku") {
                    score += 8.0;
                }
            }
            ModelPerformancePriority::Quality => {
                // Prefer high-end models
                if model.id.contains("gpt-4") || model.id.contains("opus") {
                    score += 8.0;
                }
            }
            ModelPerformancePriority::Cost => {
                // Prefer lower cost models
                let cost = self.estimate_model_cost(model, 1000, 500);
                score += (1.0 / (cost + 0.001)) * 2.0; // Inverse cost scoring
            }
            ModelPerformancePriority::Balanced => {
                // Balanced scoring
                score += 3.0;
            }
        }

        // Use case specific scoring
        match criteria.use_case {
            ModelUseCase::CaseStudyGeneration => {
                if model.context_length.unwrap_or(0) >= 8000 {
                    score += 5.0;
                }
            }
            ModelUseCase::CodeGeneration => {
                if model.id.contains("code") || model.id.contains("codellama") {
                    score += 8.0;
                }
            }
            _ => {}
        }

        score
    }

    fn setup_use_case_recommendations(&mut self) {
        // Case study generation recommendations
        self.use_case_recommendations.insert(
            ModelUseCase::CaseStudyGeneration,
            vec![
                "gpt-4-turbo".to_string(),
                "claude-3-opus".to_string(),
                "claude-3-sonnet".to_string(),
                "gpt-4".to_string(),
            ]
        );

        // Question generation recommendations
        self.use_case_recommendations.insert(
            ModelUseCase::QuestionGeneration,
            vec![
                "gpt-4-turbo".to_string(),
                "claude-3-sonnet".to_string(),
                "gpt-3.5-turbo".to_string(),
            ]
        );

        // Content analysis recommendations
        self.use_case_recommendations.insert(
            ModelUseCase::ContentAnalysis,
            vec![
                "claude-3-opus".to_string(),
                "gpt-4".to_string(),
                "claude-3-sonnet".to_string(),
            ]
        );

        // Code generation recommendations
        self.use_case_recommendations.insert(
            ModelUseCase::CodeGeneration,
            vec![
                "codellama".to_string(),
                "gpt-4-turbo".to_string(),
            ]
        );

        // General chat recommendations
        self.use_case_recommendations.insert(
            ModelUseCase::GeneralChat,
            vec![
                "gpt-3.5-turbo".to_string(),
                "claude-3-haiku".to_string(),
                "llama2".to_string(),
            ]
        );
    }
}

// Helper functions to create default model configurations

fn create_gpt4_turbo_config() -> ModelConfig {
    ModelConfig {
        id: "gpt-4-turbo".to_string(),
        name: "GPT-4 Turbo".to_string(),
        provider: ProviderType::OpenAI,
        description: Some("Latest GPT-4 model with improved performance and larger context".to_string()),
        context_length: Some(128000),
        input_cost_per_1k: Some(0.01),
        output_cost_per_1k: Some(0.03),
        capabilities: ModelCapabilities {
            supports_streaming: true,
            supports_function_calling: true,
            supports_vision: true,
            supports_system_prompt: true,
            max_output_tokens: Some(4096),
            supported_formats: vec!["text".to_string(), "json".to_string()],
        },
        default_params: GenerationParams {
            temperature: Some(0.7),
            max_tokens: Some(2048),
            top_p: Some(1.0),
            top_k: None,
            frequency_penalty: Some(0.0),
            presence_penalty: Some(0.0),
            stop_sequences: None,
            seed: None,
        },
        param_constraints: ParameterConstraints {
            temperature: Some(ParameterRange { min: 0.0, max: 2.0, default: 0.7, step: Some(0.1) }),
            max_tokens: Some(ParameterRange { min: 1, max: 4096, default: 2048, step: Some(1) }),
            top_p: Some(ParameterRange { min: 0.0, max: 1.0, default: 1.0, step: Some(0.01) }),
            top_k: None,
            frequency_penalty: Some(ParameterRange { min: -2.0, max: 2.0, default: 0.0, step: Some(0.1) }),
            presence_penalty: Some(ParameterRange { min: -2.0, max: 2.0, default: 0.0, step: Some(0.1) }),
            allowed_stop_sequences: None,
        },
        is_available: true,
        is_recommended: true,
    }
}

fn create_gpt4_config() -> ModelConfig {
    ModelConfig {
        id: "gpt-4".to_string(),
        name: "GPT-4".to_string(),
        provider: ProviderType::OpenAI,
        description: Some("High-quality, powerful language model".to_string()),
        context_length: Some(8192),
        input_cost_per_1k: Some(0.03),
        output_cost_per_1k: Some(0.06),
        capabilities: ModelCapabilities {
            supports_streaming: true,
            supports_function_calling: true,
            supports_vision: false,
            supports_system_prompt: true,
            max_output_tokens: Some(4096),
            supported_formats: vec!["text".to_string(), "json".to_string()],
        },
        default_params: GenerationParams::default(),
        param_constraints: ParameterConstraints {
            temperature: Some(ParameterRange { min: 0.0, max: 2.0, default: 0.7, step: Some(0.1) }),
            max_tokens: Some(ParameterRange { min: 1, max: 4096, default: 2048, step: Some(1) }),
            top_p: Some(ParameterRange { min: 0.0, max: 1.0, default: 1.0, step: Some(0.01) }),
            top_k: None,
            frequency_penalty: Some(ParameterRange { min: -2.0, max: 2.0, default: 0.0, step: Some(0.1) }),
            presence_penalty: Some(ParameterRange { min: -2.0, max: 2.0, default: 0.0, step: Some(0.1) }),
            allowed_stop_sequences: None,
        },
        is_available: true,
        is_recommended: true,
    }
}

fn create_gpt35_turbo_config() -> ModelConfig {
    ModelConfig {
        id: "gpt-3.5-turbo".to_string(),
        name: "GPT-3.5 Turbo".to_string(),
        provider: ProviderType::OpenAI,
        description: Some("Fast and cost-effective model for most tasks".to_string()),
        context_length: Some(16385),
        input_cost_per_1k: Some(0.0005),
        output_cost_per_1k: Some(0.0015),
        capabilities: ModelCapabilities {
            supports_streaming: true,
            supports_function_calling: true,
            supports_vision: false,
            supports_system_prompt: true,
            max_output_tokens: Some(4096),
            supported_formats: vec!["text".to_string(), "json".to_string()],
        },
        default_params: GenerationParams::default(),
        param_constraints: ParameterConstraints {
            temperature: Some(ParameterRange { min: 0.0, max: 2.0, default: 0.7, step: Some(0.1) }),
            max_tokens: Some(ParameterRange { min: 1, max: 4096, default: 2048, step: Some(1) }),
            top_p: Some(ParameterRange { min: 0.0, max: 1.0, default: 1.0, step: Some(0.01) }),
            top_k: None,
            frequency_penalty: Some(ParameterRange { min: -2.0, max: 2.0, default: 0.0, step: Some(0.1) }),
            presence_penalty: Some(ParameterRange { min: -2.0, max: 2.0, default: 0.0, step: Some(0.1) }),
            allowed_stop_sequences: None,
        },
        is_available: true,
        is_recommended: false,
    }
}

fn create_claude_3_opus_config() -> ModelConfig {
    ModelConfig {
        id: "claude-3-opus".to_string(),
        name: "Claude 3 Opus".to_string(),
        provider: ProviderType::Anthropic,
        description: Some("Most capable Claude model for complex tasks".to_string()),
        context_length: Some(200000),
        input_cost_per_1k: Some(0.015),
        output_cost_per_1k: Some(0.075),
        capabilities: ModelCapabilities {
            supports_streaming: true,
            supports_function_calling: false,
            supports_vision: true,
            supports_system_prompt: true,
            max_output_tokens: Some(4096),
            supported_formats: vec!["text".to_string(), "json".to_string()],
        },
        default_params: GenerationParams::default(),
        param_constraints: ParameterConstraints {
            temperature: Some(ParameterRange { min: 0.0, max: 1.0, default: 0.7, step: Some(0.1) }),
            max_tokens: Some(ParameterRange { min: 1, max: 4096, default: 2048, step: Some(1) }),
            top_p: Some(ParameterRange { min: 0.0, max: 1.0, default: 0.9, step: Some(0.01) }),
            top_k: Some(ParameterRange { min: 1, max: 100, default: 40, step: Some(1) }),
            frequency_penalty: None,
            presence_penalty: None,
            allowed_stop_sequences: None,
        },
        is_available: true,
        is_recommended: true,
    }
}

fn create_claude_3_sonnet_config() -> ModelConfig {
    ModelConfig {
        id: "claude-3-sonnet".to_string(),
        name: "Claude 3 Sonnet".to_string(),
        provider: ProviderType::Anthropic,
        description: Some("Balanced Claude model for most tasks".to_string()),
        context_length: Some(200000),
        input_cost_per_1k: Some(0.003),
        output_cost_per_1k: Some(0.015),
        capabilities: ModelCapabilities {
            supports_streaming: true,
            supports_function_calling: false,
            supports_vision: true,
            supports_system_prompt: true,
            max_output_tokens: Some(4096),
            supported_formats: vec!["text".to_string(), "json".to_string()],
        },
        default_params: GenerationParams::default(),
        param_constraints: ParameterConstraints {
            temperature: Some(ParameterRange { min: 0.0, max: 1.0, default: 0.7, step: Some(0.1) }),
            max_tokens: Some(ParameterRange { min: 1, max: 4096, default: 2048, step: Some(1) }),
            top_p: Some(ParameterRange { min: 0.0, max: 1.0, default: 0.9, step: Some(0.01) }),
            top_k: Some(ParameterRange { min: 1, max: 100, default: 40, step: Some(1) }),
            frequency_penalty: None,
            presence_penalty: None,
            allowed_stop_sequences: None,
        },
        is_available: true,
        is_recommended: true,
    }
}

fn create_claude_3_haiku_config() -> ModelConfig {
    ModelConfig {
        id: "claude-3-haiku".to_string(),
        name: "Claude 3 Haiku".to_string(),
        provider: ProviderType::Anthropic,
        description: Some("Fastest Claude model for quick tasks".to_string()),
        context_length: Some(200000),
        input_cost_per_1k: Some(0.00025),
        output_cost_per_1k: Some(0.00125),
        capabilities: ModelCapabilities {
            supports_streaming: true,
            supports_function_calling: false,
            supports_vision: true,
            supports_system_prompt: true,
            max_output_tokens: Some(4096),
            supported_formats: vec!["text".to_string(), "json".to_string()],
        },
        default_params: GenerationParams::default(),
        param_constraints: ParameterConstraints {
            temperature: Some(ParameterRange { min: 0.0, max: 1.0, default: 0.7, step: Some(0.1) }),
            max_tokens: Some(ParameterRange { min: 1, max: 4096, default: 2048, step: Some(1) }),
            top_p: Some(ParameterRange { min: 0.0, max: 1.0, default: 0.9, step: Some(0.01) }),
            top_k: Some(ParameterRange { min: 1, max: 100, default: 40, step: Some(1) }),
            frequency_penalty: None,
            presence_penalty: None,
            allowed_stop_sequences: None,
        },
        is_available: true,
        is_recommended: false,
    }
}

fn create_llama2_config() -> ModelConfig {
    ModelConfig {
        id: "llama2".to_string(),
        name: "Llama 2".to_string(),
        provider: ProviderType::Ollama,
        description: Some("Open-source model for local deployment".to_string()),
        context_length: Some(4096),
        input_cost_per_1k: Some(0.0), // Free for local use
        output_cost_per_1k: Some(0.0),
        capabilities: ModelCapabilities {
            supports_streaming: true,
            supports_function_calling: false,
            supports_vision: false,
            supports_system_prompt: true,
            max_output_tokens: Some(2048),
            supported_formats: vec!["text".to_string()],
        },
        default_params: GenerationParams::default(),
        param_constraints: ParameterConstraints {
            temperature: Some(ParameterRange { min: 0.0, max: 2.0, default: 0.7, step: Some(0.1) }),
            max_tokens: Some(ParameterRange { min: 1, max: 2048, default: 1024, step: Some(1) }),
            top_p: Some(ParameterRange { min: 0.0, max: 1.0, default: 0.9, step: Some(0.01) }),
            top_k: Some(ParameterRange { min: 1, max: 100, default: 40, step: Some(1) }),
            frequency_penalty: None,
            presence_penalty: None,
            allowed_stop_sequences: None,
        },
        is_available: false, // Depends on local installation
        is_recommended: false,
    }
}

fn create_mistral_config() -> ModelConfig {
    ModelConfig {
        id: "mistral".to_string(),
        name: "Mistral 7B".to_string(),
        provider: ProviderType::Ollama,
        description: Some("Efficient open-source model".to_string()),
        context_length: Some(8192),
        input_cost_per_1k: Some(0.0),
        output_cost_per_1k: Some(0.0),
        capabilities: ModelCapabilities {
            supports_streaming: true,
            supports_function_calling: false,
            supports_vision: false,
            supports_system_prompt: true,
            max_output_tokens: Some(2048),
            supported_formats: vec!["text".to_string()],
        },
        default_params: GenerationParams::default(),
        param_constraints: ParameterConstraints {
            temperature: Some(ParameterRange { min: 0.0, max: 2.0, default: 0.7, step: Some(0.1) }),
            max_tokens: Some(ParameterRange { min: 1, max: 2048, default: 1024, step: Some(1) }),
            top_p: Some(ParameterRange { min: 0.0, max: 1.0, default: 0.9, step: Some(0.01) }),
            top_k: Some(ParameterRange { min: 1, max: 100, default: 40, step: Some(1) }),
            frequency_penalty: None,
            presence_penalty: None,
            allowed_stop_sequences: None,
        },
        is_available: false,
        is_recommended: false,
    }
}

fn create_codellama_config() -> ModelConfig {
    ModelConfig {
        id: "codellama".to_string(),
        name: "Code Llama".to_string(),
        provider: ProviderType::Ollama,
        description: Some("Specialized model for code generation".to_string()),
        context_length: Some(16384),
        input_cost_per_1k: Some(0.0),
        output_cost_per_1k: Some(0.0),
        capabilities: ModelCapabilities {
            supports_streaming: true,
            supports_function_calling: false,
            supports_vision: false,
            supports_system_prompt: true,
            max_output_tokens: Some(4096),
            supported_formats: vec!["text".to_string(), "code".to_string()],
        },
        default_params: GenerationParams::default(),
        param_constraints: ParameterConstraints {
            temperature: Some(ParameterRange { min: 0.0, max: 1.0, default: 0.1, step: Some(0.1) }),
            max_tokens: Some(ParameterRange { min: 1, max: 4096, default: 2048, step: Some(1) }),
            top_p: Some(ParameterRange { min: 0.0, max: 1.0, default: 0.95, step: Some(0.01) }),
            top_k: Some(ParameterRange { min: 1, max: 100, default: 50, step: Some(1) }),
            frequency_penalty: None,
            presence_penalty: None,
            allowed_stop_sequences: None,
        },
        is_available: false,
        is_recommended: false,
    }
}