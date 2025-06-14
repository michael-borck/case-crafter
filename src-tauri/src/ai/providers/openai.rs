// OpenAI API provider implementation

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
use reqwest::{Client, header::{HeaderMap, HeaderValue, AUTHORIZATION, USER_AGENT}};
use serde::{Deserialize, Serialize};
use std::time::Instant;
use tokio::sync::RwLock;

/// OpenAI API request structures
#[derive(Debug, Serialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    frequency_penalty: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    presence_penalty: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stop: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    seed: Option<u64>,
    stream: bool,
}

#[derive(Debug, Serialize)]
struct OpenAIMessage {
    role: String,
    content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    name: Option<String>,
}

/// OpenAI API response structures
#[derive(Debug, Deserialize)]
struct OpenAIResponse {
    id: String,
    object: String,
    created: u64,
    model: String,
    choices: Vec<OpenAIChoice>,
    usage: OpenAIUsage,
}

#[derive(Debug, Deserialize)]
struct OpenAIChoice {
    index: u32,
    message: OpenAIResponseMessage,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAIResponseMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct OpenAIUsage {
    prompt_tokens: u32,
    completion_tokens: u32,
    total_tokens: u32,
}

#[derive(Debug, Deserialize)]
struct OpenAIStreamResponse {
    id: String,
    object: String,
    created: u64,
    model: String,
    choices: Vec<OpenAIStreamChoice>,
}

#[derive(Debug, Deserialize)]
struct OpenAIStreamChoice {
    index: u32,
    delta: OpenAIStreamDelta,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAIStreamDelta {
    role: Option<String>,
    content: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAIModel {
    id: String,
    object: String,
    created: u64,
    owned_by: String,
}

#[derive(Debug, Deserialize)]
struct OpenAIModelsResponse {
    object: String,
    data: Vec<OpenAIModel>,
}

#[derive(Debug, Deserialize)]
struct OpenAIError {
    error: OpenAIErrorDetails,
}

#[derive(Debug, Deserialize)]
struct OpenAIErrorDetails {
    message: String,
    #[serde(rename = "type")]
    error_type: String,
    param: Option<String>,
    code: Option<String>,
}

/// OpenAI provider implementation
pub struct OpenAIProvider {
    config: ProviderConfig,
    client: Client,
    stats: RwLock<GenerationStats>,
}

impl OpenAIProvider {
    /// Create a new OpenAI provider
    pub async fn new(config: ProviderConfig) -> Result<Self> {
        let mut headers = HeaderMap::new();
        
        // Add authorization header
        if let Some(api_key) = &config.api_key {
            let auth_value = format!("Bearer {}", api_key);
            headers.insert(
                AUTHORIZATION,
                HeaderValue::from_str(&auth_value)
                    .map_err(|e| AIError::ConfigurationError(format!("Invalid API key format: {}", e)))?
            );
        }

        // Add organization header if provided
        if let Some(org) = &config.organization {
            headers.insert(
                "OpenAI-Organization",
                HeaderValue::from_str(org)
                    .map_err(|e| AIError::ConfigurationError(format!("Invalid organization format: {}", e)))?
            );
        }

        // Add project header if provided
        if let Some(project) = &config.project {
            headers.insert(
                "OpenAI-Project",
                HeaderValue::from_str(project)
                    .map_err(|e| AIError::ConfigurationError(format!("Invalid project format: {}", e)))?
            );
        }

        headers.insert(USER_AGENT, HeaderValue::from_static("case-crafter/1.0"));

        // Add custom headers
        for (key, value) in &config.custom_headers {
            let header_name = reqwest::header::HeaderName::from_bytes(key.as_bytes())
                .map_err(|e| AIError::ConfigurationError(format!("Invalid header key '{}': {}", key, e)))?;
            headers.insert(
                header_name,
                HeaderValue::from_str(value)
                    .map_err(|e| AIError::ConfigurationError(format!("Invalid header value for '{}': {}", key, e)))?
            );
        }

        let client = Client::builder()
            .default_headers(headers)
            .timeout(std::time::Duration::from_secs(config.timeout_seconds))
            .build()
            .map_err(|e| AIError::NetworkError(e.to_string()))?;

        let provider = Self {
            config,
            client,
            stats: RwLock::new(GenerationStats::default()),
        };

        // Verify API key works
        provider.health_check().await?;

        Ok(provider)
    }

    /// Convert chat messages to OpenAI format
    fn convert_messages(&self, messages: &[ChatMessage]) -> Vec<OpenAIMessage> {
        messages
            .iter()
            .map(|msg| OpenAIMessage {
                role: match msg.role {
                    MessageRole::System => "system".to_string(),
                    MessageRole::User => "user".to_string(),
                    MessageRole::Assistant => "assistant".to_string(),
                    MessageRole::Function => "function".to_string(),
                },
                content: msg.content.clone(),
                name: msg.name.clone(),
            })
            .collect()
    }

    /// Convert generation request to OpenAI format
    fn create_openai_request(&self, request: &GenerationRequest, stream: bool) -> OpenAIRequest {
        OpenAIRequest {
            model: request.model.clone(),
            messages: self.convert_messages(&request.messages),
            temperature: request.params.temperature,
            max_tokens: request.params.max_tokens,
            top_p: request.params.top_p,
            frequency_penalty: request.params.frequency_penalty,
            presence_penalty: request.params.presence_penalty,
            stop: request.params.stop_sequences.clone(),
            seed: request.params.seed,
            stream,
        }
    }

    /// Handle OpenAI API errors
    fn handle_error(&self, status: reqwest::StatusCode, error_text: &str) -> AIError {
        match status {
            reqwest::StatusCode::UNAUTHORIZED => {
                AIError::AuthenticationError("Invalid API key".to_string())
            }
            reqwest::StatusCode::TOO_MANY_REQUESTS => {
                AIError::RateLimitError("Rate limit exceeded".to_string())
            }
            reqwest::StatusCode::BAD_REQUEST => {
                // Try to parse OpenAI error format
                if let Ok(openai_error) = serde_json::from_str::<OpenAIError>(error_text) {
                    AIError::InvalidRequest(openai_error.error.message)
                } else {
                    AIError::InvalidRequest(error_text.to_string())
                }
            }
            _ => AIError::ProviderError(format!("OpenAI API error ({}): {}", status, error_text))
        }
    }

    /// Make a non-streaming chat request
    async fn chat_request(&self, request: GenerationRequest) -> Result<GenerationResponse> {
        let start_time = Instant::now();
        
        let openai_request = self.create_openai_request(&request, false);
        let url = format!("{}/chat/completions", 
            self.config.api_base_url.as_ref().unwrap());

        let response = self
            .client
            .post(&url)
            .json(&openai_request)
            .send()
            .await
            .map_err(|e| AIError::NetworkError(e.to_string()))?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(self.handle_error(status, &error_text));
        }

        let openai_response: OpenAIResponse = response
            .json()
            .await
            .map_err(|e| AIError::ParsingError(e.to_string()))?;

        let response_time = start_time.elapsed().as_millis() as u64;

        if openai_response.choices.is_empty() {
            return Err(AIError::ProviderError("No choices returned from OpenAI".to_string()));
        }

        let choice = &openai_response.choices[0];
        let usage = TokenUsage::new(
            openai_response.usage.prompt_tokens,
            openai_response.usage.completion_tokens,
        );

        // Calculate cost if pricing is available
        let cost = self.estimate_cost(
            usage.prompt_tokens,
            usage.completion_tokens,
            &request.model,
        );

        // Update stats
        {
            let mut stats = self.stats.write().await;
            stats.add_request(true, usage.total_tokens, response_time, cost);
        }

        Ok(GenerationResponse::new(choice.message.content.clone(), request.model)
            .with_usage(usage)
            .with_finish_reason(choice.finish_reason.clone().unwrap_or("unknown".to_string()))
            .with_response_time(response_time))
    }

    /// Make a streaming chat request
    async fn chat_stream(&self, request: GenerationRequest) -> Result<Box<dyn Stream<Item = Result<StreamResponse>> + Unpin + Send>> {
        let openai_request = self.create_openai_request(&request, true);
        let url = format!("{}/chat/completions", 
            self.config.api_base_url.as_ref().unwrap());

        let response = self
            .client
            .post(&url)
            .json(&openai_request)
            .send()
            .await
            .map_err(|e| AIError::NetworkError(e.to_string()))?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(self.handle_error(status, &error_text));
        }

        let stream = response
            .bytes_stream()
            .map(|chunk| {
                let chunk = chunk.map_err(|e| AIError::StreamingError(e.to_string()))?;
                let text = String::from_utf8_lossy(&chunk);
                
                for line in text.lines() {
                    let line = line.trim();
                    if line.is_empty() || !line.starts_with("data: ") {
                        continue;
                    }
                    
                    let data = &line[6..]; // Remove "data: " prefix
                    if data == "[DONE]" {
                        return Ok(StreamResponse::finished());
                    }
                    
                    match serde_json::from_str::<OpenAIStreamResponse>(data) {
                        Ok(stream_response) => {
                            if let Some(choice) = stream_response.choices.first() {
                                if let Some(content) = &choice.delta.content {
                                    return Ok(StreamResponse::chunk(content.clone()));
                                }
                                if choice.finish_reason.is_some() {
                                    return Ok(StreamResponse::finished());
                                }
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
impl AIProvider for OpenAIProvider {
    async fn generate(&self, request: GenerationRequest) -> Result<GenerationResponse> {
        self.validate_model(&request.model)?;
        self.chat_request(request).await
    }

    async fn generate_stream(&self, request: GenerationRequest) -> Result<Box<dyn Stream<Item = Result<StreamResponse>> + Unpin + Send>> {
        self.validate_model(&request.model)?;
        self.chat_stream(request).await
    }

    async fn get_models(&self) -> Result<Vec<ModelInfo>> {
        let url = format!("{}/models", 
            self.config.api_base_url.as_ref().unwrap());

        let response = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| AIError::NetworkError(e.to_string()))?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(self.handle_error(status, &error_text));
        }

        let openai_response: OpenAIModelsResponse = response
            .json()
            .await
            .map_err(|e| AIError::ParsingError(e.to_string()))?;

        let models = openai_response
            .data
            .into_iter()
            .filter(|model| model.id.starts_with("gpt-")) // Only include GPT models
            .map(|model| {
                let mut model_info = ModelInfo::new(model.id.clone(), model.id.clone())
                    .with_streaming(true)
                    .with_functions(true);

                // Add context length and cost info based on known models
                match model.id.as_str() {
                    "gpt-4o" => {
                        model_info = model_info
                            .with_context_length(128000)
                            .with_cost(0.005, 0.015);
                    }
                    "gpt-4o-mini" => {
                        model_info = model_info
                            .with_context_length(128000)
                            .with_cost(0.00015, 0.00060);
                    }
                    "gpt-4-turbo" => {
                        model_info = model_info
                            .with_context_length(128000)
                            .with_cost(0.01, 0.03);
                    }
                    "gpt-3.5-turbo" => {
                        model_info = model_info
                            .with_context_length(16385)
                            .with_cost(0.001, 0.002);
                    }
                    _ => {
                        // Default for unknown models
                        model_info = model_info.with_context_length(8192);
                    }
                }

                model_info
            })
            .collect();

        Ok(models)
    }

    async fn health_check(&self) -> Result<bool> {
        let url = format!("{}/models", 
            self.config.api_base_url.as_ref().unwrap());

        match self.client.get(&url).send().await {
            Ok(response) => Ok(response.status().is_success()),
            Err(_) => Ok(false),
        }
    }

    fn get_capabilities(&self) -> ProviderCapabilities {
        ProviderCapabilities {
            supports_streaming: true,
            supports_functions: true,
            supports_vision: true, // GPT-4V models support vision
            supports_fine_tuning: true,
            max_context_length: Some(128000), // GPT-4o context length
            supported_formats: vec!["text".to_string(), "image".to_string()],
            rate_limits: Some([
                ("requests_per_minute".to_string(), 10000),
                ("tokens_per_minute".to_string(), 2000000),
            ].iter().cloned().collect()),
        }
    }

    fn get_provider_type(&self) -> ProviderType {
        ProviderType::OpenAI
    }

    async fn get_stats(&self) -> Result<GenerationStats> {
        Ok(self.stats.read().await.clone())
    }

    fn get_name(&self) -> &str {
        "OpenAI"
    }

    fn get_description(&self) -> &str {
        "OpenAI's GPT models for advanced language understanding and generation"
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

    fn estimate_cost(&self, prompt_tokens: u32, completion_tokens: u32, model: &str) -> Option<f64> {
        if let Some(model_config) = self.config.get_model(model) {
            if let (Some(input_cost), Some(output_cost)) = 
                (model_config.cost_per_input_token, model_config.cost_per_output_token) {
                let total_cost = (prompt_tokens as f64 * input_cost) + (completion_tokens as f64 * output_cost);
                return Some(total_cost);
            }
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ai::models::{ChatMessage, GenerationParams};

    #[test]
    fn test_message_conversion() {
        let config = ProviderConfig::openai("test-key");
        let provider = OpenAIProvider {
            config,
            client: Client::new(),
            stats: RwLock::new(GenerationStats::default()),
        };

        let messages = vec![
            ChatMessage::system("You are a helpful assistant"),
            ChatMessage::user("Hello").with_name("TestUser"),
        ];

        let openai_messages = provider.convert_messages(&messages);
        assert_eq!(openai_messages.len(), 2);
        assert_eq!(openai_messages[0].role, "system");
        assert_eq!(openai_messages[1].role, "user");
        assert_eq!(openai_messages[1].name, Some("TestUser".to_string()));
    }

    #[test]
    fn test_request_creation() {
        let config = ProviderConfig::openai("test-key");
        let provider = OpenAIProvider {
            config,
            client: Client::new(),
            stats: RwLock::new(GenerationStats::default()),
        };

        let request = GenerationRequest {
            messages: vec![ChatMessage::user("Test")],
            model: "gpt-4o-mini".to_string(),
            params: GenerationParams {
                temperature: Some(0.8),
                max_tokens: Some(1000),
                ..Default::default()
            },
            stream: false,
            metadata: std::collections::HashMap::new(),
        };

        let openai_request = provider.create_openai_request(&request, true);
        assert_eq!(openai_request.model, "gpt-4o-mini");
        assert_eq!(openai_request.temperature, Some(0.8));
        assert_eq!(openai_request.max_tokens, Some(1000));
        assert!(openai_request.stream);
    }

    #[test]
    fn test_cost_estimation() {
        let config = ProviderConfig::openai("test-key");
        let provider = OpenAIProvider {
            config,
            client: Client::new(),
            stats: RwLock::new(GenerationStats::default()),
        };

        let cost = provider.estimate_cost(1000, 500, "gpt-4o-mini");
        assert!(cost.is_some());
        
        let expected_cost = (1000.0 * 0.00015) + (500.0 * 0.00060);
        assert_eq!(cost.unwrap(), expected_cost);
    }

    #[test]
    fn test_error_handling() {
        let config = ProviderConfig::openai("test-key");
        let provider = OpenAIProvider {
            config,
            client: Client::new(),
            stats: RwLock::new(GenerationStats::default()),
        };

        let error = provider.handle_error(reqwest::StatusCode::UNAUTHORIZED, "Unauthorized");
        assert!(matches!(error, AIError::AuthenticationError(_)));

        let error = provider.handle_error(reqwest::StatusCode::TOO_MANY_REQUESTS, "Rate limited");
        assert!(matches!(error, AIError::RateLimitError(_)));
    }
}