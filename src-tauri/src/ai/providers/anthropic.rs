// Anthropic Claude API provider implementation

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
use reqwest::{Client, header::{HeaderMap, HeaderValue, USER_AGENT}};
use serde::{Deserialize, Serialize};
use std::time::Instant;
use tokio::sync::RwLock;

/// Anthropic API request structures
#[derive(Debug, Serialize)]
struct AnthropicRequest {
    model: String,
    max_tokens: u32,
    messages: Vec<AnthropicMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    top_k: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stop_sequences: Option<Vec<String>>,
    stream: bool,
}

#[derive(Debug, Serialize)]
struct AnthropicMessage {
    role: String,
    content: String,
}

/// Anthropic API response structures
#[derive(Debug, Deserialize)]
struct AnthropicResponse {
    id: String,
    #[serde(rename = "type")]
    response_type: String,
    role: String,
    content: Vec<AnthropicContent>,
    model: String,
    stop_reason: Option<String>,
    stop_sequence: Option<String>,
    usage: AnthropicUsage,
}

#[derive(Debug, Deserialize)]
struct AnthropicContent {
    #[serde(rename = "type")]
    content_type: String,
    text: String,
}

#[derive(Debug, Deserialize)]
struct AnthropicUsage {
    input_tokens: u32,
    output_tokens: u32,
}

#[derive(Debug, Deserialize)]
struct AnthropicStreamResponse {
    #[serde(rename = "type")]
    event_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    content_block: Option<AnthropicContentBlock>,
    #[serde(skip_serializing_if = "Option::is_none")]
    delta: Option<AnthropicDelta>,
    #[serde(skip_serializing_if = "Option::is_none")]
    usage: Option<AnthropicUsage>,
}

#[derive(Debug, Deserialize)]
struct AnthropicContentBlock {
    #[serde(rename = "type")]
    block_type: String,
    text: String,
}

#[derive(Debug, Deserialize)]
struct AnthropicDelta {
    #[serde(rename = "type")]
    delta_type: String,
    text: Option<String>,
    stop_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AnthropicError {
    #[serde(rename = "type")]
    error_type: String,
    error: AnthropicErrorDetails,
}

#[derive(Debug, Deserialize)]
struct AnthropicErrorDetails {
    #[serde(rename = "type")]
    error_type: String,
    message: String,
}

/// Anthropic provider implementation
pub struct AnthropicProvider {
    config: ProviderConfig,
    client: Client,
    stats: RwLock<GenerationStats>,
}

impl AnthropicProvider {
    /// Create a new Anthropic provider
    pub async fn new(config: ProviderConfig) -> Result<Self> {
        let mut headers = HeaderMap::new();
        
        // Add API key header
        if let Some(api_key) = &config.api_key {
            headers.insert(
                "x-api-key",
                HeaderValue::from_str(api_key)
                    .map_err(|e| AIError::ConfigurationError(format!("Invalid API key format: {}", e)))?
            );
        }

        // Add required version header
        headers.insert(
            "anthropic-version",
            HeaderValue::from_static("2023-06-01")
        );

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

        // Verify API key works (Anthropic doesn't have a simple health check endpoint)
        // We'll do this in the first actual request

        Ok(provider)
    }

    /// Convert chat messages to Anthropic format
    fn convert_messages(&self, messages: &[ChatMessage]) -> (Option<String>, Vec<AnthropicMessage>) {
        let mut system_message = None;
        let mut anthropic_messages = Vec::new();

        for msg in messages {
            match msg.role {
                MessageRole::System => {
                    // Anthropic handles system messages separately
                    system_message = Some(msg.content.clone());
                }
                MessageRole::User => {
                    anthropic_messages.push(AnthropicMessage {
                        role: "user".to_string(),
                        content: msg.content.clone(),
                    });
                }
                MessageRole::Assistant => {
                    anthropic_messages.push(AnthropicMessage {
                        role: "assistant".to_string(),
                        content: msg.content.clone(),
                    });
                }
                MessageRole::Function => {
                    // Anthropic doesn't support function messages directly
                    // Convert to assistant message
                    anthropic_messages.push(AnthropicMessage {
                        role: "assistant".to_string(),
                        content: msg.content.clone(),
                    });
                }
            }
        }

        (system_message, anthropic_messages)
    }

    /// Create Anthropic request from generation request
    fn create_anthropic_request(&self, request: &GenerationRequest, stream: bool) -> Result<AnthropicRequest> {
        let (system, messages) = self.convert_messages(&request.messages);
        
        // Anthropic requires max_tokens to be specified
        let max_tokens = request.params.max_tokens.unwrap_or(4096);

        Ok(AnthropicRequest {
            model: request.model.clone(),
            max_tokens,
            messages,
            system,
            temperature: request.params.temperature,
            top_p: request.params.top_p,
            top_k: request.params.top_k,
            stop_sequences: request.params.stop_sequences.clone(),
            stream,
        })
    }

    /// Handle Anthropic API errors
    fn handle_error(&self, status: reqwest::StatusCode, error_text: &str) -> AIError {
        match status {
            reqwest::StatusCode::UNAUTHORIZED => {
                AIError::AuthenticationError("Invalid API key".to_string())
            }
            reqwest::StatusCode::TOO_MANY_REQUESTS => {
                AIError::RateLimitError("Rate limit exceeded".to_string())
            }
            reqwest::StatusCode::BAD_REQUEST => {
                // Try to parse Anthropic error format
                if let Ok(anthropic_error) = serde_json::from_str::<AnthropicError>(error_text) {
                    AIError::InvalidRequest(anthropic_error.error.message)
                } else {
                    AIError::InvalidRequest(error_text.to_string())
                }
            }
            _ => AIError::ProviderError(format!("Anthropic API error ({}): {}", status, error_text))
        }
    }

    /// Make a non-streaming request
    async fn messages_request(&self, request: GenerationRequest) -> Result<GenerationResponse> {
        let start_time = Instant::now();
        
        let anthropic_request = self.create_anthropic_request(&request, false)?;
        let url = format!("{}/v1/messages", 
            self.config.api_base_url.as_ref().unwrap());

        let response = self
            .client
            .post(&url)
            .json(&anthropic_request)
            .send()
            .await
            .map_err(|e| AIError::NetworkError(e.to_string()))?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(self.handle_error(status, &error_text));
        }

        let anthropic_response: AnthropicResponse = response
            .json()
            .await
            .map_err(|e| AIError::ParsingError(e.to_string()))?;

        let response_time = start_time.elapsed().as_millis() as u64;

        // Extract content from response
        let content = anthropic_response
            .content
            .into_iter()
            .map(|c| c.text)
            .collect::<Vec<_>>()
            .join("");

        let usage = TokenUsage::new(
            anthropic_response.usage.input_tokens,
            anthropic_response.usage.output_tokens,
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

        Ok(GenerationResponse::new(content, request.model)
            .with_usage(usage)
            .with_finish_reason(anthropic_response.stop_reason.unwrap_or("unknown".to_string()))
            .with_response_time(response_time))
    }

    /// Make a streaming request
    async fn messages_stream(&self, request: GenerationRequest) -> Result<Box<dyn Stream<Item = Result<StreamResponse>> + Unpin + Send>> {
        let anthropic_request = self.create_anthropic_request(&request, true)?;
        let url = format!("{}/v1/messages", 
            self.config.api_base_url.as_ref().unwrap());

        let response = self
            .client
            .post(&url)
            .json(&anthropic_request)
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
                    
                    match serde_json::from_str::<AnthropicStreamResponse>(data) {
                        Ok(stream_response) => {
                            match stream_response.event_type.as_str() {
                                "content_block_delta" => {
                                    if let Some(delta) = stream_response.delta {
                                        if let Some(text) = delta.text {
                                            return Ok(StreamResponse::chunk(text));
                                        }
                                        if delta.stop_reason.is_some() {
                                            return Ok(StreamResponse::finished());
                                        }
                                    }
                                }
                                "message_stop" => {
                                    return Ok(StreamResponse::finished());
                                }
                                _ => continue,
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
impl AIProvider for AnthropicProvider {
    async fn generate(&self, request: GenerationRequest) -> Result<GenerationResponse> {
        self.validate_model(&request.model)?;
        self.messages_request(request).await
    }

    async fn generate_stream(&self, request: GenerationRequest) -> Result<Box<dyn Stream<Item = Result<StreamResponse>> + Unpin + Send>> {
        self.validate_model(&request.model)?;
        self.messages_stream(request).await
    }

    async fn get_models(&self) -> Result<Vec<ModelInfo>> {
        // Anthropic doesn't provide a models endpoint, so we return configured models
        let models = self.config.models
            .iter()
            .filter(|m| m.enabled)
            .map(|model_config| {
                let mut model_info = ModelInfo::new(model_config.name.clone(), model_config.display_name.clone())
                    .with_streaming(model_config.supports_streaming);

                if let Some(context_length) = model_config.context_length {
                    model_info = model_info.with_context_length(context_length);
                }

                if let (Some(input_cost), Some(output_cost)) = 
                    (model_config.cost_per_input_token, model_config.cost_per_output_token) {
                    model_info = model_info.with_cost(input_cost, output_cost);
                }

                model_info
            })
            .collect();

        Ok(models)
    }

    async fn health_check(&self) -> Result<bool> {
        // Anthropic doesn't have a dedicated health check endpoint
        // We'll try a minimal request to test connectivity
        let test_request = AnthropicRequest {
            model: self.config.default_model.clone(),
            max_tokens: 1,
            messages: vec![AnthropicMessage {
                role: "user".to_string(),
                content: "Hi".to_string(),
            }],
            system: None,
            temperature: None,
            top_p: None,
            top_k: None,
            stop_sequences: None,
            stream: false,
        };

        let url = format!("{}/v1/messages", 
            self.config.api_base_url.as_ref().unwrap());

        match self.client.post(&url).json(&test_request).send().await {
            Ok(response) => Ok(response.status().is_success()),
            Err(_) => Ok(false),
        }
    }

    fn get_capabilities(&self) -> ProviderCapabilities {
        ProviderCapabilities {
            supports_streaming: true,
            supports_functions: false, // Claude doesn't support function calling in the same way
            supports_vision: true,     // Claude 3 models support vision
            supports_fine_tuning: false,
            max_context_length: Some(200000), // Claude 3 context length
            supported_formats: vec!["text".to_string(), "image".to_string()],
            rate_limits: Some([
                ("requests_per_minute".to_string(), 4000),
                ("tokens_per_minute".to_string(), 400000),
            ].iter().cloned().collect()),
        }
    }

    fn get_provider_type(&self) -> ProviderType {
        ProviderType::Anthropic
    }

    async fn get_stats(&self) -> Result<GenerationStats> {
        Ok(self.stats.read().await.clone())
    }

    fn get_name(&self) -> &str {
        "Anthropic"
    }

    fn get_description(&self) -> &str {
        "Anthropic's Claude models for safe, helpful, and honest AI assistance"
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
        let config = ProviderConfig::anthropic("test-key");
        let provider = AnthropicProvider {
            config,
            client: Client::new(),
            stats: RwLock::new(GenerationStats::default()),
        };

        let messages = vec![
            ChatMessage::system("You are a helpful assistant"),
            ChatMessage::user("Hello"),
            ChatMessage::assistant("Hi there!"),
        ];

        let (system, anthropic_messages) = provider.convert_messages(&messages);
        assert_eq!(system, Some("You are a helpful assistant".to_string()));
        assert_eq!(anthropic_messages.len(), 2);
        assert_eq!(anthropic_messages[0].role, "user");
        assert_eq!(anthropic_messages[1].role, "assistant");
    }

    #[test]
    fn test_request_creation() {
        let config = ProviderConfig::anthropic("test-key");
        let provider = AnthropicProvider {
            config,
            client: Client::new(),
            stats: RwLock::new(GenerationStats::default()),
        };

        let request = GenerationRequest {
            messages: vec![
                ChatMessage::system("Be helpful"),
                ChatMessage::user("Test"),
            ],
            model: "claude-3-5-sonnet-20241022".to_string(),
            params: GenerationParams {
                temperature: Some(0.8),
                max_tokens: Some(1000),
                ..Default::default()
            },
            stream: false,
            metadata: std::collections::HashMap::new(),
        };

        let anthropic_request = provider.create_anthropic_request(&request, true).unwrap();
        assert_eq!(anthropic_request.model, "claude-3-5-sonnet-20241022");
        assert_eq!(anthropic_request.temperature, Some(0.8));
        assert_eq!(anthropic_request.max_tokens, 1000);
        assert_eq!(anthropic_request.system, Some("Be helpful".to_string()));
        assert!(anthropic_request.stream);
    }

    #[test]
    fn test_cost_estimation() {
        let config = ProviderConfig::anthropic("test-key");
        let provider = AnthropicProvider {
            config,
            client: Client::new(),
            stats: RwLock::new(GenerationStats::default()),
        };

        let cost = provider.estimate_cost(1000, 500, "claude-3-5-sonnet-20241022");
        assert!(cost.is_some());
        
        let expected_cost = (1000.0 * 0.003) + (500.0 * 0.015);
        assert_eq!(cost.unwrap(), expected_cost);
    }

    #[test]
    fn test_error_handling() {
        let config = ProviderConfig::anthropic("test-key");
        let provider = AnthropicProvider {
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