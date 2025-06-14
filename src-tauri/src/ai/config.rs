// Configuration models for AI providers

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Supported AI provider types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum ProviderType {
    OpenAI,
    Anthropic,
    Ollama,
}

impl std::fmt::Display for ProviderType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProviderType::OpenAI => write!(f, "openai"),
            ProviderType::Anthropic => write!(f, "anthropic"),
            ProviderType::Ollama => write!(f, "ollama"),
        }
    }
}

impl std::str::FromStr for ProviderType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "openai" => Ok(ProviderType::OpenAI),
            "anthropic" => Ok(ProviderType::Anthropic),
            "ollama" => Ok(ProviderType::Ollama),
            _ => Err(format!("Unknown provider type: {}", s)),
        }
    }
}

/// Configuration for a specific AI model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub name: String,
    pub display_name: String,
    pub description: Option<String>,
    pub context_length: Option<u32>,
    pub max_output_tokens: Option<u32>,
    pub default_temperature: Option<f32>,
    pub supports_streaming: bool,
    pub supports_functions: bool,
    pub cost_per_input_token: Option<f64>,
    pub cost_per_output_token: Option<f64>,
    pub enabled: bool,
}

impl ModelConfig {
    pub fn new(name: impl Into<String>, display_name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            display_name: display_name.into(),
            description: None,
            context_length: None,
            max_output_tokens: None,
            default_temperature: Some(0.7),
            supports_streaming: false,
            supports_functions: false,
            cost_per_input_token: None,
            cost_per_output_token: None,
            enabled: true,
        }
    }
}

/// Configuration for an AI provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub provider_type: ProviderType,
    pub enabled: bool,
    pub api_key: Option<String>,
    pub api_base_url: Option<String>,
    pub organization: Option<String>,
    pub project: Option<String>,
    pub default_model: String,
    pub models: Vec<ModelConfig>,
    pub timeout_seconds: u64,
    pub max_retries: u32,
    pub rate_limit_requests_per_minute: Option<u32>,
    pub rate_limit_tokens_per_minute: Option<u32>,
    pub custom_headers: HashMap<String, String>,
    pub proxy_url: Option<String>,
    pub verify_ssl: bool,
}

impl ProviderConfig {
    /// Create OpenAI provider configuration
    pub fn openai(api_key: impl Into<String>) -> Self {
        Self {
            provider_type: ProviderType::OpenAI,
            enabled: true,
            api_key: Some(api_key.into()),
            api_base_url: Some("https://api.openai.com/v1".to_string()),
            organization: None,
            project: None,
            default_model: "gpt-4o-mini".to_string(),
            models: vec![
                ModelConfig::new("gpt-4o", "GPT-4o")
                    .with_context_length(128000)
                    .with_streaming(true)
                    .with_functions(true)
                    .with_cost(0.0050, 0.0150),
                ModelConfig::new("gpt-4o-mini", "GPT-4o Mini")
                    .with_context_length(128000)
                    .with_streaming(true)
                    .with_functions(true)
                    .with_cost(0.00015, 0.00060),
                ModelConfig::new("gpt-4-turbo", "GPT-4 Turbo")
                    .with_context_length(128000)
                    .with_streaming(true)
                    .with_functions(true)
                    .with_cost(0.0100, 0.0300),
                ModelConfig::new("gpt-3.5-turbo", "GPT-3.5 Turbo")
                    .with_context_length(16385)
                    .with_streaming(true)
                    .with_functions(true)
                    .with_cost(0.0010, 0.0020),
            ],
            timeout_seconds: 60,
            max_retries: 3,
            rate_limit_requests_per_minute: Some(10000),
            rate_limit_tokens_per_minute: Some(2000000),
            custom_headers: HashMap::new(),
            proxy_url: None,
            verify_ssl: true,
        }
    }

    /// Create Anthropic provider configuration
    pub fn anthropic(api_key: impl Into<String>) -> Self {
        Self {
            provider_type: ProviderType::Anthropic,
            enabled: true,
            api_key: Some(api_key.into()),
            api_base_url: Some("https://api.anthropic.com".to_string()),
            organization: None,
            project: None,
            default_model: "claude-3-5-sonnet-20241022".to_string(),
            models: vec![
                ModelConfig::new("claude-3-5-sonnet-20241022", "Claude 3.5 Sonnet")
                    .with_context_length(200000)
                    .with_streaming(true)
                    .with_cost(0.003, 0.015),
                ModelConfig::new("claude-3-5-haiku-20241022", "Claude 3.5 Haiku")
                    .with_context_length(200000)
                    .with_streaming(true)
                    .with_cost(0.0008, 0.004),
                ModelConfig::new("claude-3-opus-20240229", "Claude 3 Opus")
                    .with_context_length(200000)
                    .with_streaming(true)
                    .with_cost(0.015, 0.075),
            ],
            timeout_seconds: 60,
            max_retries: 3,
            rate_limit_requests_per_minute: Some(4000),
            rate_limit_tokens_per_minute: Some(400000),
            custom_headers: HashMap::new(),
            proxy_url: None,
            verify_ssl: true,
        }
    }

    /// Create Ollama provider configuration
    pub fn ollama(base_url: impl Into<String>) -> Self {
        Self {
            provider_type: ProviderType::Ollama,
            enabled: true,
            api_key: None,
            api_base_url: Some(base_url.into()),
            organization: None,
            project: None,
            default_model: "llama3.2".to_string(),
            models: vec![
                ModelConfig::new("llama3.2", "Llama 3.2")
                    .with_context_length(8192)
                    .with_streaming(true),
                ModelConfig::new("llama3.2:70b", "Llama 3.2 70B")
                    .with_context_length(8192)
                    .with_streaming(true),
                ModelConfig::new("mistral", "Mistral")
                    .with_context_length(8192)
                    .with_streaming(true),
                ModelConfig::new("codellama", "Code Llama")
                    .with_context_length(16384)
                    .with_streaming(true),
            ],
            timeout_seconds: 300, // Ollama can be slower
            max_retries: 2,
            rate_limit_requests_per_minute: None, // No limits for local Ollama
            rate_limit_tokens_per_minute: None,
            custom_headers: HashMap::new(),
            proxy_url: None,
            verify_ssl: false, // Often used locally with self-signed certs
        }
    }

    /// Validate provider configuration
    pub fn validate(&self) -> Result<(), String> {
        if self.default_model.is_empty() {
            return Err("Default model cannot be empty".to_string());
        }

        if !self.models.iter().any(|m| m.name == self.default_model && m.enabled) {
            return Err(format!("Default model '{}' is not available or enabled", self.default_model));
        }

        match self.provider_type {
            ProviderType::OpenAI | ProviderType::Anthropic => {
                if self.api_key.is_none() || self.api_key.as_ref().unwrap().is_empty() {
                    return Err(format!("{} requires an API key", self.provider_type));
                }
            }
            ProviderType::Ollama => {
                if self.api_base_url.is_none() || self.api_base_url.as_ref().unwrap().is_empty() {
                    return Err("Ollama requires a base URL".to_string());
                }
            }
        }

        Ok(())
    }

    /// Get enabled models
    pub fn get_enabled_models(&self) -> Vec<&ModelConfig> {
        self.models.iter().filter(|m| m.enabled).collect()
    }

    /// Get model by name
    pub fn get_model(&self, name: &str) -> Option<&ModelConfig> {
        self.models.iter().find(|m| m.name == name)
    }
}

impl ModelConfig {
    pub fn with_context_length(mut self, length: u32) -> Self {
        self.context_length = Some(length);
        self
    }

    pub fn with_streaming(mut self, supports: bool) -> Self {
        self.supports_streaming = supports;
        self
    }

    pub fn with_functions(mut self, supports: bool) -> Self {
        self.supports_functions = supports;
        self
    }

    pub fn with_cost(mut self, input_cost: f64, output_cost: f64) -> Self {
        self.cost_per_input_token = Some(input_cost);
        self.cost_per_output_token = Some(output_cost);
        self
    }

    pub fn with_description(mut self, description: impl Into<String>) -> Self {
        self.description = Some(description.into());
        self
    }
}

/// Main AI configuration containing all providers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIConfig {
    pub default_provider: ProviderType,
    pub providers: HashMap<ProviderType, ProviderConfig>,
    pub global_timeout_seconds: u64,
    pub enable_logging: bool,
    pub log_level: String,
    pub cache_responses: bool,
    pub cache_ttl_seconds: u64,
}

impl Default for AIConfig {
    fn default() -> Self {
        let mut providers = HashMap::new();
        
        // Add default Ollama configuration (most likely to work out of the box)
        providers.insert(
            ProviderType::Ollama,
            ProviderConfig::ollama("http://localhost:11434")
        );

        Self {
            default_provider: ProviderType::Ollama,
            providers,
            global_timeout_seconds: 300,
            enable_logging: true,
            log_level: "info".to_string(),
            cache_responses: false,
            cache_ttl_seconds: 3600,
        }
    }
}

impl AIConfig {
    /// Create a new configuration with specified default provider
    pub fn new(default_provider: ProviderType) -> Self {
        let mut config = Self::default();
        config.default_provider = default_provider;
        config
    }

    /// Add a provider configuration
    pub fn add_provider(&mut self, config: ProviderConfig) -> Result<(), String> {
        config.validate()?;
        self.providers.insert(config.provider_type.clone(), config);
        Ok(())
    }

    /// Get provider configuration
    pub fn get_provider_config(&self, provider_type: &ProviderType) -> Option<&ProviderConfig> {
        self.providers.get(provider_type)
    }

    /// Remove a provider
    pub fn remove_provider(&mut self, provider_type: &ProviderType) -> Option<ProviderConfig> {
        if *provider_type == self.default_provider {
            // Don't allow removing the default provider without changing it first
            return None;
        }
        self.providers.remove(provider_type)
    }

    /// Set default provider
    pub fn set_default_provider(&mut self, provider_type: ProviderType) -> Result<(), String> {
        if !self.providers.contains_key(&provider_type) {
            return Err(format!("Provider {} is not configured", provider_type));
        }
        self.default_provider = provider_type;
        Ok(())
    }

    /// Get all enabled providers
    pub fn get_enabled_providers(&self) -> Vec<&ProviderConfig> {
        self.providers.values().filter(|p| p.enabled).collect()
    }

    /// Validate the entire configuration
    pub fn validate(&self) -> Result<(), String> {
        if !self.providers.contains_key(&self.default_provider) {
            return Err(format!("Default provider {} is not configured", self.default_provider));
        }

        for provider in self.providers.values() {
            provider.validate()?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_provider_type_display() {
        assert_eq!(ProviderType::OpenAI.to_string(), "openai");
        assert_eq!(ProviderType::Anthropic.to_string(), "anthropic");
        assert_eq!(ProviderType::Ollama.to_string(), "ollama");
    }

    #[test]
    fn test_provider_type_from_str() {
        assert_eq!("openai".parse::<ProviderType>().unwrap(), ProviderType::OpenAI);
        assert_eq!("anthropic".parse::<ProviderType>().unwrap(), ProviderType::Anthropic);
        assert_eq!("ollama".parse::<ProviderType>().unwrap(), ProviderType::Ollama);
        assert!("invalid".parse::<ProviderType>().is_err());
    }

    #[test]
    fn test_openai_config_creation() {
        let config = ProviderConfig::openai("test-key");
        assert_eq!(config.provider_type, ProviderType::OpenAI);
        assert_eq!(config.api_key, Some("test-key".to_string()));
        assert!(!config.models.is_empty());
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_anthropic_config_creation() {
        let config = ProviderConfig::anthropic("test-key");
        assert_eq!(config.provider_type, ProviderType::Anthropic);
        assert_eq!(config.api_key, Some("test-key".to_string()));
        assert!(!config.models.is_empty());
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_ollama_config_creation() {
        let config = ProviderConfig::ollama("http://localhost:11434");
        assert_eq!(config.provider_type, ProviderType::Ollama);
        assert!(config.api_key.is_none());
        assert!(!config.models.is_empty());
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_config_validation() {
        let mut config = ProviderConfig::openai("test-key");
        config.default_model = "nonexistent".to_string();
        assert!(config.validate().is_err());

        config.default_model = config.models[0].name.clone();
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_ai_config_default() {
        let config = AIConfig::default();
        assert_eq!(config.default_provider, ProviderType::Ollama);
        assert!(config.providers.contains_key(&ProviderType::Ollama));
    }

    #[test]
    fn test_ai_config_provider_management() {
        let mut config = AIConfig::default();
        let openai_config = ProviderConfig::openai("test-key");
        
        assert!(config.add_provider(openai_config).is_ok());
        assert!(config.providers.contains_key(&ProviderType::OpenAI));
        
        assert!(config.set_default_provider(ProviderType::OpenAI).is_ok());
        assert_eq!(config.default_provider, ProviderType::OpenAI);
    }
}