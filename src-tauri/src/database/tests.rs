#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn test_user_role_display() {
        assert_eq!(UserRole::Admin.to_string(), "admin");
        assert_eq!(UserRole::Instructor.to_string(), "instructor");
        assert_eq!(UserRole::User.to_string(), "user");
    }

    #[test]
    fn test_difficulty_level_display() {
        assert_eq!(DifficultyLevel::Beginner.to_string(), "beginner");
        assert_eq!(DifficultyLevel::Intermediate.to_string(), "intermediate");
        assert_eq!(DifficultyLevel::Advanced.to_string(), "advanced");
    }

    #[test]
    fn test_case_study_status_display() {
        assert_eq!(CaseStudyStatus::Draft.to_string(), "draft");
        assert_eq!(CaseStudyStatus::Review.to_string(), "review");
        assert_eq!(CaseStudyStatus::Published.to_string(), "published");
        assert_eq!(CaseStudyStatus::Archived.to_string(), "archived");
    }

    #[test]
    fn test_question_type_display() {
        assert_eq!(QuestionType::MultipleChoice.to_string(), "multiple_choice");
        assert_eq!(QuestionType::ShortAnswer.to_string(), "short_answer");
        assert_eq!(QuestionType::Essay.to_string(), "essay");
        assert_eq!(QuestionType::Analysis.to_string(), "analysis");
        assert_eq!(QuestionType::Reflection.to_string(), "reflection");
    }

    #[test]
    fn test_progress_status_display() {
        assert_eq!(ProgressStatus::NotStarted.to_string(), "not_started");
        assert_eq!(ProgressStatus::InProgress.to_string(), "in_progress");
        assert_eq!(ProgressStatus::Completed.to_string(), "completed");
        assert_eq!(ProgressStatus::Reviewed.to_string(), "reviewed");
    }

    #[test]
    fn test_generation_type_display() {
        assert_eq!(GenerationType::CaseStudy.to_string(), "case_study");
        assert_eq!(GenerationType::Questions.to_string(), "questions");
        assert_eq!(GenerationType::Outline.to_string(), "outline");
        assert_eq!(GenerationType::Background.to_string(), "background");
    }

    #[test]
    fn test_data_type_display() {
        assert_eq!(DataType::String.to_string(), "string");
        assert_eq!(DataType::Number.to_string(), "number");
        assert_eq!(DataType::Boolean.to_string(), "boolean");
        assert_eq!(DataType::Json.to_string(), "json");
    }

    #[test]
    fn test_new_user_serialization() {
        let user = NewUser {
            username: "test_user".to_string(),
            email: Some("test@example.com".to_string()),
            full_name: Some("Test User".to_string()),
            password_hash: None,
            role: Some("user".to_string()),
            preferences: Some(r#"{"theme": "dark"}"#.to_string()),
        };

        let json = serde_json::to_string(&user).unwrap();
        assert!(json.contains("test_user"));
        assert!(json.contains("test@example.com"));
    }

    #[test]
    fn test_new_case_study_creation() {
        let case_study = NewCaseStudy {
            title: "Test Case Study".to_string(),
            description: Some("A test case study".to_string()),
            domain_id: 1,
            template_id: None,
            difficulty_level: Some("beginner".to_string()),
            estimated_duration: Some(60),
            learning_objectives: Some(r#"["Objective 1", "Objective 2"]"#.to_string()),
            tags: Some(r#"["business", "strategy"]"#.to_string()),
            content: "This is the case study content...".to_string(),
            background_info: None,
            problem_statement: None,
            analysis_framework: None,
            sample_solution: None,
            metadata: None,
            status: Some("draft".to_string()),
            created_by: 1,
        };

        assert_eq!(case_study.title, "Test Case Study");
        assert_eq!(case_study.domain_id, 1);
        assert_eq!(case_study.created_by, 1);
    }

    #[test]
    fn test_new_assessment_question_creation() {
        let question = NewAssessmentQuestion {
            case_study_id: 1,
            question_text: "What is the main challenge in this case?".to_string(),
            question_type: "short_answer".to_string(),
            options: None,
            correct_answer: None,
            sample_answer: Some("The main challenge is...".to_string()),
            rubric: Some(r#"{"criteria": ["clarity", "depth"]}"#.to_string()),
            points: Some(10),
            order_index: Some(1),
            is_required: Some(true),
        };

        assert_eq!(question.case_study_id, 1);
        assert_eq!(question.question_type, "short_answer");
        assert_eq!(question.points, Some(10));
    }

    #[test]
    fn test_validation_username() {
        use super::validation::Validator;

        // Valid usernames
        assert!(Validator::validate_username("valid_user").is_ok());
        assert!(Validator::validate_username("user123").is_ok());
        assert!(Validator::validate_username("test_user_123").is_ok());

        // Invalid usernames
        assert!(Validator::validate_username("").is_err()); // Empty
        assert!(Validator::validate_username("ab").is_err()); // Too short
        assert!(Validator::validate_username("user@name").is_err()); // Invalid chars
        assert!(Validator::validate_username("user-name").is_err()); // Invalid chars
    }

    #[test]
    fn test_validation_email() {
        use super::validation::Validator;

        // Valid emails
        assert!(Validator::validate_email("test@example.com").is_ok());
        assert!(Validator::validate_email("user.name@domain.org").is_ok());
        assert!(Validator::validate_email("").is_ok()); // Empty is OK (optional)

        // Invalid emails
        assert!(Validator::validate_email("invalid").is_err());
        assert!(Validator::validate_email("@example.com").is_err());
        assert!(Validator::validate_email("test@").is_err());
    }

    #[test]
    fn test_validation_user_role() {
        use super::validation::Validator;

        // Valid roles
        assert!(Validator::validate_user_role("admin").is_ok());
        assert!(Validator::validate_user_role("instructor").is_ok());
        assert!(Validator::validate_user_role("user").is_ok());

        // Invalid roles
        assert!(Validator::validate_user_role("superuser").is_err());
        assert!(Validator::validate_user_role("").is_err());
        assert!(Validator::validate_user_role("Admin").is_err()); // Case sensitive
    }

    #[test]
    fn test_validation_case_study_status() {
        use super::validation::Validator;

        // Valid statuses
        assert!(Validator::validate_case_study_status("draft").is_ok());
        assert!(Validator::validate_case_study_status("review").is_ok());
        assert!(Validator::validate_case_study_status("published").is_ok());
        assert!(Validator::validate_case_study_status("archived").is_ok());

        // Invalid statuses
        assert!(Validator::validate_case_study_status("pending").is_err());
        assert!(Validator::validate_case_study_status("").is_err());
    }

    #[test]
    fn test_validation_json() {
        use super::validation::Validator;

        // Valid JSON
        assert!(Validator::validate_json(r#"{"key": "value"}"#, "test").is_ok());
        assert!(Validator::validate_json(r#"["item1", "item2"]"#, "test").is_ok());
        assert!(Validator::validate_json("", "test").is_ok()); // Empty is OK

        // Invalid JSON
        assert!(Validator::validate_json(r#"{"key": "value""#, "test").is_err()); // Missing }
        assert!(Validator::validate_json("invalid json", "test").is_err());
    }

    #[test]
    fn test_validatable_trait() {
        use super::validation::Validatable;

        let valid_user = NewUser {
            username: "valid_user".to_string(),
            email: Some("test@example.com".to_string()),
            full_name: None,
            password_hash: None,
            role: Some("user".to_string()),
            preferences: None,
        };

        assert!(valid_user.validate().is_ok());

        let invalid_user = NewUser {
            username: "".to_string(), // Invalid: empty username
            email: None,
            full_name: None,
            password_hash: None,
            role: None,
            preferences: None,
        };

        assert!(invalid_user.validate().is_err());
    }
}