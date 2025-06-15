// Question generation engine for case studies with multiple question types and difficulty levels

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::ai::{AIManager, GenerationRequest, models::ChatMessage};
use crate::ai::errors::{AIError, Result};

/// Parameters for question generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuestionGenerationParams {
    pub case_study_title: String,
    pub case_study_content: String,
    pub case_study_summary: Option<String>,
    pub learning_objectives: Vec<String>,
    pub question_types: Vec<QuestionType>,
    pub difficulty_level: QuestionDifficulty,
    pub num_questions: u32,
    pub max_points_per_question: u32,
    pub include_rubric: bool,
    pub target_duration_minutes: Option<u32>,
    pub focus_areas: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum QuestionType {
    MultipleChoice,
    ShortAnswer,
    Essay,
    TrueFalse,
    CaseAnalysis,
    Calculation,
    Scenario,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum QuestionDifficulty {
    Basic,
    Intermediate,
    Advanced,
    Mixed,
}

/// Generated assessment questions with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedAssessment {
    pub title: String,
    pub instructions: String,
    pub questions: Vec<AssessmentQuestion>,
    pub total_points: u32,
    pub estimated_duration_minutes: u32,
    pub rubric: Option<String>,
    pub metadata: AssessmentMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssessmentQuestion {
    pub id: String,
    pub question_type: QuestionType,
    pub difficulty: QuestionDifficulty,
    pub question_text: String,
    pub points: u32,
    pub options: Option<Vec<QuestionOption>>, // For multiple choice, true/false
    pub correct_answer: Option<String>, // For objective questions
    pub sample_answer: Option<String>, // For subjective questions
    pub explanation: Option<String>,
    pub evaluation_criteria: Option<Vec<String>>, // For subjective questions
    pub keywords: Vec<String>,
    pub learning_objective: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuestionOption {
    pub id: String,
    pub text: String,
    pub is_correct: bool,
    pub explanation: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssessmentMetadata {
    pub question_type_distribution: HashMap<String, u32>,
    pub difficulty_distribution: HashMap<String, u32>,
    pub learning_objective_coverage: Vec<String>,
    pub cognitive_levels: Vec<String>, // Bloom's taxonomy levels
    pub estimated_grading_time_minutes: u32,
}

/// Question generation service
pub struct QuestionGenerator {
    ai_manager: AIManager,
}

impl QuestionGenerator {
    pub fn new(ai_manager: AIManager) -> Self {
        Self { ai_manager }
    }

    /// Generate a complete assessment with multiple question types
    pub async fn generate_assessment(&self, params: QuestionGenerationParams) -> Result<GeneratedAssessment> {
        // Validate parameters
        self.validate_parameters(&params)?;
        
        // Generate questions by type
        let mut all_questions = Vec::new();
        let questions_per_type = self.distribute_questions(&params);
        
        for (question_type, count) in questions_per_type {
            if count > 0 {
                let questions = self.generate_questions_by_type(&params, &question_type, count).await?;
                all_questions.extend(questions);
            }
        }
        
        // Generate assessment metadata
        let metadata = self.generate_metadata(&all_questions, &params);
        
        // Generate instructions and rubric
        let instructions = self.generate_instructions(&params, &all_questions).await?;
        let rubric = if params.include_rubric {
            Some(self.generate_rubric(&params, &all_questions).await?)
        } else {
            None
        };
        
        // Calculate totals
        let total_points = all_questions.iter().map(|q| q.points).sum();
        let estimated_duration = self.estimate_assessment_duration(&all_questions, &params);
        
        Ok(GeneratedAssessment {
            title: format!("Assessment: {}", params.case_study_title),
            instructions,
            questions: all_questions,
            total_points,
            estimated_duration_minutes: estimated_duration,
            rubric,
            metadata,
        })
    }

    /// Validate generation parameters
    fn validate_parameters(&self, params: &QuestionGenerationParams) -> Result<()> {
        if params.case_study_title.trim().is_empty() {
            return Err(AIError::ValidationError("Case study title cannot be empty".to_string()));
        }
        
        if params.case_study_content.trim().is_empty() {
            return Err(AIError::ValidationError("Case study content cannot be empty".to_string()));
        }
        
        if params.case_study_content.len() < 200 {
            return Err(AIError::ValidationError("Case study content too short for meaningful questions".to_string()));
        }
        
        if params.num_questions == 0 {
            return Err(AIError::ValidationError("Number of questions must be greater than 0".to_string()));
        }
        
        if params.num_questions > 50 {
            return Err(AIError::ValidationError("Number of questions cannot exceed 50".to_string()));
        }
        
        if params.question_types.is_empty() {
            return Err(AIError::ValidationError("At least one question type must be specified".to_string()));
        }
        
        if params.max_points_per_question == 0 {
            return Err(AIError::ValidationError("Max points per question must be greater than 0".to_string()));
        }
        
        if params.max_points_per_question > 100 {
            return Err(AIError::ValidationError("Max points per question cannot exceed 100".to_string()));
        }
        
        if params.learning_objectives.is_empty() {
            return Err(AIError::ValidationError("At least one learning objective must be provided".to_string()));
        }

        Ok(())
    }

    /// Distribute questions across different types
    fn distribute_questions(&self, params: &QuestionGenerationParams) -> HashMap<QuestionType, u32> {
        let mut distribution = HashMap::new();
        let num_types = params.question_types.len() as u32;
        let base_count = params.num_questions / num_types;
        let remainder = params.num_questions % num_types;
        
        for (i, question_type) in params.question_types.iter().enumerate() {
            let count = base_count + if i < remainder as usize { 1 } else { 0 };
            distribution.insert(question_type.clone(), count);
        }
        
        distribution
    }

    /// Generate questions of a specific type
    async fn generate_questions_by_type(
        &self,
        params: &QuestionGenerationParams,
        question_type: &QuestionType,
        count: u32,
    ) -> Result<Vec<AssessmentQuestion>> {
        let prompt_manager = self.ai_manager.get_prompt_manager();
        
        // Prepare template variables
        let mut variables = HashMap::new();
        variables.insert("case_study_title".to_string(), serde_json::json!(params.case_study_title));
        variables.insert("case_study_content".to_string(), serde_json::json!(params.case_study_content));
        variables.insert("case_study_summary".to_string(), serde_json::json!(params.case_study_summary.as_deref().unwrap_or("")));
        variables.insert("learning_objectives".to_string(), serde_json::json!(params.learning_objectives.join(", ")));
        variables.insert("question_type".to_string(), serde_json::json!(format!("{:?}", question_type).to_lowercase()));
        variables.insert("difficulty_level".to_string(), serde_json::json!(format!("{:?}", params.difficulty_level).to_lowercase()));
        variables.insert("num_questions".to_string(), serde_json::json!(count));
        variables.insert("max_points".to_string(), serde_json::json!(params.max_points_per_question));
        variables.insert("focus_areas".to_string(), serde_json::json!(params.focus_areas.join(", ")));

        // Select appropriate template based on question type
        let template_id = match question_type {
            QuestionType::MultipleChoice => "multiple_choice_questions",
            QuestionType::ShortAnswer => "short_answer_questions",
            QuestionType::Essay => "essay_questions",
            QuestionType::TrueFalse => "true_false_questions",
            QuestionType::CaseAnalysis => "case_analysis_questions",
            QuestionType::Calculation => "calculation_questions",
            QuestionType::Scenario => "scenario_questions",
        };

        // Render the template
        let rendered = prompt_manager.render_template(template_id, &variables)?;

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

        // Parse the response into structured questions
        self.parse_questions_response(&response.content, question_type, params).await
    }

    /// Parse AI response into structured questions
    async fn parse_questions_response(
        &self,
        content: &str,
        question_type: &QuestionType,
        params: &QuestionGenerationParams,
    ) -> Result<Vec<AssessmentQuestion>> {
        // This is a simplified parser - in a real implementation, you'd want more robust parsing
        let mut questions = Vec::new();
        let lines: Vec<&str> = content.lines().collect();
        
        let mut current_question: Option<AssessmentQuestion> = None;
        let mut question_counter = 1;
        
        for line in lines {
            let trimmed = line.trim();
            
            // Start of a new question
            if trimmed.starts_with(&format!("{}.", question_counter)) || 
               trimmed.starts_with(&format!("Question {}:", question_counter)) {
                
                // Save previous question
                if let Some(question) = current_question.take() {
                    questions.push(question);
                }
                
                // Start new question
                let question_text = trimmed.split_once('.').or_else(|| trimmed.split_once(':'))
                    .map(|(_, text)| text.trim().to_string())
                    .unwrap_or_else(|| trimmed.to_string());
                
                current_question = Some(AssessmentQuestion {
                    id: format!("q_{}", question_counter),
                    question_type: question_type.clone(),
                    difficulty: params.difficulty_level.clone(),
                    question_text,
                    points: params.max_points_per_question,
                    options: None,
                    correct_answer: None,
                    sample_answer: None,
                    explanation: None,
                    evaluation_criteria: None,
                    keywords: Vec::new(),
                    learning_objective: params.learning_objectives.first().cloned(),
                });
                
                question_counter += 1;
            }
            // Handle multiple choice options
            else if (trimmed.starts_with("a)") || trimmed.starts_with("A)") ||
                    trimmed.starts_with("b)") || trimmed.starts_with("B)") ||
                    trimmed.starts_with("c)") || trimmed.starts_with("C)") ||
                    trimmed.starts_with("d)") || trimmed.starts_with("D)")) &&
                   matches!(question_type, QuestionType::MultipleChoice) {
                
                if let Some(ref mut question) = current_question {
                    if question.options.is_none() {
                        question.options = Some(Vec::new());
                    }
                    
                    if let Some(ref mut options) = question.options {
                        let option_text = trimmed[2..].trim().to_string();
                        let option_id = trimmed[0..1].to_lowercase();
                        
                        options.push(QuestionOption {
                            id: option_id.clone(),
                            text: option_text,
                            is_correct: false, // Will be set later based on answer key
                            explanation: None,
                        });
                    }
                }
            }
            // Handle answer key
            else if trimmed.starts_with("Answer:") || trimmed.starts_with("Correct Answer:") {
                if let Some(ref mut question) = current_question {
                    let answer = trimmed.split_once(':')
                        .map(|(_, answer)| answer.trim().to_string())
                        .unwrap_or_default();
                    question.correct_answer = Some(answer.clone());
                    
                    // Mark correct option for multiple choice
                    if let Some(ref mut options) = question.options {
                        for option in options.iter_mut() {
                            if option.id.to_lowercase() == answer.to_lowercase() {
                                option.is_correct = true;
                                break;
                            }
                        }
                    }
                }
            }
        }
        
        // Don't forget the last question
        if let Some(question) = current_question {
            questions.push(question);
        }
        
        Ok(questions)
    }

    /// Generate assessment instructions
    async fn generate_instructions(
        &self,
        params: &QuestionGenerationParams,
        questions: &[AssessmentQuestion],
    ) -> Result<String> {
        let prompt = format!(
            "Generate clear, professional instructions for an assessment with {} questions about '{}'. \
            The assessment includes {} question types and should take approximately {} minutes. \
            Include time allocation suggestions and any special instructions for different question types.",
            questions.len(),
            params.case_study_title,
            params.question_types.len(),
            params.target_duration_minutes.unwrap_or(60)
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

    /// Generate grading rubric
    async fn generate_rubric(
        &self,
        params: &QuestionGenerationParams,
        questions: &[AssessmentQuestion],
    ) -> Result<String> {
        let subjective_questions: Vec<_> = questions.iter()
            .filter(|q| matches!(q.question_type, QuestionType::Essay | QuestionType::CaseAnalysis | QuestionType::Scenario))
            .collect();

        if subjective_questions.is_empty() {
            return Ok("This assessment contains only objective questions that can be auto-graded.".to_string());
        }

        let prompt = format!(
            "Create a detailed grading rubric for {} subjective questions in an assessment about '{}'. \
            Include criteria for different performance levels (excellent, good, satisfactory, needs improvement) \
            and point allocations. Focus on: {}",
            subjective_questions.len(),
            params.case_study_title,
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

    /// Generate assessment metadata
    fn generate_metadata(
        &self,
        questions: &[AssessmentQuestion],
        params: &QuestionGenerationParams,
    ) -> AssessmentMetadata {
        let mut question_type_distribution = HashMap::new();
        let mut difficulty_distribution = HashMap::new();
        
        for question in questions {
            let type_key = format!("{:?}", question.question_type).to_lowercase();
            *question_type_distribution.entry(type_key).or_insert(0) += 1;
            
            let difficulty_key = format!("{:?}", question.difficulty).to_lowercase();
            *difficulty_distribution.entry(difficulty_key).or_insert(0) += 1;
        }
        
        // Extract cognitive levels based on question types and content
        let cognitive_levels = self.determine_cognitive_levels(questions);
        
        // Estimate grading time
        let grading_time = self.estimate_grading_time(questions);
        
        AssessmentMetadata {
            question_type_distribution,
            difficulty_distribution,
            learning_objective_coverage: params.learning_objectives.clone(),
            cognitive_levels,
            estimated_grading_time_minutes: grading_time,
        }
    }

    /// Determine cognitive levels (Bloom's taxonomy) covered
    fn determine_cognitive_levels(&self, questions: &[AssessmentQuestion]) -> Vec<String> {
        let mut levels = Vec::new();
        
        for question in questions {
            match question.question_type {
                QuestionType::TrueFalse | QuestionType::MultipleChoice => {
                    if !levels.contains(&"Remember".to_string()) {
                        levels.push("Remember".to_string());
                    }
                    if !levels.contains(&"Understand".to_string()) {
                        levels.push("Understand".to_string());
                    }
                }
                QuestionType::ShortAnswer => {
                    if !levels.contains(&"Apply".to_string()) {
                        levels.push("Apply".to_string());
                    }
                }
                QuestionType::CaseAnalysis | QuestionType::Scenario => {
                    if !levels.contains(&"Analyze".to_string()) {
                        levels.push("Analyze".to_string());
                    }
                    if !levels.contains(&"Evaluate".to_string()) {
                        levels.push("Evaluate".to_string());
                    }
                }
                QuestionType::Essay => {
                    if !levels.contains(&"Create".to_string()) {
                        levels.push("Create".to_string());
                    }
                }
                QuestionType::Calculation => {
                    if !levels.contains(&"Apply".to_string()) {
                        levels.push("Apply".to_string());
                    }
                }
            }
        }
        
        levels
    }

    /// Estimate grading time in minutes
    fn estimate_grading_time(&self, questions: &[AssessmentQuestion]) -> u32 {
        let mut total_minutes = 0;
        
        for question in questions {
            let time_per_question = match question.question_type {
                QuestionType::TrueFalse | QuestionType::MultipleChoice => 0, // Auto-graded
                QuestionType::ShortAnswer => 2,
                QuestionType::Calculation => 3,
                QuestionType::CaseAnalysis => 5,
                QuestionType::Scenario => 4,
                QuestionType::Essay => 8,
            };
            total_minutes += time_per_question;
        }
        
        total_minutes
    }

    /// Estimate assessment duration
    fn estimate_assessment_duration(
        &self,
        questions: &[AssessmentQuestion],
        params: &QuestionGenerationParams,
    ) -> u32 {
        if let Some(target) = params.target_duration_minutes {
            return target;
        }
        
        let mut total_minutes = 0;
        
        for question in questions {
            let time_per_question = match question.question_type {
                QuestionType::TrueFalse => 1,
                QuestionType::MultipleChoice => 2,
                QuestionType::ShortAnswer => 5,
                QuestionType::Calculation => 8,
                QuestionType::CaseAnalysis => 15,
                QuestionType::Scenario => 12,
                QuestionType::Essay => 20,
            };
            total_minutes += time_per_question;
        }
        
        // Add 10% buffer
        (total_minutes as f32 * 1.1) as u32
    }
}

impl Default for QuestionGenerationParams {
    fn default() -> Self {
        Self {
            case_study_title: "Business Case Study".to_string(),
            case_study_content: String::new(),
            case_study_summary: None,
            learning_objectives: vec!["Critical thinking".to_string(), "Problem solving".to_string()],
            question_types: vec![QuestionType::MultipleChoice, QuestionType::ShortAnswer, QuestionType::Essay],
            difficulty_level: QuestionDifficulty::Intermediate,
            num_questions: 5,
            max_points_per_question: 10,
            include_rubric: true,
            target_duration_minutes: Some(60),
            focus_areas: vec![],
        }
    }
}

impl std::fmt::Display for QuestionType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            QuestionType::MultipleChoice => write!(f, "multiple_choice"),
            QuestionType::ShortAnswer => write!(f, "short_answer"),
            QuestionType::Essay => write!(f, "essay"),
            QuestionType::TrueFalse => write!(f, "true_false"),
            QuestionType::CaseAnalysis => write!(f, "case_analysis"),
            QuestionType::Calculation => write!(f, "calculation"),
            QuestionType::Scenario => write!(f, "scenario"),
        }
    }
}

impl std::fmt::Display for QuestionDifficulty {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            QuestionDifficulty::Basic => write!(f, "basic"),
            QuestionDifficulty::Intermediate => write!(f, "intermediate"),
            QuestionDifficulty::Advanced => write!(f, "advanced"),
            QuestionDifficulty::Mixed => write!(f, "mixed"),
        }
    }
}