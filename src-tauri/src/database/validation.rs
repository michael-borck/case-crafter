use thiserror::Error;
use super::models::*;

#[derive(Error, Debug)]
pub enum ValidationError {
    #[error("Field '{field}' is required")]
    RequiredField { field: String },
    
    #[error("Field '{field}' is too short (minimum {min} characters)")]
    TooShort { field: String, min: usize },
    
    #[error("Field '{field}' is too long (maximum {max} characters)")]
    TooLong { field: String, max: usize },
    
    #[error("Invalid email format")]
    InvalidEmail,
    
    #[error("Invalid username format (alphanumeric and underscore only)")]
    InvalidUsername,
    
    #[error("Invalid role: {role}")]
    InvalidRole { role: String },
    
    #[error("Invalid status: {status}")]
    InvalidStatus { status: String },
    
    #[error("Invalid difficulty level: {level}")]
    InvalidDifficultyLevel { level: String },
    
    #[error("Invalid question type: {question_type}")]
    InvalidQuestionType { question_type: String },
    
    #[error("Invalid JSON format in field '{field}'")]
    InvalidJson { field: String },
    
    #[error("Estimated duration must be positive")]
    InvalidDuration,
    
    #[error("Points must be positive")]
    InvalidPoints,
}

pub type ValidationResult<T> = Result<T, ValidationError>;

/// Validation utilities for database models
pub struct Validator;

impl Validator {
    /// Validate username format
    pub fn validate_username(username: &str) -> ValidationResult<()> {
        if username.is_empty() {
            return Err(ValidationError::RequiredField { 
                field: "username".to_string() 
            });
        }
        
        if username.len() < 3 {
            return Err(ValidationError::TooShort { 
                field: "username".to_string(), 
                min: 3 
            });
        }
        
        if username.len() > 50 {
            return Err(ValidationError::TooLong { 
                field: "username".to_string(), 
                max: 50 
            });
        }
        
        if !username.chars().all(|c| c.is_alphanumeric() || c == '_') {
            return Err(ValidationError::InvalidUsername);
        }
        
        Ok(())
    }

    /// Validate email format
    pub fn validate_email(email: &str) -> ValidationResult<()> {
        if email.is_empty() {
            return Ok(()); // Email is optional in most cases
        }
        
        if !email.contains('@') || !email.contains('.') {
            return Err(ValidationError::InvalidEmail);
        }
        
        // Basic email validation - in production, use a proper email validation library
        let parts: Vec<&str> = email.split('@').collect();
        if parts.len() != 2 || parts[0].is_empty() || parts[1].is_empty() {
            return Err(ValidationError::InvalidEmail);
        }
        
        Ok(())
    }

    /// Validate user role
    pub fn validate_user_role(role: &str) -> ValidationResult<()> {
        match role {
            "admin" | "instructor" | "user" => Ok(()),
            _ => Err(ValidationError::InvalidRole { 
                role: role.to_string() 
            }),
        }
    }

    /// Validate case study status
    pub fn validate_case_study_status(status: &str) -> ValidationResult<()> {
        match status {
            "draft" | "review" | "published" | "archived" => Ok(()),
            _ => Err(ValidationError::InvalidStatus { 
                status: status.to_string() 
            }),
        }
    }

    /// Validate difficulty level
    pub fn validate_difficulty_level(level: &str) -> ValidationResult<()> {
        match level {
            "beginner" | "intermediate" | "advanced" => Ok(()),
            _ => Err(ValidationError::InvalidDifficultyLevel { 
                level: level.to_string() 
            }),
        }
    }

    /// Validate question type
    pub fn validate_question_type(question_type: &str) -> ValidationResult<()> {
        match question_type {
            "multiple_choice" | "short_answer" | "essay" | "analysis" | "reflection" => Ok(()),
            _ => Err(ValidationError::InvalidQuestionType { 
                question_type: question_type.to_string() 
            }),
        }
    }

    /// Validate progress status
    pub fn validate_progress_status(status: &str) -> ValidationResult<()> {
        match status {
            "not_started" | "in_progress" | "completed" | "reviewed" => Ok(()),
            _ => Err(ValidationError::InvalidStatus { 
                status: status.to_string() 
            }),
        }
    }

    /// Validate JSON string
    pub fn validate_json(json_str: &str, field_name: &str) -> ValidationResult<()> {
        if json_str.is_empty() {
            return Ok(());
        }
        
        if let Err(_) = serde_json::from_str::<serde_json::Value>(json_str) {
            return Err(ValidationError::InvalidJson { 
                field: field_name.to_string() 
            });
        }
        
        Ok(())
    }

    /// Validate title length
    pub fn validate_title(title: &str) -> ValidationResult<()> {
        if title.is_empty() {
            return Err(ValidationError::RequiredField { 
                field: "title".to_string() 
            });
        }
        
        if title.len() < 5 {
            return Err(ValidationError::TooShort { 
                field: "title".to_string(), 
                min: 5 
            });
        }
        
        if title.len() > 200 {
            return Err(ValidationError::TooLong { 
                field: "title".to_string(), 
                max: 200 
            });
        }
        
        Ok(())
    }

    /// Validate content length
    pub fn validate_content(content: &str) -> ValidationResult<()> {
        if content.is_empty() {
            return Err(ValidationError::RequiredField { 
                field: "content".to_string() 
            });
        }
        
        if content.len() < 50 {
            return Err(ValidationError::TooShort { 
                field: "content".to_string(), 
                min: 50 
            });
        }
        
        if content.len() > 50000 {
            return Err(ValidationError::TooLong { 
                field: "content".to_string(), 
                max: 50000 
            });
        }
        
        Ok(())
    }

    /// Validate estimated duration
    pub fn validate_duration(duration: i64) -> ValidationResult<()> {
        if duration <= 0 {
            return Err(ValidationError::InvalidDuration);
        }
        
        Ok(())
    }

    /// Validate points
    pub fn validate_points(points: i64) -> ValidationResult<()> {
        if points <= 0 {
            return Err(ValidationError::InvalidPoints);
        }
        
        Ok(())
    }

    /// Validate new user data
    pub fn validate_new_user(user: &NewUser) -> ValidationResult<()> {
        Self::validate_username(&user.username)?;
        
        if let Some(email) = &user.email {
            Self::validate_email(email)?;
        }
        
        if let Some(role) = &user.role {
            Self::validate_user_role(role)?;
        }
        
        if let Some(preferences) = &user.preferences {
            Self::validate_json(preferences, "preferences")?;
        }
        
        Ok(())
    }

    /// Validate new case study data
    pub fn validate_new_case_study(case_study: &NewCaseStudy) -> ValidationResult<()> {
        Self::validate_title(&case_study.title)?;
        Self::validate_content(&case_study.content)?;
        
        if let Some(difficulty) = &case_study.difficulty_level {
            Self::validate_difficulty_level(difficulty)?;
        }
        
        if let Some(duration) = case_study.estimated_duration {
            Self::validate_duration(duration)?;
        }
        
        if let Some(objectives) = &case_study.learning_objectives {
            Self::validate_json(objectives, "learning_objectives")?;
        }
        
        if let Some(tags) = &case_study.tags {
            Self::validate_json(tags, "tags")?;
        }
        
        if let Some(metadata) = &case_study.metadata {
            Self::validate_json(metadata, "metadata")?;
        }
        
        if let Some(status) = &case_study.status {
            Self::validate_case_study_status(status)?;
        }
        
        Ok(())
    }

    /// Validate new assessment question data
    pub fn validate_new_assessment_question(question: &NewAssessmentQuestion) -> ValidationResult<()> {
        if question.question_text.is_empty() {
            return Err(ValidationError::RequiredField { 
                field: "question_text".to_string() 
            });
        }
        
        if question.question_text.len() < 10 {
            return Err(ValidationError::TooShort { 
                field: "question_text".to_string(), 
                min: 10 
            });
        }
        
        Self::validate_question_type(&question.question_type)?;
        
        if let Some(options) = &question.options {
            Self::validate_json(options, "options")?;
        }
        
        if let Some(rubric) = &question.rubric {
            Self::validate_json(rubric, "rubric")?;
        }
        
        if let Some(points) = question.points {
            Self::validate_points(points)?;
        }
        
        Ok(())
    }

    /// Validate domain name
    pub fn validate_domain_name(name: &str) -> ValidationResult<()> {
        if name.is_empty() {
            return Err(ValidationError::RequiredField { 
                field: "name".to_string() 
            });
        }
        
        if name.len() < 2 {
            return Err(ValidationError::TooShort { 
                field: "name".to_string(), 
                min: 2 
            });
        }
        
        if name.len() > 50 {
            return Err(ValidationError::TooLong { 
                field: "name".to_string(), 
                max: 50 
            });
        }
        
        Ok(())
    }

    /// Validate new domain data
    pub fn validate_new_domain(domain: &NewDomain) -> ValidationResult<()> {
        Self::validate_domain_name(&domain.name)?;
        Ok(())
    }
}

/// Trait for models that can be validated
pub trait Validatable {
    fn validate(&self) -> ValidationResult<()>;
}

impl Validatable for NewUser {
    fn validate(&self) -> ValidationResult<()> {
        Validator::validate_new_user(self)
    }
}

impl Validatable for NewCaseStudy {
    fn validate(&self) -> ValidationResult<()> {
        Validator::validate_new_case_study(self)
    }
}

impl Validatable for NewAssessmentQuestion {
    fn validate(&self) -> ValidationResult<()> {
        Validator::validate_new_assessment_question(self)
    }
}

impl Validatable for NewDomain {
    fn validate(&self) -> ValidationResult<()> {
        Validator::validate_new_domain(self)
    }
}