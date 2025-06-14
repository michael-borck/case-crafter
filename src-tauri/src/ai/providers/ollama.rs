// Ollama AI provider implementation

use crate::ai::{
    config::{ProviderConfig, ProviderType},
    errors::{AIError, Result},
    models::{
        ChatMessage, GenerationRequest, GenerationResponse, GenerationStats,
        MessageRole, ModelInfo, ProviderCapabilities, StreamResponse, TokenUsage,
    },
    providers::AIProvider,
};
use async_trait::async_trait;
use futures::{Stream, StreamExt};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Instant;
use tokio::sync::RwLock;

/// Ollama API request structures
#[derive(Debug, Serialize)]
struct OllamaRequest {
    model: String,
    prompt: String,
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    options: Option<OllamaOptions>,
}

#[derive(Debug, Serialize)]
struct OllamaChatRequest {
    model: String,
    messages: Vec<OllamaMessage>,
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    options: Option<OllamaOptions>,
}

#[derive(Debug, Serialize)]
struct OllamaMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize)]
struct OllamaOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    top_k: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    num_predict: Option<u32>, // max_tokens equivalent
}

/// Ollama API response structures
#[derive(Debug, Deserialize)]
struct OllamaResponse {
    response: String,
    done: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    total_duration: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    load_duration: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    prompt_eval_count: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    eval_count: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct OllamaChatResponse {
    message: OllamaResponseMessage,
    done: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    total_duration: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    load_duration: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    prompt_eval_count: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    eval_count: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct OllamaResponseMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct OllamaModel {
    name: String,
    size: u64,
    digest: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    modified_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OllamaModelsResponse {
    models: Vec<OllamaModel>,
}

/// Ollama provider implementation
pub struct OllamaProvider {
    config: ProviderConfig,
    client: Client,
    stats: RwLock<GenerationStats>,
}

impl OllamaProvider {
    /// Create a new Ollama provider
    pub async fn new(config: ProviderConfig) -> Result<Self> {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(config.timeout_seconds))
            .build()
            .map_err(|e| AIError::NetworkError(e.to_string()))?;

        let provider = Self {
            config,
            client,
            stats: RwLock::new(GenerationStats::default()),
        };

        // Verify connection
        provider.health_check().await?;

        Ok(provider)
    }

    /// Convert chat messages to Ollama format
    fn convert_messages(&self, messages: &[ChatMessage]) -> Vec<OllamaMessage> {
        messages
            .iter()
            .map(|msg| OllamaMessage {
                role: match msg.role {
                    MessageRole::System => "system".to_string(),
                    MessageRole::User => "user".to_string(),
                    MessageRole::Assistant => "assistant".to_string(),
                    MessageRole::Function => "assistant".to_string(), // Fallback
                },
                content: msg.content.clone(),
            })
            .collect()
    }

    /// Convert generation request to Ollama options
    fn convert_options(&self, request: &GenerationRequest) -> OllamaOptions {
        OllamaOptions {
            temperature: request.params.temperature,
            top_p: request.params.top_p,
            top_k: request.params.top_k,
            num_predict: request.params.max_tokens,
        }
    }

    /// Make a non-streaming chat request
    async fn chat_request(&self, request: GenerationRequest) -> Result<GenerationResponse> {
        let start_time = Instant::now();
        
        let ollama_request = OllamaChatRequest {
            model: request.model.clone(),
            messages: self.convert_messages(&request.messages),
            stream: false,
            options: Some(self.convert_options(&request)),
        };

        let url = format!("{}/api/chat", 
            self.config.api_base_url.as_ref().unwrap());

        let response = self
            .client
            .post(&url)
            .json(&ollama_request)
            .send()
            .await
            .map_err(|e| AIError::NetworkError(e.to_string()))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(AIError::ProviderError(format!("Ollama API error: {}", error_text)));
        }

        let ollama_response: OllamaChatResponse = response
            .json()
            .await
            .map_err(|e| AIError::ParsingError(e.to_string()))?;

        let response_time = start_time.elapsed().as_millis() as u64;

        let usage = TokenUsage::new(
            ollama_response.prompt_eval_count.unwrap_or(0),
            ollama_response.eval_count.unwrap_or(0),
        );

        // Update stats
        {
            let mut stats = self.stats.write().await;
            stats.add_request(true, usage.total_tokens, response_time, None);
        }

        Ok(GenerationResponse::new(ollama_response.message.content, request.model)
            .with_usage(usage)
            .with_finish_reason("stop")
            .with_response_time(response_time))
    }

    /// Make a streaming chat request
    async fn chat_stream(&self, request: GenerationRequest) -> Result<Box<dyn Stream<Item = Result<StreamResponse>> + Unpin + Send>> {
        let ollama_request = OllamaChatRequest {
            model: request.model.clone(),
            messages: self.convert_messages(&request.messages),
            stream: true,
            options: Some(self.convert_options(&request)),
        };

        let url = format!("{}/api/chat", 
            self.config.api_base_url.as_ref().unwrap());

        let response = self
            .client
            .post(&url)
            .json(&ollama_request)
            .send()
            .await
            .map_err(|e| AIError::NetworkError(e.to_string()))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(AIError::ProviderError(format!("Ollama API error: {}", error_text)));
        }

        let stream = response
            .bytes_stream()
            .map(|chunk| {
                let chunk = chunk.map_err(|e| AIError::StreamingError(e.to_string()))?;
                let text = String::from_utf8_lossy(&chunk);
                
                // Parse each line as JSON
                for line in text.lines() {
                    if line.trim().is_empty() {
                        continue;
                    }
                    
                    match serde_json::from_str::<OllamaChatResponse>(line) {
                        Ok(ollama_response) => {
                            if ollama_response.done {
                                return Ok(StreamResponse::finished());
                            } else {
                                return Ok(StreamResponse::chunk(ollama_response.message.content));
                            }
                        }
                        Err(e) => {
                            return Err(AIError::ParsingError(format!("Failed to parse streaming response: {}", e)));
                        }
                    }
                }
                
                Ok(StreamResponse::chunk(""))
            });

        Ok(Box::new(Box::pin(stream)))
    }
}

#[async_trait]
impl AIProvider for OllamaProvider {
    async fn generate(&self, request: GenerationRequest) -> Result<GenerationResponse> {
        self.validate_model(&request.model)?;
        self.chat_request(request).await
    }

    async fn generate_stream(&self, request: GenerationRequest) -> Result<Box<dyn Stream<Item = Result<StreamResponse>> + Unpin + Send>> {
        self.validate_model(&request.model)?;
        self.chat_stream(request).await
    }

    async fn get_models(&self) -> Result<Vec<ModelInfo>> {
        let url = format!("{}/api/tags", 
            self.config.api_base_url.as_ref().unwrap());

        let response = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| AIError::NetworkError(e.to_string()))?;

        if !response.status().is_success() {
            return Err(AIError::ProviderError("Failed to fetch Ollama models".to_string()));
        }

        let ollama_response: OllamaModelsResponse = response
            .json()
            .await
            .map_err(|e| AIError::ParsingError(e.to_string()))?;

        let models = ollama_response
            .models
            .into_iter()
            .map(|model| {
                ModelInfo::new(model.name.clone(), model.name)
                    .with_streaming(true)
                    // Ollama doesn't provide context length info via API
                    .with_context_length(8192) // Default assumption
            })
            .collect();

        Ok(models)
    }

    async fn health_check(&self) -> Result<bool> {
        let url = format!("{}/api/tags", 
            self.config.api_base_url.as_ref().unwrap());

        match self.client.get(&url).send().await {
            Ok(response) => Ok(response.status().is_success()),
            Err(_) => Ok(false),
        }
    }

    fn get_capabilities(&self) -> ProviderCapabilities {
        ProviderCapabilities {
            supports_streaming: true,
            supports_functions: false, // Ollama doesn't support function calling
            supports_vision: false,    // Model-dependent, but generally no
            supports_fine_tuning: false,
            max_context_length: Some(8192), // Default, varies by model
            supported_formats: vec!["text".to_string()],
            rate_limits: None, // No rate limits for local Ollama
        }
    }

    fn get_provider_type(&self) -> ProviderType {
        ProviderType::Ollama
    }

    async fn get_stats(&self) -> Result<GenerationStats> {
        Ok(self.stats.read().await.clone())
    }

    fn get_name(&self) -> &str {
        "Ollama"
    }

    fn get_description(&self) -> &str {
        "Local AI model runner for open-source language models"
    }

    fn validate_model(&self, model_name: &str) -> Result<()> {
        if model_name.is_empty() {
            return Err(AIError::InvalidRequest("Model name cannot be empty".to_string()));
        }
        
        // Check if model exists in configuration
        if let Some(model_config) = self.config.get_model(model_name) {
            if !model_config.enabled {
                return Err(AIError::ModelNotFound(format!("Model '{}' is disabled", model_name)));
            }
        }
        
        Ok(())
    }

    fn get_default_model(&self) -> &str {
        &self.config.default_model
    }

    fn estimate_cost(&self, _prompt_tokens: u32, _completion_tokens: u32, _model: &str) -> Option<f64> {
        // Ollama is free for local usage
        Some(0.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ai::models::{ChatMessage, GenerationParams};

    #[test]
    fn test_message_conversion() {
        let config = ProviderConfig::ollama("http://localhost:11434");
        let provider = OllamaProvider {
            config,
            client: Client::new(),
            stats: RwLock::new(GenerationStats::default()),
        };

        let messages = vec![
            ChatMessage::system("You are a helpful assistant"),
            ChatMessage::user("Hello"),
        ];

        let ollama_messages = provider.convert_messages(&messages);
        assert_eq!(ollama_messages.len(), 2);
        assert_eq!(ollama_messages[0].role, "system");
        assert_eq!(ollama_messages[1].role, "user");
    }

    #[test]
    fn test_options_conversion() {
        let config = ProviderConfig::ollama("http://localhost:11434");
        let provider = OllamaProvider {
            config,
            client: Client::new(),
            stats: RwLock::new(GenerationStats::default()),
        };

        let request = GenerationRequest {
            messages: vec![],
            model: "test".to_string(),
            params: GenerationParams {
                temperature: Some(0.8),
                max_tokens: Some(1000),
                top_p: Some(0.9),
                top_k: Some(50),
                ..Default::default()
            },
            stream: false,
            metadata: std::collections::HashMap::new(),
        };

        let options = provider.convert_options(&request);
        assert_eq!(options.temperature, Some(0.8));
        assert_eq!(options.num_predict, Some(1000));
        assert_eq!(options.top_p, Some(0.9));
        assert_eq!(options.top_k, Some(50));
    }

    #[test]
    fn test_model_validation() {
        let config = ProviderConfig::ollama("http://localhost:11434");
        let provider = OllamaProvider {
            config,
            client: Client::new(),
            stats: RwLock::new(GenerationStats::default()),
        };

        assert!(provider.validate_model("").is_err());
        assert!(provider.validate_model("valid-model").is_ok());
    }

    #[test]
    fn test_capabilities() {
        let config = ProviderConfig::ollama("http://localhost:11434");
        let provider = OllamaProvider {
            config,
            client: Client::new(),
            stats: RwLock::new(GenerationStats::default()),
        };

        let capabilities = provider.get_capabilities();
        assert!(capabilities.supports_streaming);
        assert!(!capabilities.supports_functions);
        assert_eq!(capabilities.max_context_length, Some(8192));
    }
}