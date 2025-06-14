// Tauri commands for AI provider abstraction layer

use crate::ai::{
    AIManager, AIConfig, ProviderConfig, ProviderType,
    GenerationRequest, GenerationResponse, GenerationStats,
    ModelInfo, PromptTemplate, RenderedPrompt,
    providers::{get_supported_providers, is_provider_supported},
};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, State};
use tokio::sync::RwLock;

type AIManagerState = Arc<RwLock<Option<AIManager>>>;

/// Initialize AI manager state
pub fn setup_ai_state(app_handle: AppHandle) -> AIManagerState {
    Arc::new(RwLock::new(Some(AIManager::new(app_handle))))
}

/// Initialize AI system with configuration
#[tauri::command]
pub async fn initialize_ai(
    config: AIConfig,
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<bool, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.initialize(config).await.map_err(|e| e.to_string())?;
        Ok(true)
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Get current AI configuration
#[tauri::command]
pub async fn get_ai_config(
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<AIConfig, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        Ok(manager.get_config().await)
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Update AI configuration
#[tauri::command]
pub async fn update_ai_config(
    config: AIConfig,
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<bool, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.update_config(config).await.map_err(|e| e.to_string())?;
        Ok(true)
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Switch to a different AI provider
#[tauri::command]
pub async fn switch_ai_provider(
    provider_type: String,
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<bool, String> {
    let provider: ProviderType = provider_type.parse()
        .map_err(|e| format!("Invalid provider type: {}", e))?;

    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.switch_provider(&provider).await.map_err(|e| e.to_string())?;
        Ok(true)
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Generate content using AI
#[tauri::command]
pub async fn generate_content(
    request: GenerationRequest,
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<GenerationResponse, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.generate(request).await.map_err(|e| e.to_string())
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Get available models for current provider
#[tauri::command]
pub async fn get_available_models(
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<Vec<ModelInfo>, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.get_available_models().await.map_err(|e| e.to_string())
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Validate AI provider configuration
#[tauri::command]
pub async fn validate_ai_provider(
    provider_type: String,
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<bool, String> {
    let provider: ProviderType = provider_type.parse()
        .map_err(|e| format!("Invalid provider type: {}", e))?;

    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.validate_provider(&provider).await.map_err(|e| e.to_string())
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Get AI generation statistics
#[tauri::command]
pub async fn get_ai_stats(
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<GenerationStats, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.get_stats().await.map_err(|e| e.to_string())
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Get list of supported AI providers
#[tauri::command]
pub async fn get_supported_ai_providers() -> Result<Vec<String>, String> {
    Ok(get_supported_providers().into_iter().map(|p| p.to_string()).collect())
}

/// Check if a provider is supported
#[tauri::command]
pub async fn is_ai_provider_supported(provider_type: String) -> Result<bool, String> {
    let provider: ProviderType = provider_type.parse()
        .map_err(|e| format!("Invalid provider type: {}", e))?;
    Ok(is_provider_supported(&provider))
}

/// Create default AI configuration
#[tauri::command]
pub async fn create_default_ai_config() -> Result<AIConfig, String> {
    Ok(AIConfig::default())
}

/// Create OpenAI provider configuration
#[tauri::command]
pub async fn create_openai_config(api_key: String) -> Result<ProviderConfig, String> {
    Ok(ProviderConfig::openai(api_key))
}

/// Create Anthropic provider configuration
#[tauri::command]
pub async fn create_anthropic_config(api_key: String) -> Result<ProviderConfig, String> {
    Ok(ProviderConfig::anthropic(api_key))
}

/// Create Ollama provider configuration
#[tauri::command]
pub async fn create_ollama_config(base_url: Option<String>) -> Result<ProviderConfig, String> {
    let url = base_url.unwrap_or_else(|| "http://localhost:11434".to_string());
    Ok(ProviderConfig::ollama(url))
}

// Prompt Template Commands

/// Get all prompt templates
#[tauri::command]
pub async fn get_prompt_templates(
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<Vec<PromptTemplate>, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        let prompt_manager = manager.get_prompt_manager();
        Ok(prompt_manager.list_templates().into_iter().cloned().collect())
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Get prompt template by ID
#[tauri::command]
pub async fn get_prompt_template(
    template_id: String,
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<Option<PromptTemplate>, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        let prompt_manager = manager.get_prompt_manager();
        Ok(prompt_manager.get_template(&template_id).cloned())
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Get prompt templates by category
#[tauri::command]
pub async fn get_prompt_templates_by_category(
    category: String,
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<Vec<PromptTemplate>, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        let prompt_manager = manager.get_prompt_manager();
        Ok(prompt_manager.list_templates_by_category(&category).into_iter().cloned().collect())
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Search prompt templates by tags
#[tauri::command]
pub async fn search_prompt_templates_by_tags(
    tags: Vec<String>,
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<Vec<PromptTemplate>, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        let prompt_manager = manager.get_prompt_manager();
        Ok(prompt_manager.search_templates_by_tags(&tags).into_iter().cloned().collect())
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Render a prompt template with variables
#[tauri::command]
pub async fn render_prompt_template(
    template_id: String,
    variables: HashMap<String, serde_json::Value>,
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<RenderedPrompt, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        let prompt_manager = manager.get_prompt_manager();
        prompt_manager.render_template(&template_id, &variables).map_err(|e| e.to_string())
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Get prompt template categories
#[tauri::command]
pub async fn get_prompt_categories(
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<Vec<String>, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        let prompt_manager = manager.get_prompt_manager();
        Ok(prompt_manager.get_categories())
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Export prompt templates to JSON
#[tauri::command]
pub async fn export_prompt_templates(
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<String, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        let prompt_manager = manager.get_prompt_manager();
        prompt_manager.export_templates().map_err(|e| e.to_string())
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Load default prompt templates
#[tauri::command]
pub async fn load_default_prompt_templates(
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<bool, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(_manager) = manager_lock.as_ref() {
        // Note: Default templates are loaded during AI manager initialization
        // This command confirms that the system is ready
        Ok(true)
    } else {
        Err("AI manager not initialized".to_string())
    }
}

// Case Study Generation Commands

/// Generate a case study using AI
#[tauri::command]
pub async fn generate_case_study(
    industry: String,
    difficulty_level: String,
    duration_minutes: Option<u32>,
    learning_objectives: Option<String>,
    company_size: Option<String>,
    target_length: Option<u32>,
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<GenerationResponse, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        let prompt_manager = manager.get_prompt_manager();
        
        // Prepare template variables
        let mut variables = HashMap::new();
        variables.insert("industry".to_string(), serde_json::json!(industry));
        variables.insert("difficulty_level".to_string(), serde_json::json!(difficulty_level));
        variables.insert("duration_minutes".to_string(), serde_json::json!(duration_minutes.unwrap_or(60)));
        variables.insert("learning_objectives".to_string(), serde_json::json!(learning_objectives.unwrap_or_else(|| "Strategic analysis, Decision making, Problem solving".to_string())));
        variables.insert("company_size".to_string(), serde_json::json!(company_size.unwrap_or_else(|| "medium".to_string())));
        variables.insert("target_length".to_string(), serde_json::json!(target_length.unwrap_or(800)));

        // Render the template
        let rendered = prompt_manager.render_template("case_study_generation", &variables)
            .map_err(|e| e.to_string())?;

        // Create generation request
        let mut messages = Vec::new();
        if let Some(system) = rendered.system_prompt {
            messages.push(crate::ai::models::ChatMessage::system(system));
        }
        messages.push(crate::ai::models::ChatMessage::user(rendered.user_prompt));

        let config = manager.get_config().await;
        let request = GenerationRequest::new(messages, config.providers.get(&config.default_provider).unwrap().default_model.clone());

        manager.generate(request).await.map_err(|e| e.to_string())
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Generate assessment questions using AI
#[tauri::command]
pub async fn generate_assessment_questions(
    case_study_title: String,
    case_study_summary: String,
    num_questions: Option<u32>,
    difficulty_level: Option<String>,
    question_types: Option<String>,
    learning_objectives: Option<String>,
    max_points: Option<u32>,
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<GenerationResponse, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        let prompt_manager = manager.get_prompt_manager();
        
        // Prepare template variables
        let mut variables = HashMap::new();
        variables.insert("case_study_title".to_string(), serde_json::json!(case_study_title));
        variables.insert("case_study_summary".to_string(), serde_json::json!(case_study_summary));
        variables.insert("num_questions".to_string(), serde_json::json!(num_questions.unwrap_or(3)));
        variables.insert("difficulty_level".to_string(), serde_json::json!(difficulty_level.unwrap_or_else(|| "intermediate".to_string())));
        variables.insert("question_types".to_string(), serde_json::json!(question_types.unwrap_or_else(|| "mix of multiple_choice, short_answer, and essay".to_string())));
        variables.insert("learning_objectives".to_string(), serde_json::json!(learning_objectives.unwrap_or_else(|| "Critical thinking, Problem solving, Decision making".to_string())));
        variables.insert("max_points".to_string(), serde_json::json!(max_points.unwrap_or(10)));

        // Render the template
        let rendered = prompt_manager.render_template("assessment_questions", &variables)
            .map_err(|e| e.to_string())?;

        // Create generation request
        let mut messages = Vec::new();
        if let Some(system) = rendered.system_prompt {
            messages.push(crate::ai::models::ChatMessage::system(system));
        }
        messages.push(crate::ai::models::ChatMessage::user(rendered.user_prompt));

        let config = manager.get_config().await;
        let request = GenerationRequest::new(messages, config.providers.get(&config.default_provider).unwrap().default_model.clone());

        manager.generate(request).await.map_err(|e| e.to_string())
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Test AI connection and functionality
#[tauri::command]
pub async fn test_ai_connection(
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<HashMap<String, serde_json::Value>, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        let mut results = HashMap::new();

        // Test basic generation
        let test_messages = vec![
            crate::ai::models::ChatMessage::user("Say 'Hello, World!' and nothing else.")
        ];
        
        let config = manager.get_config().await;
        let default_provider = &config.default_provider;
        let default_model = &config.providers.get(default_provider).unwrap().default_model;
        
        let request = GenerationRequest::new(test_messages, default_model.clone());
        
        match manager.generate(request).await {
            Ok(response) => {
                results.insert("generation_test".to_string(), serde_json::json!({
                    "success": true,
                    "response_length": response.content.len(),
                    "model": response.model,
                    "response_time_ms": response.response_time_ms
                }));
            }
            Err(e) => {
                results.insert("generation_test".to_string(), serde_json::json!({
                    "success": false,
                    "error": e.to_string()
                }));
            }
        }

        // Test model listing
        match manager.get_available_models().await {
            Ok(models) => {
                results.insert("models_test".to_string(), serde_json::json!({
                    "success": true,
                    "model_count": models.len(),
                    "models": models.iter().map(|m| &m.id).collect::<Vec<_>>()
                }));
            }
            Err(e) => {
                results.insert("models_test".to_string(), serde_json::json!({
                    "success": false,
                    "error": e.to_string()
                }));
            }
        }

        // Test provider validation
        match manager.validate_provider(default_provider).await {
            Ok(valid) => {
                results.insert("validation_test".to_string(), serde_json::json!({
                    "success": true,
                    "provider_valid": valid
                }));
            }
            Err(e) => {
                results.insert("validation_test".to_string(), serde_json::json!({
                    "success": false,
                    "error": e.to_string()
                }));
            }
        }

        // Test statistics
        match manager.get_stats().await {
            Ok(stats) => {
                results.insert("stats_test".to_string(), serde_json::json!({
                    "success": true,
                    "total_requests": stats.total_requests,
                    "success_rate": stats.success_rate()
                }));
            }
            Err(e) => {
                results.insert("stats_test".to_string(), serde_json::json!({
                    "success": false,
                    "error": e.to_string()
                }));
            }
        }

        Ok(results)
    } else {
        Err("AI manager not initialized".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_provider_config_creation() {
        let openai_config = create_openai_config("test-key".to_string()).await.unwrap();
        assert_eq!(openai_config.provider_type, ProviderType::OpenAI);
        assert_eq!(openai_config.api_key, Some("test-key".to_string()));

        let anthropic_config = create_anthropic_config("test-key".to_string()).await.unwrap();
        assert_eq!(anthropic_config.provider_type, ProviderType::Anthropic);

        let ollama_config = create_ollama_config(None).await.unwrap();
        assert_eq!(ollama_config.provider_type, ProviderType::Ollama);
        assert_eq!(ollama_config.api_base_url, Some("http://localhost:11434".to_string()));
    }

    #[tokio::test]
    async fn test_supported_providers() {
        let providers = get_supported_ai_providers().await.unwrap();
        assert!(providers.contains(&"openai".to_string()));
        assert!(providers.contains(&"anthropic".to_string()));
        assert!(providers.contains(&"ollama".to_string()));
    }

    #[tokio::test]
    async fn test_provider_support_check() {
        assert!(is_ai_provider_supported("openai".to_string()).await.unwrap());
        assert!(is_ai_provider_supported("anthropic".to_string()).await.unwrap());
        assert!(is_ai_provider_supported("ollama".to_string()).await.unwrap());
        assert!(!is_ai_provider_supported("invalid".to_string()).await.unwrap_or(true));
    }

    #[tokio::test] 
    async fn test_default_config_creation() {
        let config = create_default_ai_config().await.unwrap();
        assert_eq!(config.default_provider, ProviderType::Ollama);
        assert!(!config.providers.is_empty());
    }
}