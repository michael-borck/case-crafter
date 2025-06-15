// Tauri commands for AI provider abstraction layer

use crate::ai::{
    AIManager, AIConfig, ProviderConfig, ProviderType,
    GenerationRequest, GenerationResponse, GenerationStats,
    ModelInfo, PromptTemplate, RenderedPrompt,
    ModelConfig, ModelSelectionCriteria, ModelPerformancePriority, ModelUseCase,
    CaseStudyGenerationParams, GeneratedCaseStudy, DifficultyLevel, CompanySize,
    QuestionGenerationParams, GeneratedAssessment, QuestionType, QuestionDifficulty,
    providers::{get_supported_providers, is_provider_supported},
};
use crate::database::{
    PromptTemplateRepository, 
    models::{NewPromptTemplate, UpdatePromptTemplate, NewTemplateUsage}
};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, State};
use tokio::sync::RwLock;

type AIManagerState = Arc<RwLock<Option<AIManager>>>;
type TemplateRepositoryState = Arc<RwLock<Option<PromptTemplateRepository>>>;

/// Initialize AI manager state
pub fn setup_ai_state(app_handle: AppHandle, pool: sqlx::SqlitePool) -> AIManagerState {
    let manager = AIManager::new(app_handle, pool);
    
    // Initialize from database in the background
    let manager_clone = manager.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) = manager_clone.initialize_from_database().await {
            eprintln!("Warning: Failed to initialize AI manager from database: {}", e);
        } else {
            println!("AI manager initialized with saved configuration");
        }
    });
    
    Arc::new(RwLock::new(Some(manager)))
}

/// Initialize template repository state
pub fn setup_template_repository_state(pool: sqlx::SqlitePool) -> TemplateRepositoryState {
    Arc::new(RwLock::new(Some(PromptTemplateRepository::new(pool))))
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

/// Generate a case study using AI with enhanced parameters and validation
#[tauri::command]
pub async fn generate_case_study_enhanced(
    params: CaseStudyGenerationParams,
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<GeneratedCaseStudy, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        let generator = manager.create_case_study_generator();
        generator.generate_case_study(params).await.map_err(|e| e.to_string())
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Generate a case study using AI (legacy command for backward compatibility)
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
    // Convert to enhanced parameters
    let difficulty = match difficulty_level.to_lowercase().as_str() {
        "beginner" => DifficultyLevel::Beginner,
        "advanced" => DifficultyLevel::Advanced,
        _ => DifficultyLevel::Intermediate,
    };
    
    let company_size_enum = match company_size.as_deref().unwrap_or("medium").to_lowercase().as_str() {
        "startup" => CompanySize::Startup,
        "small" => CompanySize::Small,
        "large" => CompanySize::Large,
        "enterprise" => CompanySize::Enterprise,
        _ => CompanySize::Medium,
    };
    
    let objectives = if let Some(obj) = learning_objectives {
        obj.split(',').map(|s| s.trim().to_string()).collect()
    } else {
        vec!["Strategic analysis".to_string(), "Decision making".to_string(), "Problem solving".to_string()]
    };
    
    let params = CaseStudyGenerationParams {
        industry,
        difficulty_level: difficulty,
        duration_minutes: duration_minutes.unwrap_or(60),
        learning_objectives: objectives,
        company_size: company_size_enum,
        target_length: target_length.unwrap_or(800),
        additional_requirements: None,
        geographical_context: None,
        time_period: None,
        specific_focus_areas: vec![],
    };
    
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        let generator = manager.create_case_study_generator();
        match generator.generate_case_study(params).await {
            Ok(generated) => {
                // Convert to legacy response format
                Ok(GenerationResponse::new(generated.content, "enhanced_generator"))
            },
            Err(e) => Err(e.to_string())
        }
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Validate case study generation parameters
#[tauri::command]
pub async fn validate_case_study_params(
    params: CaseStudyGenerationParams,
) -> Result<Vec<String>, String> {
    let mut validation_errors = Vec::new();
    
    // Industry validation
    if params.industry.trim().is_empty() {
        validation_errors.push("Industry cannot be empty".to_string());
    }
    if params.industry.len() > 100 {
        validation_errors.push("Industry name too long (max 100 characters)".to_string());
    }

    // Duration validation
    if params.duration_minutes < 5 {
        validation_errors.push("Duration must be at least 5 minutes".to_string());
    }
    if params.duration_minutes > 480 {
        validation_errors.push("Duration cannot exceed 8 hours".to_string());
    }

    // Learning objectives validation
    if params.learning_objectives.is_empty() {
        validation_errors.push("At least one learning objective is required".to_string());
    }
    if params.learning_objectives.len() > 10 {
        validation_errors.push("Too many learning objectives (max 10)".to_string());
    }
    for objective in &params.learning_objectives {
        if objective.trim().is_empty() {
            validation_errors.push("Learning objectives cannot be empty".to_string());
            break;
        }
        if objective.len() > 200 {
            validation_errors.push("Learning objective too long (max 200 characters)".to_string());
            break;
        }
    }

    // Target length validation
    if params.target_length < 200 {
        validation_errors.push("Target length must be at least 200 words".to_string());
    }
    if params.target_length > 5000 {
        validation_errors.push("Target length cannot exceed 5000 words".to_string());
    }

    // Focus areas validation
    if params.specific_focus_areas.len() > 5 {
        validation_errors.push("Too many focus areas (max 5)".to_string());
    }
    
    Ok(validation_errors)
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

// Database Template Management Commands

/// Create a new prompt template in the database
#[tauri::command]
pub async fn create_database_template(
    template: NewPromptTemplate,
    template_repo_state: State<'_, TemplateRepositoryState>,
) -> Result<crate::database::models::PromptTemplate, String> {
    let repo_lock = template_repo_state.read().await;
    if let Some(repo) = repo_lock.as_ref() {
        repo.create(template).await.map_err(|e| e.to_string())
    } else {
        Err("Template repository not initialized".to_string())
    }
}

/// Get all active templates from database
#[tauri::command]
pub async fn get_database_templates(
    template_repo_state: State<'_, TemplateRepositoryState>,
) -> Result<Vec<crate::database::models::PromptTemplate>, String> {
    let repo_lock = template_repo_state.read().await;
    if let Some(repo) = repo_lock.as_ref() {
        repo.list_active().await.map_err(|e| e.to_string())
    } else {
        Err("Template repository not initialized".to_string())
    }
}

/// Get template by ID from database
#[tauri::command]
pub async fn get_database_template(
    template_id: String,
    template_repo_state: State<'_, TemplateRepositoryState>,
) -> Result<Option<crate::database::models::PromptTemplate>, String> {
    let repo_lock = template_repo_state.read().await;
    if let Some(repo) = repo_lock.as_ref() {
        repo.find_by_template_id(&template_id).await.map_err(|e| e.to_string())
    } else {
        Err("Template repository not initialized".to_string())
    }
}

/// Get templates by category from database
#[tauri::command]
pub async fn get_database_templates_by_category(
    category: String,
    template_repo_state: State<'_, TemplateRepositoryState>,
) -> Result<Vec<crate::database::models::PromptTemplate>, String> {
    let repo_lock = template_repo_state.read().await;
    if let Some(repo) = repo_lock.as_ref() {
        repo.list_by_category(&category).await.map_err(|e| e.to_string())
    } else {
        Err("Template repository not initialized".to_string())
    }
}

/// Search templates in database
#[tauri::command]
pub async fn search_database_templates(
    query: String,
    template_repo_state: State<'_, TemplateRepositoryState>,
) -> Result<Vec<crate::database::models::PromptTemplate>, String> {
    let repo_lock = template_repo_state.read().await;
    if let Some(repo) = repo_lock.as_ref() {
        repo.search(&query).await.map_err(|e| e.to_string())
    } else {
        Err("Template repository not initialized".to_string())
    }
}

/// Search templates by tags in database
#[tauri::command]
pub async fn search_database_templates_by_tags(
    tags: Vec<String>,
    template_repo_state: State<'_, TemplateRepositoryState>,
) -> Result<Vec<crate::database::models::PromptTemplate>, String> {
    let repo_lock = template_repo_state.read().await;
    if let Some(repo) = repo_lock.as_ref() {
        repo.search_by_tags(&tags).await.map_err(|e| e.to_string())
    } else {
        Err("Template repository not initialized".to_string())
    }
}

/// Update a template in database
#[tauri::command]
pub async fn update_database_template(
    template_id: String,
    update_data: UpdatePromptTemplate,
    template_repo_state: State<'_, TemplateRepositoryState>,
) -> Result<Option<crate::database::models::PromptTemplate>, String> {
    let repo_lock = template_repo_state.read().await;
    if let Some(repo) = repo_lock.as_ref() {
        repo.update(&template_id, update_data).await.map_err(|e| e.to_string())
    } else {
        Err("Template repository not initialized".to_string())
    }
}

/// Delete a template from database (soft delete)
#[tauri::command]
pub async fn delete_database_template(
    template_id: String,
    template_repo_state: State<'_, TemplateRepositoryState>,
) -> Result<bool, String> {
    let repo_lock = template_repo_state.read().await;
    if let Some(repo) = repo_lock.as_ref() {
        repo.delete(&template_id).await.map_err(|e| e.to_string())
    } else {
        Err("Template repository not initialized".to_string())
    }
}

/// Clone a template for a user
#[tauri::command]
pub async fn clone_database_template(
    template_id: String,
    user_id: i64,
    new_name: Option<String>,
    template_repo_state: State<'_, TemplateRepositoryState>,
) -> Result<crate::database::models::PromptTemplate, String> {
    let repo_lock = template_repo_state.read().await;
    if let Some(repo) = repo_lock.as_ref() {
        repo.clone_template(&template_id, user_id, new_name).await.map_err(|e| e.to_string())
    } else {
        Err("Template repository not initialized".to_string())
    }
}

/// Get template usage statistics
#[tauri::command]
pub async fn get_template_usage_stats(
    template_id: String,
    template_repo_state: State<'_, TemplateRepositoryState>,
) -> Result<HashMap<String, serde_json::Value>, String> {
    let repo_lock = template_repo_state.read().await;
    if let Some(repo) = repo_lock.as_ref() {
        repo.get_usage_stats(&template_id).await.map_err(|e| e.to_string())
    } else {
        Err("Template repository not initialized".to_string())
    }
}

/// Record template usage
#[tauri::command]
pub async fn record_template_usage(
    usage: NewTemplateUsage,
    template_repo_state: State<'_, TemplateRepositoryState>,
) -> Result<crate::database::models::TemplateUsage, String> {
    let repo_lock = template_repo_state.read().await;
    if let Some(repo) = repo_lock.as_ref() {
        repo.record_usage(usage).await.map_err(|e| e.to_string())
    } else {
        Err("Template repository not initialized".to_string())
    }
}

/// Get template categories from database
#[tauri::command]
pub async fn get_database_template_categories(
    template_repo_state: State<'_, TemplateRepositoryState>,
) -> Result<Vec<crate::database::models::TemplateCategory>, String> {
    let repo_lock = template_repo_state.read().await;
    if let Some(repo) = repo_lock.as_ref() {
        repo.get_categories().await.map_err(|e| e.to_string())
    } else {
        Err("Template repository not initialized".to_string())
    }
}

/// Create a new template category
#[tauri::command]
pub async fn create_template_category(
    category: crate::database::models::NewTemplateCategory,
    template_repo_state: State<'_, TemplateRepositoryState>,
) -> Result<crate::database::models::TemplateCategory, String> {
    let repo_lock = template_repo_state.read().await;
    if let Some(repo) = repo_lock.as_ref() {
        repo.create_category(category).await.map_err(|e| e.to_string())
    } else {
        Err("Template repository not initialized".to_string())
    }
}

/// Get popular templates
#[tauri::command]
pub async fn get_popular_templates(
    limit: i64,
    template_repo_state: State<'_, TemplateRepositoryState>,
) -> Result<Vec<(crate::database::models::PromptTemplate, i64)>, String> {
    let repo_lock = template_repo_state.read().await;
    if let Some(repo) = repo_lock.as_ref() {
        repo.get_popular_templates(limit).await.map_err(|e| e.to_string())
    } else {
        Err("Template repository not initialized".to_string())
    }
}

/// Get user's templates
#[tauri::command]
pub async fn get_user_templates(
    user_id: i64,
    template_repo_state: State<'_, TemplateRepositoryState>,
) -> Result<Vec<crate::database::models::PromptTemplate>, String> {
    let repo_lock = template_repo_state.read().await;
    if let Some(repo) = repo_lock.as_ref() {
        repo.list_by_user(user_id).await.map_err(|e| e.to_string())
    } else {
        Err("Template repository not initialized".to_string())
    }
}

// Dynamic Model Configuration Commands

/// Get all available model configurations
#[tauri::command]
pub async fn get_all_model_configs(
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<Vec<ModelConfig>, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        Ok(manager.get_all_model_configs().await)
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Get model configurations by provider
#[tauri::command]
pub async fn get_models_by_provider(
    provider_type: String,
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<Vec<ModelConfig>, String> {
    let provider: ProviderType = provider_type.parse()
        .map_err(|e| format!("Invalid provider type: {}", e))?;

    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        Ok(manager.get_models_by_provider(&provider).await)
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Select best model based on criteria
#[tauri::command]
pub async fn select_best_model(
    criteria: ModelSelectionCriteria,
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<ModelConfig, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.select_best_model(&criteria).await.map_err(|e| e.to_string())
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Get recommended models for a use case
#[tauri::command]
pub async fn get_recommended_models(
    use_case: ModelUseCase,
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<Vec<ModelConfig>, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        Ok(manager.get_recommended_models(&use_case).await)
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Validate generation parameters for a specific model
#[tauri::command]
pub async fn validate_model_parameters(
    model_id: String,
    params: crate::ai::models::GenerationParams,
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<bool, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        match manager.validate_model_parameters(&model_id, &params).await {
            Ok(()) => Ok(true),
            Err(_) => Ok(false),
        }
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Auto-adjust parameters to fit model constraints
#[tauri::command]
pub async fn adjust_model_parameters(
    model_id: String,
    params: crate::ai::models::GenerationParams,
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<crate::ai::models::GenerationParams, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.adjust_model_parameters(&model_id, &params).await.map_err(|e| e.to_string())
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Estimate cost for a generation request
#[tauri::command]
pub async fn estimate_generation_cost(
    model_id: String,
    input_tokens: u32,
    estimated_output_tokens: u32,
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<f64, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.estimate_generation_cost(&model_id, input_tokens, estimated_output_tokens).await.map_err(|e| e.to_string())
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Update model availability
#[tauri::command]
pub async fn update_model_availability(
    model_id: String,
    available: bool,
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<bool, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.update_model_availability(&model_id, available).await;
        Ok(true)
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Generate content with automatic model selection
#[tauri::command]
pub async fn generate_with_auto_model(
    request: GenerationRequest,
    criteria: ModelSelectionCriteria,
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<GenerationResponse, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.generate_with_auto_model(request, criteria).await.map_err(|e| e.to_string())
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Create model selection criteria
#[tauri::command]
pub async fn create_model_selection_criteria(
    provider_preference: Option<String>,
    max_cost_per_request: Option<f64>,
    min_context_length: Option<u32>,
    required_capabilities: Vec<String>,
    performance_priority: String,
    use_case: String,
) -> Result<ModelSelectionCriteria, String> {
    let provider_pref = if let Some(provider_str) = provider_preference {
        Some(provider_str.parse().map_err(|e| format!("Invalid provider: {}", e))?)
    } else {
        None
    };

    let priority: ModelPerformancePriority = match performance_priority.as_str() {
        "speed" => ModelPerformancePriority::Speed,
        "quality" => ModelPerformancePriority::Quality,
        "cost" => ModelPerformancePriority::Cost,
        "balanced" => ModelPerformancePriority::Balanced,
        _ => return Err("Invalid performance priority".to_string()),
    };

    let use_case_enum: ModelUseCase = match use_case.as_str() {
        "case_study_generation" => ModelUseCase::CaseStudyGeneration,
        "question_generation" => ModelUseCase::QuestionGeneration,
        "content_analysis" => ModelUseCase::ContentAnalysis,
        "summary_generation" => ModelUseCase::SummaryGeneration,
        "code_generation" => ModelUseCase::CodeGeneration,
        "general_chat" => ModelUseCase::GeneralChat,
        "creative_writing" => ModelUseCase::CreativeWriting,
        _ => return Err("Invalid use case".to_string()),
    };

    Ok(ModelSelectionCriteria {
        provider_preference: provider_pref,
        max_cost_per_request,
        min_context_length,
        required_capabilities,
        performance_priority: priority,
        use_case: use_case_enum,
    })
}

/// Get parameter constraints for a model
#[tauri::command]
pub async fn get_model_parameter_constraints(
    model_id: String,
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<Option<crate::ai::ParameterConstraints>, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        let config_manager = manager.get_model_config_manager().await;
        let config_manager = config_manager.read().await;
        Ok(config_manager.get_parameter_constraints(&model_id).cloned())
    } else {
        Err("AI manager not initialized".to_string())
    }
}

// Question Generation Commands

/// Generate assessment questions for a case study
#[tauri::command]
pub async fn generate_assessment_questions_enhanced(
    params: QuestionGenerationParams,
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<GeneratedAssessment, String> {
    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        let generator = manager.create_question_generator();
        generator.generate_assessment(params).await.map_err(|e| e.to_string())
    } else {
        Err("AI manager not initialized".to_string())
    }
}

/// Validate question generation parameters
#[tauri::command]
pub async fn validate_question_generation_params(
    params: QuestionGenerationParams,
) -> Result<Vec<String>, String> {
    let mut validation_errors = Vec::new();
    
    // Case study validation
    if params.case_study_title.trim().is_empty() {
        validation_errors.push("Case study title cannot be empty".to_string());
    }
    
    if params.case_study_content.trim().is_empty() {
        validation_errors.push("Case study content cannot be empty".to_string());
    }
    
    if params.case_study_content.len() < 200 {
        validation_errors.push("Case study content too short for meaningful questions".to_string());
    }
    
    // Question parameters validation
    if params.num_questions == 0 {
        validation_errors.push("Number of questions must be greater than 0".to_string());
    }
    
    if params.num_questions > 50 {
        validation_errors.push("Number of questions cannot exceed 50".to_string());
    }
    
    if params.question_types.is_empty() {
        validation_errors.push("At least one question type must be specified".to_string());
    }
    
    if params.max_points_per_question == 0 {
        validation_errors.push("Max points per question must be greater than 0".to_string());
    }
    
    if params.max_points_per_question > 100 {
        validation_errors.push("Max points per question cannot exceed 100".to_string());
    }
    
    if params.learning_objectives.is_empty() {
        validation_errors.push("At least one learning objective must be provided".to_string());
    }
    
    // Duration validation
    if let Some(duration) = params.target_duration_minutes {
        if duration < 5 {
            validation_errors.push("Target duration must be at least 5 minutes".to_string());
        }
        if duration > 480 {
            validation_errors.push("Target duration cannot exceed 8 hours".to_string());
        }
    }
    
    Ok(validation_errors)
}

/// Create default question generation parameters
#[tauri::command]
pub async fn create_default_question_params() -> Result<QuestionGenerationParams, String> {
    Ok(QuestionGenerationParams::default())
}

/// Get available question types
#[tauri::command]
pub async fn get_question_types() -> Result<Vec<String>, String> {
    Ok(vec![
        "multiple_choice".to_string(),
        "short_answer".to_string(),
        "essay".to_string(),
        "true_false".to_string(),
        "case_analysis".to_string(),
        "calculation".to_string(),
        "scenario".to_string(),
    ])
}

/// Get available question difficulty levels
#[tauri::command]
pub async fn get_question_difficulty_levels() -> Result<Vec<String>, String> {
    Ok(vec![
        "basic".to_string(),
        "intermediate".to_string(),
        "advanced".to_string(),
        "mixed".to_string(),
    ])
}

/// Generate questions based on case study (legacy command for backward compatibility)
#[tauri::command]
pub async fn generate_questions_from_case_study(
    case_study_title: String,
    case_study_content: String,
    learning_objectives: Vec<String>,
    num_questions: Option<u32>,
    question_types: Option<Vec<String>>,
    difficulty_level: Option<String>,
    ai_manager_state: State<'_, AIManagerState>,
) -> Result<GenerationResponse, String> {
    // Convert parameters to enhanced format
    let question_type_enums: Vec<QuestionType> = question_types
        .unwrap_or_else(|| vec!["multiple_choice".to_string(), "short_answer".to_string()])
        .into_iter()
        .filter_map(|t| match t.as_str() {
            "multiple_choice" => Some(QuestionType::MultipleChoice),
            "short_answer" => Some(QuestionType::ShortAnswer),
            "essay" => Some(QuestionType::Essay),
            "true_false" => Some(QuestionType::TrueFalse),
            "case_analysis" => Some(QuestionType::CaseAnalysis),
            "calculation" => Some(QuestionType::Calculation),
            "scenario" => Some(QuestionType::Scenario),
            _ => None,
        })
        .collect();

    let difficulty = match difficulty_level.as_deref().unwrap_or("intermediate") {
        "basic" => QuestionDifficulty::Basic,
        "advanced" => QuestionDifficulty::Advanced,
        "mixed" => QuestionDifficulty::Mixed,
        _ => QuestionDifficulty::Intermediate,
    };

    let params = QuestionGenerationParams {
        case_study_title,
        case_study_content,
        case_study_summary: None,
        learning_objectives,
        question_types: question_type_enums,
        difficulty_level: difficulty,
        num_questions: num_questions.unwrap_or(5),
        max_points_per_question: 10,
        include_rubric: false,
        target_duration_minutes: None,
        focus_areas: vec![],
    };

    let manager_lock = ai_manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        let generator = manager.create_question_generator();
        match generator.generate_assessment(params).await {
            Ok(assessment) => {
                // Convert to legacy response format
                let content = format!(
                    "Assessment: {}\n\nInstructions:\n{}\n\nQuestions:\n{}",
                    assessment.title,
                    assessment.instructions,
                    assessment.questions.iter()
                        .enumerate()
                        .map(|(i, q)| format!("{}. {}", i + 1, q.question_text))
                        .collect::<Vec<_>>()
                        .join("\n\n")
                );
                Ok(GenerationResponse::new(content, "question_generator"))
            },
            Err(e) => Err(e.to_string())
        }
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