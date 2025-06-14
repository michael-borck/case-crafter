// Data models for AI provider abstraction layer

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Role of a message in a conversation
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    System,
    User,
    Assistant,
    Function,
}

impl std::fmt::Display for MessageRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MessageRole::System => write!(f, "system"),
            MessageRole::User => write!(f, "user"),
            MessageRole::Assistant => write!(f, "assistant"),
            MessageRole::Function => write!(f, "function"),
        }
    }
}

/// A chat message in a conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: MessageRole,
    pub content: String,
    pub name: Option<String>,
    pub function_call: Option<serde_json::Value>,
    pub timestamp: Option<DateTime<Utc>>,
}

impl ChatMessage {
    pub fn system(content: impl Into<String>) -> Self {
        Self {
            role: MessageRole::System,
            content: content.into(),
            name: None,
            function_call: None,
            timestamp: Some(Utc::now()),
        }
    }

    pub fn user(content: impl Into<String>) -> Self {
        Self {
            role: MessageRole::User,
            content: content.into(),
            name: None,
            function_call: None,
            timestamp: Some(Utc::now()),
        }
    }

    pub fn assistant(content: impl Into<String>) -> Self {
        Self {
            role: MessageRole::Assistant,
            content: content.into(),
            name: None,
            function_call: None,
            timestamp: Some(Utc::now()),
        }
    }

    pub fn with_name(mut self, name: impl Into<String>) -> Self {
        self.name = Some(name.into());
        self
    }
}

/// Generation parameters for fine-tuning AI responses
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationParams {
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
    pub top_p: Option<f32>,
    pub top_k: Option<u32>,
    pub frequency_penalty: Option<f32>,
    pub presence_penalty: Option<f32>,
    pub stop_sequences: Option<Vec<String>>,
    pub seed: Option<u64>,
}

impl Default for GenerationParams {
    fn default() -> Self {
        Self {
            temperature: Some(0.7),
            max_tokens: Some(2048),
            top_p: Some(0.9),
            top_k: None,
            frequency_penalty: Some(0.0),
            presence_penalty: Some(0.0),
            stop_sequences: None,
            seed: None,
        }
    }
}

/// Request for AI content generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationRequest {
    pub messages: Vec<ChatMessage>,
    pub model: String,
    pub params: GenerationParams,
    pub stream: bool,
    pub metadata: HashMap<String, serde_json::Value>,
}

impl GenerationRequest {
    pub fn new(messages: Vec<ChatMessage>, model: impl Into<String>) -> Self {
        Self {
            messages,
            model: model.into(),
            params: GenerationParams::default(),
            stream: false,
            metadata: HashMap::new(),
        }
    }

    pub fn with_params(mut self, params: GenerationParams) -> Self {
        self.params = params;
        self
    }

    pub fn with_streaming(mut self, stream: bool) -> Self {
        self.stream = stream;
        self
    }

    pub fn with_metadata(mut self, key: impl Into<String>, value: serde_json::Value) -> Self {
        self.metadata.insert(key.into(), value);
        self
    }
}

/// Token usage information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

impl TokenUsage {
    pub fn new(prompt_tokens: u32, completion_tokens: u32) -> Self {
        Self {
            prompt_tokens,
            completion_tokens,
            total_tokens: prompt_tokens + completion_tokens,
        }
    }
}

/// Response from AI content generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationResponse {
    pub content: String,
    pub model: String,
    pub usage: Option<TokenUsage>,
    pub finish_reason: Option<String>,
    pub response_time_ms: u64,
    pub metadata: HashMap<String, serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

impl GenerationResponse {
    pub fn new(content: impl Into<String>, model: impl Into<String>) -> Self {
        Self {
            content: content.into(),
            model: model.into(),
            usage: None,
            finish_reason: None,
            response_time_ms: 0,
            metadata: HashMap::new(),
            created_at: Utc::now(),
        }
    }

    pub fn with_usage(mut self, usage: TokenUsage) -> Self {
        self.usage = Some(usage);
        self
    }

    pub fn with_finish_reason(mut self, reason: impl Into<String>) -> Self {
        self.finish_reason = Some(reason.into());
        self
    }

    pub fn with_response_time(mut self, ms: u64) -> Self {
        self.response_time_ms = ms;
        self
    }
}

/// Streaming response chunk
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamResponse {
    pub delta: String,
    pub finished: bool,
    pub metadata: HashMap<String, serde_json::Value>,
}

impl StreamResponse {
    pub fn chunk(delta: impl Into<String>) -> Self {
        Self {
            delta: delta.into(),
            finished: false,
            metadata: HashMap::new(),
        }
    }

    pub fn finished() -> Self {
        Self {
            delta: String::new(),
            finished: true,
            metadata: HashMap::new(),
        }
    }

    pub fn with_metadata(mut self, key: impl Into<String>, value: serde_json::Value) -> Self {
        self.metadata.insert(key.into(), value);
        self
    }
}

/// Information about an AI model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub context_length: Option<u32>,
    pub max_output_tokens: Option<u32>,
    pub supports_streaming: bool,
    pub supports_functions: bool,
    pub cost_per_input_token: Option<f64>,
    pub cost_per_output_token: Option<f64>,
    pub created_at: Option<DateTime<Utc>>,
}

impl ModelInfo {
    pub fn new(id: impl Into<String>, name: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            name: name.into(),
            description: None,
            context_length: None,
            max_output_tokens: None,
            supports_streaming: false,
            supports_functions: false,
            cost_per_input_token: None,
            cost_per_output_token: None,
            created_at: Some(Utc::now()),
        }
    }

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
}

/// Provider capabilities and features
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderCapabilities {
    pub supports_streaming: bool,
    pub supports_functions: bool,
    pub supports_vision: bool,
    pub supports_fine_tuning: bool,
    pub max_context_length: Option<u32>,
    pub supported_formats: Vec<String>,
    pub rate_limits: Option<HashMap<String, u32>>,
}

impl Default for ProviderCapabilities {
    fn default() -> Self {
        Self {
            supports_streaming: false,
            supports_functions: false,
            supports_vision: false,
            supports_fine_tuning: false,
            max_context_length: None,
            supported_formats: vec!["text".to_string()],
            rate_limits: None,
        }
    }
}

/// Statistics for AI generation operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationStats {
    pub total_requests: u64,
    pub successful_requests: u64,
    pub failed_requests: u64,
    pub total_tokens_used: u64,
    pub total_cost: Option<f64>,
    pub average_response_time_ms: f64,
    pub last_request_time: Option<DateTime<Utc>>,
    pub provider_specific: HashMap<String, serde_json::Value>,
}

impl Default for GenerationStats {
    fn default() -> Self {
        Self {
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            total_tokens_used: 0,
            total_cost: None,
            average_response_time_ms: 0.0,
            last_request_time: None,
            provider_specific: HashMap::new(),
        }
    }
}

impl GenerationStats {
    pub fn success_rate(&self) -> f64 {
        if self.total_requests == 0 {
            0.0
        } else {
            self.successful_requests as f64 / self.total_requests as f64
        }
    }

    pub fn add_request(&mut self, success: bool, tokens: u32, response_time_ms: u64, cost: Option<f64>) {
        self.total_requests += 1;
        if success {
            self.successful_requests += 1;
        } else {
            self.failed_requests += 1;
        }
        self.total_tokens_used += tokens as u64;
        
        if let Some(cost) = cost {
            self.total_cost = Some(self.total_cost.unwrap_or(0.0) + cost);
        }

        // Update average response time
        let total_time = self.average_response_time_ms * (self.total_requests - 1) as f64;
        self.average_response_time_ms = (total_time + response_time_ms as f64) / self.total_requests as f64;
        
        self.last_request_time = Some(Utc::now());
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chat_message_creation() {
        let msg = ChatMessage::user("Hello").with_name("TestUser");
        assert_eq!(msg.role, MessageRole::User);
        assert_eq!(msg.content, "Hello");
        assert_eq!(msg.name, Some("TestUser".to_string()));
    }

    #[test]
    fn test_generation_request_builder() {
        let messages = vec![ChatMessage::user("Test message")];
        let request = GenerationRequest::new(messages.clone(), "gpt-4")
            .with_streaming(true)
            .with_metadata("key", serde_json::json!("value"));

        assert_eq!(request.model, "gpt-4");
        assert!(request.stream);
        assert_eq!(request.messages.len(), 1);
        assert!(request.metadata.contains_key("key"));
    }

    #[test]
    fn test_token_usage() {
        let usage = TokenUsage::new(100, 50);
        assert_eq!(usage.prompt_tokens, 100);
        assert_eq!(usage.completion_tokens, 50);
        assert_eq!(usage.total_tokens, 150);
    }

    #[test]
    fn test_generation_stats() {
        let mut stats = GenerationStats::default();
        stats.add_request(true, 100, 1500, Some(0.002));
        
        assert_eq!(stats.total_requests, 1);
        assert_eq!(stats.successful_requests, 1);
        assert_eq!(stats.total_tokens_used, 100);
        assert_eq!(stats.success_rate(), 1.0);
        assert_eq!(stats.average_response_time_ms, 1500.0);
    }

    #[test]
    fn test_model_info_builder() {
        let model = ModelInfo::new("gpt-4", "GPT-4")
            .with_context_length(8192)
            .with_streaming(true)
            .with_cost(0.03, 0.06);

        assert_eq!(model.id, "gpt-4");
        assert_eq!(model.context_length, Some(8192));
        assert!(model.supports_streaming);
        assert_eq!(model.cost_per_input_token, Some(0.03));
    }
}