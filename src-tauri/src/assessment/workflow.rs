// Assessment workflow orchestration and business logic

use super::models::*;
use super::repository::AssessmentRepository;
use super::{AssessmentError, Result};
// use crate::ai::providers::question_generator::QuestionGenerator;
use crate::case_study::models::CaseStudy;
use crate::case_study::repository::CaseStudyRepository;
use crate::database::DatabaseManager;
use chrono::Utc;
use std::collections::HashMap;
use uuid::Uuid;

/// Main assessment workflow orchestrator
pub struct AssessmentWorkflow {
    pub repository: AssessmentRepository,
    case_study_repository: CaseStudyRepository,
    // question_generator: QuestionGenerator,
}

impl AssessmentWorkflow {
    pub fn new(db: DatabaseManager) -> Self {
        let repository = AssessmentRepository::new(db.clone());
        let case_study_repository = CaseStudyRepository::new(db.clone());
        // let question_generator = QuestionGenerator::new();

        Self {
            repository,
            case_study_repository,
            // question_generator,
        }
    }

    /// Create a new assessment workflow
    pub async fn create_workflow(&self, new_workflow: NewAssessmentWorkflow) -> Result<AssessmentWorkflowModel> {
        // Validate the workflow data
        self.validate_workflow_data(&new_workflow).await?;

        // Verify case study exists
        let _case_study = self.case_study_repository
            .find_by_id(&new_workflow.case_study_id)
            .await
            .map_err(|e| AssessmentError::CaseStudyError(e.to_string()))?
            .ok_or_else(|| AssessmentError::NotFound("Case study not found".to_string()))?;

        // Create the workflow
        let workflow = self.repository.create_workflow(new_workflow).await?;

        Ok(workflow)
    }

    /// Update an existing workflow
    pub async fn update_workflow(&self, id: &str, update: UpdateAssessmentWorkflow) -> Result<Option<AssessmentWorkflowModel>> {
        // Validate update data
        self.validate_workflow_update(&update).await?;

        // Update the workflow
        self.repository.update_workflow(id, update).await
    }

    /// Publish a workflow
    pub async fn publish_workflow(&self, id: &str) -> Result<Option<AssessmentWorkflowModel>> {
        let workflow = self.repository.find_workflow_by_id(id).await?
            .ok_or_else(|| AssessmentError::NotFound("Workflow not found".to_string()))?;

        // Validate workflow is ready for publishing
        self.validate_workflow_for_publishing(&workflow).await?;

        // Update status to published
        self.repository.update_workflow_status(id, AssessmentWorkflowStatus::Published).await
    }

    /// Archive a workflow
    pub async fn archive_workflow(&self, id: &str) -> Result<Option<AssessmentWorkflowModel>> {
        self.repository.update_workflow_status(id, AssessmentWorkflowStatus::Archived).await
    }

    /// Start a new assessment session
    pub async fn start_session(&self, workflow_id: &str, user_id: &str) -> Result<AssessmentSessionModel> {
        // Create the session
        let session = self.repository.create_session(workflow_id, user_id).await?;

        // Generate question sequence for the session
        let updated_session = self.initialize_session_questions(&session).await?;

        Ok(updated_session)
    }

    /// Submit an answer to a question in a session
    pub async fn submit_answer(
        &self,
        session_id: &str,
        question_id: &str,
        answer: ResponseAnswer,
        confidence_level: Option<i32>,
    ) -> Result<AssessmentSessionModel> {
        let mut session = self.repository.find_session_by_id(session_id).await?
            .ok_or_else(|| AssessmentError::NotFound("Session not found".to_string()))?;

        // Validate session state
        if !matches!(session.session_state, SessionState::InProgress) {
            return Err(AssessmentError::InvalidState("Session is not in progress".to_string()));
        }

        // Calculate response time
        let response_time = self.calculate_response_time(&session, question_id)?;

        // Create response record
        let response = QuestionResponse {
            question_id: question_id.to_string(),
            answer,
            response_time,
            attempts: session.responses.get(question_id).map(|r| r.attempts + 1).unwrap_or(1),
            confidence_level,
            flagged_for_review: false,
            submitted_at: Utc::now(),
            is_correct: None, // Will be calculated
            partial_credit: None,
            feedback_shown: false,
        };

        // Update session with response
        session.responses.insert(question_id.to_string(), response);
        session.last_activity = Utc::now();

        // Calculate progress
        self.update_session_progress(&mut session).await?;

        // Check if session is complete
        if self.is_session_complete(&session)? {
            session.session_state = SessionState::Completed;
            session.end_time = Some(Utc::now());
            
            // Calculate final score
            self.calculate_final_score(&mut session).await?;
        }

        // Update session in database
        self.repository.update_session(&session).await?;

        Ok(session)
    }

    /// Navigate to a specific question in a session
    pub async fn navigate_to_question(&self, session_id: &str, question_id: &str) -> Result<AssessmentSessionModel> {
        let mut session = self.repository.find_session_by_id(session_id).await?
            .ok_or_else(|| AssessmentError::NotFound("Session not found".to_string()))?;

        // Validate navigation is allowed
        let workflow = self.repository.find_workflow_by_id(&session.workflow_id).await?
            .ok_or_else(|| AssessmentError::NotFound("Workflow not found".to_string()))?;

        if !workflow.configuration.navigation_settings.allow_backward_navigation {
            let current_index = session.session_data.question_sequence
                .iter()
                .position(|q| q == session.current_question_id.as_ref().unwrap_or(&String::new()))
                .unwrap_or(0);
            let target_index = session.session_data.question_sequence
                .iter()
                .position(|q| q == question_id)
                .ok_or_else(|| AssessmentError::InvalidState("Invalid question".to_string()))?;

            if target_index < current_index {
                return Err(AssessmentError::PermissionDenied("Backward navigation not allowed".to_string()));
            }
        }

        // Update current question
        session.current_question_id = Some(question_id.to_string());
        session.last_activity = Utc::now();

        // Record navigation event
        let nav_event = NavigationEvent {
            timestamp: Utc::now(),
            event_type: NavigationEventType::QuestionViewed,
            from_question: session.current_question_id.clone(),
            to_question: Some(question_id.to_string()),
            additional_data: HashMap::new(),
        };
        session.session_data.navigation_history.push(nav_event);

        // Update session
        self.repository.update_session(&session).await?;

        Ok(session)
    }

    /// Pause an assessment session
    pub async fn pause_session(&self, session_id: &str) -> Result<AssessmentSessionModel> {
        let mut session = self.repository.find_session_by_id(session_id).await?
            .ok_or_else(|| AssessmentError::NotFound("Session not found".to_string()))?;

        if session.session_state != SessionState::InProgress {
            return Err(AssessmentError::InvalidState("Session is not in progress".to_string()));
        }

        session.session_state = SessionState::Paused;
        session.last_activity = Utc::now();

        // Record navigation event
        let nav_event = NavigationEvent {
            timestamp: Utc::now(),
            event_type: NavigationEventType::AssessmentPaused,
            from_question: session.current_question_id.clone(),
            to_question: None,
            additional_data: HashMap::new(),
        };
        session.session_data.navigation_history.push(nav_event);

        self.repository.update_session(&session).await?;
        Ok(session)
    }

    /// Resume a paused assessment session
    pub async fn resume_session(&self, session_id: &str) -> Result<AssessmentSessionModel> {
        let mut session = self.repository.find_session_by_id(session_id).await?
            .ok_or_else(|| AssessmentError::NotFound("Session not found".to_string()))?;

        if session.session_state != SessionState::Paused {
            return Err(AssessmentError::InvalidState("Session is not paused".to_string()));
        }

        session.session_state = SessionState::InProgress;
        session.last_activity = Utc::now();

        // Record navigation event
        let nav_event = NavigationEvent {
            timestamp: Utc::now(),
            event_type: NavigationEventType::AssessmentResumed,
            from_question: session.current_question_id.clone(),
            to_question: None,
            additional_data: HashMap::new(),
        };
        session.session_data.navigation_history.push(nav_event);

        self.repository.update_session(&session).await?;
        Ok(session)
    }

    /// Submit final assessment for grading
    pub async fn submit_assessment(&self, session_id: &str) -> Result<AssessmentResult> {
        let mut session = self.repository.find_session_by_id(session_id).await?
            .ok_or_else(|| AssessmentError::NotFound("Session not found".to_string()))?;

        if !matches!(session.session_state, SessionState::InProgress | SessionState::Completed) {
            return Err(AssessmentError::InvalidState("Session cannot be submitted".to_string()));
        }

        // Mark as submitted
        session.session_state = SessionState::Submitted;
        session.end_time = Some(Utc::now());

        // Calculate final score and grade responses
        self.calculate_final_score(&mut session).await?;

        // Generate detailed assessment result
        let result = self.generate_assessment_result(&session).await?;

        // Update session
        self.repository.update_session(&session).await?;

        Ok(result)
    }

    /// Get assessment result for a completed session
    pub async fn get_assessment_result(&self, session_id: &str) -> Result<AssessmentResult> {
        let session = self.repository.find_session_by_id(session_id).await?
            .ok_or_else(|| AssessmentError::NotFound("Session not found".to_string()))?;

        if !matches!(session.session_state, SessionState::Completed | SessionState::Submitted) {
            return Err(AssessmentError::InvalidState("Session is not completed".to_string()));
        }

        self.generate_assessment_result(&session).await
    }

    /// Private helper methods

    async fn validate_workflow_data(&self, workflow: &NewAssessmentWorkflow) -> Result<()> {
        if workflow.title.trim().is_empty() {
            return Err(AssessmentError::ValidationError("Title is required".to_string()));
        }

        if workflow.estimated_duration < 1 {
            return Err(AssessmentError::ValidationError("Duration must be at least 1 minute".to_string()));
        }

        if workflow.learning_objectives.is_empty() {
            return Err(AssessmentError::ValidationError("At least one learning objective is required".to_string()));
        }

        Ok(())
    }

    async fn validate_workflow_update(&self, _update: &UpdateAssessmentWorkflow) -> Result<()> {
        // Add validation logic for updates
        Ok(())
    }

    async fn validate_workflow_for_publishing(&self, _workflow: &AssessmentWorkflowModel) -> Result<()> {
        // Validate workflow has questions, proper configuration, etc.
        Ok(())
    }

    async fn initialize_session_questions(&self, session: &AssessmentSessionModel) -> Result<AssessmentSessionModel> {
        let workflow = self.repository.find_workflow_by_id(&session.workflow_id).await?
            .ok_or_else(|| AssessmentError::NotFound("Workflow not found".to_string()))?;

        // Get case study for question generation
        let case_study = self.case_study_repository
            .find_by_id(&workflow.case_study_id)
            .await
            .map_err(|e| AssessmentError::CaseStudyError(e.to_string()))?
            .ok_or_else(|| AssessmentError::NotFound("Case study not found".to_string()))?;

        // Generate questions for this session
        let question_sequence = self.generate_question_sequence(&workflow, &case_study).await?;

        let mut updated_session = session.clone();
        updated_session.session_data.question_sequence = question_sequence;
        updated_session.session_state = SessionState::InProgress;
        updated_session.current_question_id = updated_session.session_data.question_sequence.first().cloned();

        self.repository.update_session(&updated_session).await?;
        Ok(updated_session)
    }

    async fn generate_question_sequence(&self, _workflow: &AssessmentWorkflowModel, _case_study: &CaseStudy) -> Result<Vec<String>> {
        // This would integrate with the question generation system
        // For now, return placeholder questions
        Ok(vec![
            Uuid::new_v4().to_string(),
            Uuid::new_v4().to_string(),
            Uuid::new_v4().to_string(),
        ])
    }

    fn calculate_response_time(&self, _session: &AssessmentSessionModel, _question_id: &str) -> Result<i32> {
        // Calculate time spent on this question
        // This would track from when the question was first viewed
        Ok(30) // Placeholder: 30 seconds
    }

    async fn update_session_progress(&self, session: &mut AssessmentSessionModel) -> Result<()> {
        let total_questions = session.session_data.question_sequence.len();
        let answered_questions = session.responses.len();
        
        session.completion_percentage = if total_questions > 0 {
            (answered_questions as f64 / total_questions as f64) * 100.0
        } else {
            0.0
        };

        Ok(())
    }

    fn is_session_complete(&self, session: &AssessmentSessionModel) -> Result<bool> {
        let total_questions = session.session_data.question_sequence.len();
        let answered_questions = session.responses.len();
        
        Ok(answered_questions >= total_questions)
    }

    async fn calculate_final_score(&self, session: &mut AssessmentSessionModel) -> Result<()> {
        let workflow = self.repository.find_workflow_by_id(&session.workflow_id).await?
            .ok_or_else(|| AssessmentError::NotFound("Workflow not found".to_string()))?;

        // Simple scoring: count correct answers
        let total_questions = session.session_data.question_sequence.len() as f64;
        let correct_answers = session.responses.values()
            .filter(|r| r.is_correct.unwrap_or(false))
            .count() as f64;

        let score = if total_questions > 0.0 {
            (correct_answers / total_questions) * 100.0
        } else {
            0.0
        };

        session.final_score = Some(score);
        session.current_score = Some(score);

        // Determine pass/fail
        if let Some(passing_score) = workflow.configuration.passing_score {
            session.passed = Some(score >= passing_score);
        }

        Ok(())
    }

    async fn generate_assessment_result(&self, session: &AssessmentSessionModel) -> Result<AssessmentResult> {
        let workflow = self.repository.find_workflow_by_id(&session.workflow_id).await?
            .ok_or_else(|| AssessmentError::NotFound("Workflow not found".to_string()))?;

        let overall_score = session.final_score.unwrap_or(0.0);
        let completion_time = session.time_spent;

        // Generate question results
        let question_results: Vec<QuestionResult> = session.responses.iter().map(|(question_id, response)| {
            QuestionResult {
                question_id: question_id.clone(),
                correct: response.is_correct.unwrap_or(false),
                score: if response.is_correct.unwrap_or(false) { 1.0 } else { 0.0 },
                max_score: 1.0,
                response_time: response.response_time,
                attempts: response.attempts,
                difficulty_level: "intermediate".to_string(), // Placeholder
                competencies: Vec::new(), // Placeholder
                bloom_level: None,
            }
        }).collect();

        // Generate insights and recommendations
        let learning_insights = LearningInsights {
            strengths: Vec::new(), // TODO: Analyze performance patterns
            weaknesses: Vec::new(),
            knowledge_gaps: Vec::new(),
            learning_style_indicators: HashMap::new(),
            confidence_patterns: Vec::new(),
            error_patterns: Vec::new(),
        };

        let recommendations = Vec::new(); // TODO: Generate based on performance

        let time_analysis = TimeAnalysis {
            total_time: completion_time,
            effective_time: completion_time, // Simplified
            average_time_per_question: if question_results.len() > 0 {
                completion_time as f64 / question_results.len() as f64
            } else {
                0.0
            },
            time_distribution: HashMap::new(),
            rushed_questions: Vec::new(),
            overtime_questions: Vec::new(),
        };

        Ok(AssessmentResult {
            session_id: session.id.clone(),
            workflow_id: session.workflow_id.clone(),
            user_id: session.user_id.clone(),
            overall_score,
            percentage_score: overall_score,
            passed: session.passed.unwrap_or(false),
            completion_time,
            question_results,
            competency_scores: HashMap::new(),
            difficulty_performance: HashMap::new(),
            time_analysis,
            learning_insights,
            recommendations,
            generated_at: Utc::now(),
        })
    }
}