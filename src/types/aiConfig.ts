// TypeScript interfaces for AI configuration system

export interface ModelConfig {
  id: string;
  name: string;
  provider: ProviderType;
  description?: string;
  context_length?: number;
  input_cost_per_1k?: number;
  output_cost_per_1k?: number;
  capabilities: ModelCapabilities;
  default_params: GenerationParams;
  param_constraints: ParameterConstraints;
  is_available: boolean;
  is_recommended: boolean;
}

export interface ModelCapabilities {
  supports_streaming: boolean;
  supports_function_calling: boolean;
  supports_vision: boolean;
  supports_system_prompt: boolean;
  max_output_tokens?: number;
  supported_formats: string[];
}

export interface GenerationParams {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop_sequences?: string[];
  seed?: number;
}

export interface ParameterConstraints {
  temperature?: ParameterRange<number>;
  max_tokens?: ParameterRange<number>;
  top_p?: ParameterRange<number>;
  top_k?: ParameterRange<number>;
  frequency_penalty?: ParameterRange<number>;
  presence_penalty?: ParameterRange<number>;
  allowed_stop_sequences?: string[];
}

export interface ParameterRange<T> {
  min: T;
  max: T;
  default: T;
  step?: T;
}

export interface ModelSelectionCriteria {
  provider_preference?: ProviderType;
  max_cost_per_request?: number;
  min_context_length?: number;
  required_capabilities: string[];
  performance_priority: ModelPerformancePriority;
  use_case: ModelUseCase;
}

export type ProviderType = 'openai' | 'anthropic' | 'ollama';

export type ModelPerformancePriority = 'speed' | 'quality' | 'cost' | 'balanced';

export type ModelUseCase = 
  | 'case_study_generation'
  | 'question_generation'
  | 'content_analysis'
  | 'summary_generation'
  | 'code_generation'
  | 'general_chat'
  | 'creative_writing';

export interface AIConfig {
  default_provider: ProviderType;
  providers: Record<ProviderType, ProviderConfig>;
  generation_params: GenerationParams;
  retry_config: RetryConfig;
  timeout_seconds: number;
  enable_logging: boolean;
  cost_tracking_enabled: boolean;
}

export interface ProviderConfig {
  provider_type: ProviderType;
  api_key?: string;
  api_base_url?: string;
  organization_id?: string;
  default_model: string;
  models: string[];
  custom_headers: Record<string, string>;
  rate_limit_per_minute?: number;
  max_concurrent_requests?: number;
  enabled: boolean;
}

export interface RetryConfig {
  max_retries: number;
  base_delay_ms: number;
  max_delay_ms: number;
  backoff_multiplier: number;
  retry_on_timeout: boolean;
  retry_on_rate_limit: boolean;
}

export interface GenerationRequest {
  messages: ChatMessage[];
  model: string;
  params: GenerationParams;
  stream: boolean;
  metadata: Record<string, any>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: any;
  timestamp?: string;
}

export interface GenerationResponse {
  content: string;
  model: string;
  usage?: TokenUsage;
  finish_reason?: string;
  response_time_ms: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface GenerationStats {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  total_tokens_used: number;
  total_cost?: number;
  average_response_time_ms: number;
  last_request_time?: string;
  provider_specific: Record<string, any>;
}