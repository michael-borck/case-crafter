// Case study generation workflow with parameter validation and error handling

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::ai::{AIManager, GenerationRequest, models::ChatMessage};
use crate::ai::errors::{AIError, Result};

/// Parameters for case study generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaseStudyGenerationParams {
    pub industry: String,
    pub difficulty_level: DifficultyLevel,
    pub duration_minutes: u32,
    pub learning_objectives: Vec<String>,
    pub company_size: CompanySize,
    pub target_length: u32,
    pub additional_requirements: Option<String>,
    pub geographical_context: Option<String>,
    pub time_period: Option<String>,
    pub specific_focus_areas: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DifficultyLevel {
    Beginner,
    Intermediate,
    Advanced,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CompanySize {
    Startup,
    Small,
    Medium,
    Large,
    Enterprise,
}

/// Generated case study with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedCaseStudy {
    pub title: String,
    pub content: String,
    pub summary: String,
    pub key_learning_points: Vec<String>,
    pub suggested_analysis_framework: Option<String>,
    pub metadata: CaseStudyMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaseStudyMetadata {
    pub word_count: u32,
    pub estimated_reading_time: u32,
    pub complexity_score: f32,
    pub primary_business_functions: Vec<String>,
    pub key_stakeholders: Vec<String>,
    pub decision_points: Vec<String>,
}

/// Case study generation service
pub struct CaseStudyGenerator {
    ai_manager: AIManager,
}

impl CaseStudyGenerator {
    pub fn new(ai_manager: AIManager) -> Self {
        Self { ai_manager }
    }

    /// Generate a complete case study with validation
    pub async fn generate_case_study(&self, params: CaseStudyGenerationParams) -> Result<GeneratedCaseStudy> {
        // Validate parameters
        self.validate_parameters(&params)?;
        
        // Generate the main case study content
        let content = self.generate_content(&params).await?;
        
        // Extract metadata from the generated content
        let metadata = self.extract_metadata(&content, &params);
        
        // Generate additional components
        let title = self.extract_title(&content);
        let summary = self.generate_summary(&content).await?;
        let learning_points = self.extract_learning_points(&content, &params);
        let analysis_framework = self.suggest_analysis_framework(&params).await?;
        
        Ok(GeneratedCaseStudy {
            title,
            content,
            summary,
            key_learning_points: learning_points,
            suggested_analysis_framework: Some(analysis_framework),
            metadata,
        })
    }

    /// Validate generation parameters
    fn validate_parameters(&self, params: &CaseStudyGenerationParams) -> Result<()> {
        // Industry validation
        if params.industry.trim().is_empty() {
            return Err(AIError::ValidationError("Industry cannot be empty".to_string()));
        }
        if params.industry.len() > 100 {
            return Err(AIError::ValidationError("Industry name too long (max 100 characters)".to_string()));
        }

        // Duration validation
        if params.duration_minutes < 5 {
            return Err(AIError::ValidationError("Duration must be at least 5 minutes".to_string()));
        }
        if params.duration_minutes > 480 {
            return Err(AIError::ValidationError("Duration cannot exceed 8 hours".to_string()));
        }

        // Learning objectives validation
        if params.learning_objectives.is_empty() {
            return Err(AIError::ValidationError("At least one learning objective is required".to_string()));
        }
        if params.learning_objectives.len() > 10 {
            return Err(AIError::ValidationError("Too many learning objectives (max 10)".to_string()));
        }
        for objective in &params.learning_objectives {
            if objective.trim().is_empty() {
                return Err(AIError::ValidationError("Learning objectives cannot be empty".to_string()));
            }
            if objective.len() > 200 {
                return Err(AIError::ValidationError("Learning objective too long (max 200 characters)".to_string()));
            }
        }

        // Target length validation
        if params.target_length < 200 {
            return Err(AIError::ValidationError("Target length must be at least 200 words".to_string()));
        }
        if params.target_length > 5000 {
            return Err(AIError::ValidationError("Target length cannot exceed 5000 words".to_string()));
        }

        // Focus areas validation
        if params.specific_focus_areas.len() > 5 {
            return Err(AIError::ValidationError("Too many focus areas (max 5)".to_string()));
        }

        Ok(())
    }

    /// Generate the main case study content
    async fn generate_content(&self, params: &CaseStudyGenerationParams) -> Result<String> {
        let prompt_manager = self.ai_manager.get_prompt_manager();
        
        // Prepare template variables
        let mut variables = HashMap::new();
        variables.insert("industry".to_string(), serde_json::json!(params.industry));
        variables.insert("difficulty_level".to_string(), serde_json::json!(params.difficulty_level));
        variables.insert("duration_minutes".to_string(), serde_json::json!(params.duration_minutes));
        variables.insert("learning_objectives".to_string(), serde_json::json!(params.learning_objectives.join(", ")));
        variables.insert("company_size".to_string(), serde_json::json!(params.company_size));
        variables.insert("target_length".to_string(), serde_json::json!(params.target_length));
        
        if let Some(ref requirements) = params.additional_requirements {
            variables.insert("additional_requirements".to_string(), serde_json::json!(requirements));
        }
        
        if let Some(ref context) = params.geographical_context {
            variables.insert("geographical_context".to_string(), serde_json::json!(context));
        }
        
        if let Some(ref period) = params.time_period {
            variables.insert("time_period".to_string(), serde_json::json!(period));
        }
        
        if !params.specific_focus_areas.is_empty() {
            variables.insert("focus_areas".to_string(), serde_json::json!(params.specific_focus_areas.join(", ")));
        }

        // Render the template
        let rendered = prompt_manager.render_template("case_study_generation", &variables)?;

        // Create generation request
        let mut messages = Vec::new();
        if let Some(system) = rendered.system_prompt {
            messages.push(ChatMessage::system(system));
        }
        messages.push(ChatMessage::user(rendered.user_prompt));

        let config = self.ai_manager.get_config().await;
        let default_provider = &config.default_provider;
        let provider_config = config.providers.get(default_provider)
            .ok_or_else(|| AIError::ConfigurationError("Default provider not configured".to_string()))?;
        
        let request = GenerationRequest::new(messages, provider_config.default_model.clone());

        let response = self.ai_manager.generate(request).await?;
        Ok(response.content)
    }

    /// Generate a summary of the case study
    async fn generate_summary(&self, content: &str) -> Result<String> {
        let prompt = format!(
            "Please create a concise 2-3 sentence summary of this case study that captures the main business challenge and context:\n\n{}",
            content
        );

        let messages = vec![ChatMessage::user(prompt)];
        let config = self.ai_manager.get_config().await;
        let default_provider = &config.default_provider;
        let provider_config = config.providers.get(default_provider)
            .ok_or_else(|| AIError::ConfigurationError("Default provider not configured".to_string()))?;
        
        let request = GenerationRequest::new(messages, provider_config.default_model.clone());
        let response = self.ai_manager.generate(request).await?;
        Ok(response.content)
    }

    /// Suggest an analysis framework for the case study
    async fn suggest_analysis_framework(&self, params: &CaseStudyGenerationParams) -> Result<String> {
        let prompt = format!(
            "Based on a {} difficulty case study in the {} industry with focus on {}, suggest an appropriate business analysis framework (e.g., SWOT, Porter's Five Forces, Value Chain Analysis, etc.) and briefly explain why it's suitable.",
            serde_json::to_string(&params.difficulty_level).unwrap_or_default().trim_matches('"'),
            params.industry,
            params.learning_objectives.join(", ")
        );

        let messages = vec![ChatMessage::user(prompt)];
        let config = self.ai_manager.get_config().await;
        let default_provider = &config.default_provider;
        let provider_config = config.providers.get(default_provider)
            .ok_or_else(|| AIError::ConfigurationError("Default provider not configured".to_string()))?;
        
        let request = GenerationRequest::new(messages, provider_config.default_model.clone());
        let response = self.ai_manager.generate(request).await?;
        Ok(response.content)
    }

    /// Extract title from content (looks for first heading or generates one)
    fn extract_title(&self, content: &str) -> String {
        // Look for markdown heading
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("# ") {
                return trimmed[2..].trim().to_string();
            }
            if trimmed.starts_with("**") && trimmed.ends_with("**") && trimmed.len() < 100 {
                return trimmed[2..trimmed.len()-2].trim().to_string();
            }
        }
        
        // Extract first sentence as fallback
        let first_sentence = content
            .split(". ")
            .next()
            .unwrap_or("Business Case Study")
            .trim()
            .to_string();
            
        if first_sentence.len() > 80 {
            format!("{}...", &first_sentence[..77])
        } else {
            first_sentence
        }
    }

    /// Extract key learning points based on parameters and content
    fn extract_learning_points(&self, content: &str, params: &CaseStudyGenerationParams) -> Vec<String> {
        let mut points = params.learning_objectives.clone();
        
        // Add some derived learning points based on content analysis
        if content.to_lowercase().contains("financial") || content.to_lowercase().contains("revenue") {
            points.push("Financial analysis and interpretation".to_string());
        }
        
        if content.to_lowercase().contains("market") || content.to_lowercase().contains("competition") {
            points.push("Market dynamics and competitive analysis".to_string());
        }
        
        if content.to_lowercase().contains("leadership") || content.to_lowercase().contains("management") {
            points.push("Leadership and management decision-making".to_string());
        }
        
        // Remove duplicates and limit to reasonable number
        points.sort();
        points.dedup();
        points.truncate(8);
        
        points
    }

    /// Extract metadata from the generated content
    fn extract_metadata(&self, content: &str, params: &CaseStudyGenerationParams) -> CaseStudyMetadata {
        let word_count = content.split_whitespace().count() as u32;
        let estimated_reading_time = (word_count / 200).max(1); // Assuming 200 words per minute
        
        // Simple complexity scoring based on length, difficulty, and content
        let complexity_score = match params.difficulty_level {
            DifficultyLevel::Beginner => 1.0,
            DifficultyLevel::Intermediate => 2.0,
            DifficultyLevel::Advanced => 3.0,
        } + (word_count as f32 / 1000.0).min(2.0);

        // Extract business functions mentioned in content
        let business_functions = self.extract_business_functions(content);
        
        // Extract stakeholders
        let stakeholders = self.extract_stakeholders(content);
        
        // Extract decision points
        let decision_points = self.extract_decision_points(content);

        CaseStudyMetadata {
            word_count,
            estimated_reading_time,
            complexity_score,
            primary_business_functions: business_functions,
            key_stakeholders: stakeholders,
            decision_points,
        }
    }

    fn extract_business_functions(&self, content: &str) -> Vec<String> {
        let functions = vec![
            "Marketing", "Sales", "Finance", "Operations", "Human Resources", 
            "Strategy", "Technology", "Supply Chain", "Customer Service", "Legal"
        ];
        
        functions.into_iter()
            .filter(|&func| content.to_lowercase().contains(&func.to_lowercase()))
            .map(|s| s.to_string())
            .collect()
    }

    fn extract_stakeholders(&self, content: &str) -> Vec<String> {
        let stakeholder_keywords = vec![
            "CEO", "CFO", "CTO", "Manager", "Director", "Customer", "Employee", 
            "Shareholder", "Investor", "Supplier", "Partner", "Regulator"
        ];
        
        stakeholder_keywords.into_iter()
            .filter(|&stakeholder| content.to_lowercase().contains(&stakeholder.to_lowercase()))
            .map(|s| s.to_string())
            .collect()
    }

    fn extract_decision_points(&self, content: &str) -> Vec<String> {
        let mut decision_points = Vec::new();
        
        // Look for question marks or decision-related keywords
        let lines: Vec<&str> = content.lines().collect();
        for line in lines {
            if line.contains('?') || 
               line.to_lowercase().contains("decision") ||
               line.to_lowercase().contains("should") ||
               line.to_lowercase().contains("option") {
                let cleaned = line.trim().to_string();
                if cleaned.len() > 10 && cleaned.len() < 200 {
                    decision_points.push(cleaned);
                }
            }
        }
        
        decision_points.truncate(5);
        decision_points
    }
}

impl Default for CaseStudyGenerationParams {
    fn default() -> Self {
        Self {
            industry: "Technology".to_string(),
            difficulty_level: DifficultyLevel::Intermediate,
            duration_minutes: 60,
            learning_objectives: vec!["Strategic analysis".to_string(), "Decision making".to_string()],
            company_size: CompanySize::Medium,
            target_length: 800,
            additional_requirements: None,
            geographical_context: None,
            time_period: None,
            specific_focus_areas: vec![],
        }
    }
}

impl std::fmt::Display for DifficultyLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DifficultyLevel::Beginner => write!(f, "beginner"),
            DifficultyLevel::Intermediate => write!(f, "intermediate"),
            DifficultyLevel::Advanced => write!(f, "advanced"),
        }
    }
}

impl std::fmt::Display for CompanySize {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CompanySize::Startup => write!(f, "startup"),
            CompanySize::Small => write!(f, "small"),
            CompanySize::Medium => write!(f, "medium"),
            CompanySize::Large => write!(f, "large"),
            CompanySize::Enterprise => write!(f, "enterprise"),
        }
    }
}