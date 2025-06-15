// Assessment session management

use super::models::*;
use super::{AssessmentError, Result};
use chrono::{Duration, Utc};
use std::collections::HashMap;

/// Assessment session manager for real-time session operations
pub struct AssessmentSession {
    session: AssessmentSessionModel,
    workflow: AssessmentWorkflowModel,
}

impl AssessmentSession {
    pub fn new(session: AssessmentSessionModel, workflow: AssessmentWorkflowModel) -> Self {
        Self { session, workflow }
    }

    /// Get current session state
    pub fn get_session(&self) -> &AssessmentSessionModel {
        &self.session
    }

    /// Get mutable access to session (for updates)
    pub fn get_session_mut(&mut self) -> &mut AssessmentSessionModel {
        &mut self.session
    }

    /// Get workflow configuration
    pub fn get_workflow(&self) -> &AssessmentWorkflowModel {
        &self.workflow
    }

    /// Check if session has timed out
    pub fn is_timed_out(&self) -> bool {
        if let Some(time_limit) = self.workflow.configuration.time_limit {
            let elapsed_minutes = self.session.time_spent / 60;
            elapsed_minutes >= time_limit
        } else {
            false
        }
    }

    /// Get remaining time in seconds
    pub fn get_remaining_time(&self) -> Option<i32> {
        if let Some(time_limit) = self.workflow.configuration.time_limit {
            let time_limit_seconds = time_limit * 60;
            let remaining = time_limit_seconds - self.session.time_spent;
            Some(remaining.max(0))
        } else {
            None
        }
    }

    /// Check if session is still active
    pub fn is_active(&self) -> bool {
        matches!(
            self.session.session_state,
            SessionState::InProgress | SessionState::Paused
        ) && !self.is_timed_out()
    }

    /// Get current question information
    pub fn get_current_question(&self) -> Option<&String> {
        self.session.current_question_id.as_ref()
    }

    /// Get next question in sequence
    pub fn get_next_question(&self) -> Option<&String> {
        if let Some(current) = &self.session.current_question_id {
            let current_index = self.session.session_data.question_sequence
                .iter()
                .position(|q| q == current)?;
            
            self.session.session_data.question_sequence.get(current_index + 1)
        } else {
            self.session.session_data.question_sequence.first()
        }
    }

    /// Get previous question in sequence
    pub fn get_previous_question(&self) -> Option<&String> {
        if let Some(current) = &self.session.current_question_id {
            let current_index = self.session.session_data.question_sequence
                .iter()
                .position(|q| q == current)?;
            
            if current_index > 0 {
                self.session.session_data.question_sequence.get(current_index - 1)
            } else {
                None
            }
        } else {
            None
        }
    }

    /// Check if backward navigation is allowed
    pub fn can_navigate_backward(&self) -> bool {
        self.workflow.configuration.navigation_settings.allow_backward_navigation
    }

    /// Check if question skipping is allowed
    pub fn can_skip_questions(&self) -> bool {
        self.workflow.configuration.navigation_settings.allow_question_skipping
    }

    /// Get answered questions count
    pub fn get_answered_count(&self) -> usize {
        self.session.responses.len()
    }

    /// Get total questions count
    pub fn get_total_questions(&self) -> usize {
        self.session.session_data.question_sequence.len()
    }

    /// Get progress percentage
    pub fn get_progress_percentage(&self) -> f64 {
        self.session.completion_percentage
    }

    /// Check if question has been answered
    pub fn is_question_answered(&self, question_id: &str) -> bool {
        self.session.responses.contains_key(question_id)
    }

    /// Get response for a question
    pub fn get_question_response(&self, question_id: &str) -> Option<&QuestionResponse> {
        self.session.responses.get(question_id)
    }

    /// Check if all required questions are answered
    pub fn are_all_required_questions_answered(&self) -> bool {
        if !self.workflow.configuration.require_all_questions {
            return true;
        }

        self.get_answered_count() >= self.get_total_questions()
    }

    /// Get current score
    pub fn get_current_score(&self) -> Option<f64> {
        self.session.current_score
    }

    /// Check if session meets passing criteria
    pub fn meets_passing_criteria(&self) -> Option<bool> {
        if let (Some(score), Some(passing_score)) = 
            (self.session.current_score, self.workflow.configuration.passing_score) {
            Some(score >= passing_score)
        } else {
            None
        }
    }

    /// Get bookmarked questions
    pub fn get_bookmarked_questions(&self) -> &Vec<String> {
        &self.session.session_data.bookmarked_questions
    }

    /// Check if question is bookmarked
    pub fn is_question_bookmarked(&self, question_id: &str) -> bool {
        self.session.session_data.bookmarked_questions.contains(&question_id.to_string())
    }

    /// Get user notes for a question
    pub fn get_question_notes(&self, question_id: &str) -> Option<&String> {
        self.session.session_data.notes.get(question_id)
    }

    /// Get time spent on specific question
    pub fn get_question_time(&self, question_id: &str) -> Option<i32> {
        self.session.session_data.time_per_question.get(question_id).copied()
    }

    /// Get navigation history
    pub fn get_navigation_history(&self) -> &Vec<NavigationEvent> {
        &self.session.session_data.navigation_history
    }

    /// Get case study interactions
    pub fn get_case_study_interactions(&self) -> &Vec<CaseStudyInteraction> {
        &self.session.session_data.case_study_interactions
    }

    /// Calculate session statistics
    pub fn get_session_statistics(&self) -> SessionStatistics {
        let total_time = self.session.time_spent;
        let answered_questions = self.get_answered_count();
        let total_questions = self.get_total_questions();
        
        let average_time_per_question = if answered_questions > 0 {
            total_time as f64 / answered_questions as f64
        } else {
            0.0
        };

        let completion_rate = if total_questions > 0 {
            answered_questions as f64 / total_questions as f64 * 100.0
        } else {
            0.0
        };

        let correct_answers = self.session.responses.values()
            .filter(|r| r.is_correct.unwrap_or(false))
            .count();

        let accuracy = if answered_questions > 0 {
            correct_answers as f64 / answered_questions as f64 * 100.0
        } else {
            0.0
        };

        SessionStatistics {
            total_time,
            answered_questions: answered_questions as i32,
            total_questions: total_questions as i32,
            completion_rate,
            accuracy,
            average_time_per_question,
            remaining_time: self.get_remaining_time(),
            is_timed_out: self.is_timed_out(),
            navigation_events: self.session.session_data.navigation_history.len() as i32,
            case_study_interactions: self.session.session_data.case_study_interactions.len() as i32,
        }
    }

    /// Update session with new response (mutable version)
    pub fn update_with_response(&mut self, question_id: String, response: QuestionResponse) {
        self.session.responses.insert(question_id, response);
        self.session.last_activity = Utc::now();
        self.update_progress();
    }

    /// Add navigation event
    pub fn add_navigation_event(&mut self, event: NavigationEvent) {
        self.session.session_data.navigation_history.push(event);
        self.session.last_activity = Utc::now();
    }

    /// Add case study interaction
    pub fn add_case_study_interaction(&mut self, interaction: CaseStudyInteraction) {
        self.session.session_data.case_study_interactions.push(interaction);
        self.session.last_activity = Utc::now();
    }

    /// Bookmark question
    pub fn bookmark_question(&mut self, question_id: String) {
        if !self.session.session_data.bookmarked_questions.contains(&question_id) {
            self.session.session_data.bookmarked_questions.push(question_id);
        }
    }

    /// Remove bookmark
    pub fn remove_bookmark(&mut self, question_id: &str) {
        self.session.session_data.bookmarked_questions.retain(|id| id != question_id);
    }

    /// Add or update question notes
    pub fn update_question_notes(&mut self, question_id: String, notes: String) {
        self.session.session_data.notes.insert(question_id, notes);
        self.session.last_activity = Utc::now();
    }

    /// Update current question
    pub fn set_current_question(&mut self, question_id: Option<String>) {
        self.session.current_question_id = question_id;
        self.session.last_activity = Utc::now();
    }

    /// Update session state
    pub fn set_session_state(&mut self, state: SessionState) {
        let state_clone = state.clone();
        self.session.session_state = state;
        self.session.last_activity = Utc::now();
        
        if matches!(state_clone, SessionState::Completed | SessionState::Submitted | SessionState::TimedOut) {
            self.session.end_time = Some(Utc::now());
        }
    }

    /// Update time spent
    pub fn update_time_spent(&mut self, additional_seconds: i32) {
        self.session.time_spent += additional_seconds;
        self.session.last_activity = Utc::now();
    }

    /// Set question time tracking
    pub fn set_question_time(&mut self, question_id: String, time_seconds: i32) {
        self.session.session_data.time_per_question.insert(question_id, time_seconds);
    }

    /// Update progress calculation
    fn update_progress(&mut self) {
        let total_questions = self.get_total_questions();
        let answered_questions = self.get_answered_count();
        
        self.session.completion_percentage = if total_questions > 0 {
            answered_questions as f64 / total_questions as f64 * 100.0
        } else {
            0.0
        };
    }

    /// Validate session can be submitted
    pub fn can_submit(&self) -> Result<()> {
        if !self.is_active() {
            return Err(AssessmentError::InvalidState("Session is not active".to_string()));
        }

        if self.is_timed_out() {
            return Err(AssessmentError::InvalidState("Session has timed out".to_string()));
        }

        if self.workflow.configuration.require_all_questions && !self.are_all_required_questions_answered() {
            return Err(AssessmentError::ValidationError("All questions must be answered".to_string()));
        }

        Ok(())
    }

    /// Get session warnings
    pub fn get_session_warnings(&self) -> Vec<SessionWarning> {
        let mut warnings = Vec::new();

        // Time warnings
        if let Some(remaining) = self.get_remaining_time() {
            if remaining <= 300 { // 5 minutes
                warnings.push(SessionWarning {
                    warning_type: SessionWarningType::TimeRunningOut,
                    message: format!("Only {} minutes remaining", remaining / 60),
                    severity: if remaining <= 60 { WarningLevel::Critical } else { WarningLevel::Warning },
                });
            }
        }

        // Progress warnings
        if self.get_progress_percentage() < 50.0 && self.session.time_spent > 1800 { // 30 minutes
            warnings.push(SessionWarning {
                warning_type: SessionWarningType::SlowProgress,
                message: "You may want to increase your pace".to_string(),
                severity: WarningLevel::Info,
            });
        }

        // Required questions warning
        if self.workflow.configuration.require_all_questions && 
           self.get_progress_percentage() > 90.0 && 
           !self.are_all_required_questions_answered() {
            warnings.push(SessionWarning {
                warning_type: SessionWarningType::IncompleteRequiredQuestions,
                message: "Some required questions are not yet answered".to_string(),
                severity: WarningLevel::Warning,
            });
        }

        warnings
    }
}

/// Session statistics summary
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SessionStatistics {
    pub total_time: i32,
    pub answered_questions: i32,
    pub total_questions: i32,
    pub completion_rate: f64,
    pub accuracy: f64,
    pub average_time_per_question: f64,
    pub remaining_time: Option<i32>,
    pub is_timed_out: bool,
    pub navigation_events: i32,
    pub case_study_interactions: i32,
}

/// Session warning types
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SessionWarning {
    pub warning_type: SessionWarningType,
    pub message: String,
    pub severity: WarningLevel,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum SessionWarningType {
    TimeRunningOut,
    SlowProgress,
    IncompleteRequiredQuestions,
    NetworkIssue,
    PerformanceIssue,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum WarningLevel {
    Info,
    Warning,
    Critical,
}