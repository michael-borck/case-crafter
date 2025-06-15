// Tauri commands for assessment workflow management

use super::models::*;
use super::workflow::AssessmentWorkflow;
use super::session::AssessmentSession;
use super::AssessmentError;
use crate::database::DatabaseManager;
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;

type AssessmentWorkflowState = Arc<RwLock<Option<AssessmentWorkflow>>>;

/// Initialize assessment workflow state
pub fn setup_assessment_workflow_state(db: DatabaseManager) -> AssessmentWorkflowState {
    let workflow = AssessmentWorkflow::new(db);
    Arc::new(RwLock::new(Some(workflow)))
}

// Assessment Workflow Commands

/// Create a new assessment workflow
#[tauri::command]
pub async fn create_assessment_workflow(
    new_workflow: NewAssessmentWorkflow,
    workflow_state: State<'_, AssessmentWorkflowState>,
) -> Result<AssessmentWorkflowModel, String> {
    let workflow_lock = workflow_state.read().await;
    if let Some(workflow) = workflow_lock.as_ref() {
        workflow.create_workflow(new_workflow).await.map_err(|e| e.to_string())
    } else {
        Err("Assessment workflow not initialized".to_string())
    }
}

/// Get assessment workflow by ID
#[tauri::command]
pub async fn get_assessment_workflow(
    id: String,
    workflow_state: State<'_, AssessmentWorkflowState>,
) -> Result<Option<AssessmentWorkflowModel>, String> {
    let workflow_lock = workflow_state.read().await;
    if let Some(workflow) = workflow_lock.as_ref() {
        workflow.repository.find_workflow_by_id(&id).await.map_err(|e| e.to_string())
    } else {
        Err("Assessment workflow not initialized".to_string())
    }
}

/// Update assessment workflow
#[tauri::command]
pub async fn update_assessment_workflow(
    id: String,
    update: UpdateAssessmentWorkflow,
    workflow_state: State<'_, AssessmentWorkflowState>,
) -> Result<Option<AssessmentWorkflowModel>, String> {
    let workflow_lock = workflow_state.read().await;
    if let Some(workflow) = workflow_lock.as_ref() {
        workflow.update_workflow(&id, update).await.map_err(|e| e.to_string())
    } else {
        Err("Assessment workflow not initialized".to_string())
    }
}

/// Delete assessment workflow
#[tauri::command]
pub async fn delete_assessment_workflow(
    id: String,
    workflow_state: State<'_, AssessmentWorkflowState>,
) -> Result<bool, String> {
    let workflow_lock = workflow_state.read().await;
    if let Some(workflow) = workflow_lock.as_ref() {
        workflow.repository.delete_workflow(&id).await.map_err(|e| e.to_string())
    } else {
        Err("Assessment workflow not initialized".to_string())
    }
}

/// List assessment workflows with filtering
#[tauri::command]
pub async fn list_assessment_workflows(
    filter: AssessmentWorkflowFilter,
    limit: i32,
    offset: i32,
    workflow_state: State<'_, AssessmentWorkflowState>,
) -> Result<Vec<AssessmentWorkflowModel>, String> {
    let workflow_lock = workflow_state.read().await;
    if let Some(workflow) = workflow_lock.as_ref() {
        workflow.repository.list_workflows(filter, limit, offset).await.map_err(|e| e.to_string())
    } else {
        Err("Assessment workflow not initialized".to_string())
    }
}

/// Publish assessment workflow
#[tauri::command]
pub async fn publish_assessment_workflow(
    id: String,
    workflow_state: State<'_, AssessmentWorkflowState>,
) -> Result<Option<AssessmentWorkflowModel>, String> {
    let workflow_lock = workflow_state.read().await;
    if let Some(workflow) = workflow_lock.as_ref() {
        workflow.publish_workflow(&id).await.map_err(|e| e.to_string())
    } else {
        Err("Assessment workflow not initialized".to_string())
    }
}

/// Archive assessment workflow
#[tauri::command]
pub async fn archive_assessment_workflow(
    id: String,
    workflow_state: State<'_, AssessmentWorkflowState>,
) -> Result<Option<AssessmentWorkflowModel>, String> {
    let workflow_lock = workflow_state.read().await;
    if let Some(workflow) = workflow_lock.as_ref() {
        workflow.archive_workflow(&id).await.map_err(|e| e.to_string())
    } else {
        Err("Assessment workflow not initialized".to_string())
    }
}

// Assessment Session Commands

/// Start a new assessment session
#[tauri::command]
pub async fn start_assessment_session(
    workflow_id: String,
    user_id: String,
    workflow_state: State<'_, AssessmentWorkflowState>,
) -> Result<AssessmentSessionModel, String> {
    let workflow_lock = workflow_state.read().await;
    if let Some(workflow) = workflow_lock.as_ref() {
        workflow.start_session(&workflow_id, &user_id).await.map_err(|e| e.to_string())
    } else {
        Err("Assessment workflow not initialized".to_string())
    }
}

/// Get assessment session by ID
#[tauri::command]
pub async fn get_assessment_session(
    session_id: String,
    workflow_state: State<'_, AssessmentWorkflowState>,
) -> Result<Option<AssessmentSessionModel>, String> {
    let workflow_lock = workflow_state.read().await;
    if let Some(workflow) = workflow_lock.as_ref() {
        workflow.repository.find_session_by_id(&session_id).await.map_err(|e| e.to_string())
    } else {
        Err("Assessment workflow not initialized".to_string())
    }
}

/// Submit answer to question in session
#[tauri::command]
pub async fn submit_assessment_answer(
    session_id: String,
    question_id: String,
    answer: ResponseAnswer,
    confidence_level: Option<i32>,
    workflow_state: State<'_, AssessmentWorkflowState>,
) -> Result<AssessmentSessionModel, String> {
    let workflow_lock = workflow_state.read().await;
    if let Some(workflow) = workflow_lock.as_ref() {
        workflow.submit_answer(&session_id, &question_id, answer, confidence_level)
            .await.map_err(|e| e.to_string())
    } else {
        Err("Assessment workflow not initialized".to_string())
    }
}

/// Navigate to specific question in session
#[tauri::command]
pub async fn navigate_to_assessment_question(
    session_id: String,
    question_id: String,
    workflow_state: State<'_, AssessmentWorkflowState>,
) -> Result<AssessmentSessionModel, String> {
    let workflow_lock = workflow_state.read().await;
    if let Some(workflow) = workflow_lock.as_ref() {
        workflow.navigate_to_question(&session_id, &question_id).await.map_err(|e| e.to_string())
    } else {
        Err("Assessment workflow not initialized".to_string())
    }
}

/// Pause assessment session
#[tauri::command]
pub async fn pause_assessment_session(
    session_id: String,
    workflow_state: State<'_, AssessmentWorkflowState>,
) -> Result<AssessmentSessionModel, String> {
    let workflow_lock = workflow_state.read().await;
    if let Some(workflow) = workflow_lock.as_ref() {
        workflow.pause_session(&session_id).await.map_err(|e| e.to_string())
    } else {
        Err("Assessment workflow not initialized".to_string())
    }
}

/// Resume assessment session
#[tauri::command]
pub async fn resume_assessment_session(
    session_id: String,
    workflow_state: State<'_, AssessmentWorkflowState>,
) -> Result<AssessmentSessionModel, String> {
    let workflow_lock = workflow_state.read().await;
    if let Some(workflow) = workflow_lock.as_ref() {
        workflow.resume_session(&session_id).await.map_err(|e| e.to_string())
    } else {
        Err("Assessment workflow not initialized".to_string())
    }
}

/// Submit assessment for final grading
#[tauri::command]
pub async fn submit_assessment_for_grading(
    session_id: String,
    workflow_state: State<'_, AssessmentWorkflowState>,
) -> std::result::Result<AssessmentResult, String> {
    let workflow_lock = workflow_state.read().await;
    if let Some(workflow) = workflow_lock.as_ref() {
        workflow.submit_assessment(&session_id).await.map_err(|e| e.to_string())
    } else {
        Err("Assessment workflow not initialized".to_string())
    }
}

/// Get assessment result for completed session
#[tauri::command]
pub async fn get_assessment_result(
    session_id: String,
    workflow_state: State<'_, AssessmentWorkflowState>,
) -> std::result::Result<AssessmentResult, String> {
    let workflow_lock = workflow_state.read().await;
    if let Some(workflow) = workflow_lock.as_ref() {
        workflow.get_assessment_result(&session_id).await.map_err(|e| e.to_string())
    } else {
        Err("Assessment workflow not initialized".to_string())
    }
}

/// Get user sessions for a workflow
#[tauri::command]
pub async fn get_user_assessment_sessions(
    workflow_id: String,
    user_id: String,
    workflow_state: State<'_, AssessmentWorkflowState>,
) -> Result<Vec<AssessmentSessionModel>, String> {
    let workflow_lock = workflow_state.read().await;
    if let Some(workflow) = workflow_lock.as_ref() {
        workflow.repository.get_user_sessions(&workflow_id, &user_id).await.map_err(|e| e.to_string())
    } else {
        Err("Assessment workflow not initialized".to_string())
    }
}

/// Get assessment statistics
#[tauri::command]
pub async fn get_assessment_statistics(
    workflow_state: State<'_, AssessmentWorkflowState>,
) -> Result<AssessmentStatistics, String> {
    let workflow_lock = workflow_state.read().await;
    if let Some(workflow) = workflow_lock.as_ref() {
        workflow.repository.get_assessment_statistics().await.map_err(|e| e.to_string())
    } else {
        Err("Assessment workflow not initialized".to_string())
    }
}

// Utility Commands

/// Create default assessment configuration
#[tauri::command]
pub async fn create_default_assessment_configuration() -> AssessmentConfiguration {
    AssessmentConfiguration::default()
}

/// Create default assessment metadata
#[tauri::command]
pub async fn create_default_assessment_metadata() -> AssessmentMetadata {
    AssessmentMetadata::default()
}

/// Create default assessment workflow filter
#[tauri::command]
pub async fn create_default_assessment_workflow_filter() -> AssessmentWorkflowFilter {
    AssessmentWorkflowFilter::default()
}

/// Create default assessment session filter
#[tauri::command]
pub async fn create_default_assessment_session_filter() -> AssessmentSessionFilter {
    AssessmentSessionFilter::default()
}

/// Validate assessment workflow data
#[tauri::command]
pub async fn validate_assessment_workflow_data(
    workflow: NewAssessmentWorkflow,
) -> Result<bool, String> {
    // Basic validation
    if workflow.title.trim().is_empty() {
        return Err("Title is required".to_string());
    }

    if workflow.estimated_duration < 1 {
        return Err("Duration must be at least 1 minute".to_string());
    }

    if workflow.learning_objectives.is_empty() {
        return Err("At least one learning objective is required".to_string());
    }

    if workflow.case_study_id.trim().is_empty() {
        return Err("Case study ID is required".to_string());
    }

    Ok(true)
}

/// Get available assessment workflow types
#[tauri::command]
pub async fn get_assessment_workflow_types() -> Vec<AssessmentWorkflowType> {
    vec![
        AssessmentWorkflowType::Sequential,
        AssessmentWorkflowType::Adaptive,
        AssessmentWorkflowType::Timed,
        AssessmentWorkflowType::Interactive,
        AssessmentWorkflowType::Portfolio,
    ]
}

/// Get available assessment workflow statuses
#[tauri::command]
pub async fn get_assessment_workflow_statuses() -> Vec<AssessmentWorkflowStatus> {
    vec![
        AssessmentWorkflowStatus::Draft,
        AssessmentWorkflowStatus::Review,
        AssessmentWorkflowStatus::Published,
        AssessmentWorkflowStatus::Archived,
    ]
}

/// Get available session states
#[tauri::command]
pub async fn get_assessment_session_states() -> Vec<SessionState> {
    vec![
        SessionState::NotStarted,
        SessionState::InProgress,
        SessionState::Paused,
        SessionState::Completed,
        SessionState::Submitted,
        SessionState::TimedOut,
        SessionState::Abandoned,
    ]
}

// Advanced Session Management

/// Get session statistics for active session
#[tauri::command]
pub async fn get_session_statistics(
    session_id: String,
    workflow_state: State<'_, AssessmentWorkflowState>,
) -> Result<super::session::SessionStatistics, String> {
    let workflow_lock = workflow_state.read().await;
    if let Some(workflow_manager) = workflow_lock.as_ref() {
        let session = workflow_manager.repository.find_session_by_id(&session_id).await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Session not found".to_string())?;

        let workflow_data = workflow_manager.repository.find_workflow_by_id(&session.workflow_id).await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Workflow not found".to_string())?;

        let session_manager = AssessmentSession::new(session, workflow_data);
        Ok(session_manager.get_session_statistics())
    } else {
        Err("Assessment workflow not initialized".to_string())
    }
}

/// Get session warnings for active session
#[tauri::command]
pub async fn get_session_warnings(
    session_id: String,
    workflow_state: State<'_, AssessmentWorkflowState>,
) -> Result<Vec<super::session::SessionWarning>, String> {
    let workflow_lock = workflow_state.read().await;
    if let Some(workflow_manager) = workflow_lock.as_ref() {
        let session = workflow_manager.repository.find_session_by_id(&session_id).await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Session not found".to_string())?;

        let workflow_data = workflow_manager.repository.find_workflow_by_id(&session.workflow_id).await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Workflow not found".to_string())?;

        let session_manager = AssessmentSession::new(session, workflow_data);
        Ok(session_manager.get_session_warnings())
    } else {
        Err("Assessment workflow not initialized".to_string())
    }
}

/// Check if session can be submitted
#[tauri::command]
pub async fn can_submit_assessment_session(
    session_id: String,
    workflow_state: State<'_, AssessmentWorkflowState>,
) -> Result<bool, String> {
    let workflow_lock = workflow_state.read().await;
    if let Some(workflow_manager) = workflow_lock.as_ref() {
        let session = workflow_manager.repository.find_session_by_id(&session_id).await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Session not found".to_string())?;

        let workflow_data = workflow_manager.repository.find_workflow_by_id(&session.workflow_id).await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Workflow not found".to_string())?;

        let session_manager = AssessmentSession::new(session, workflow_data);
        match session_manager.can_submit() {
            Ok(()) => Ok(true),
            Err(_) => Ok(false),
        }
    } else {
        Err("Assessment workflow not initialized".to_string())
    }
}

/// Bookmark question in session
#[tauri::command]
pub async fn bookmark_assessment_question(
    session_id: String,
    question_id: String,
    workflow_state: State<'_, AssessmentWorkflowState>,
) -> Result<AssessmentSessionModel, String> {
    let workflow_lock = workflow_state.read().await;
    if let Some(workflow_manager) = workflow_lock.as_ref() {
        let mut session = workflow_manager.repository.find_session_by_id(&session_id).await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Session not found".to_string())?;

        let workflow_data = workflow_manager.repository.find_workflow_by_id(&session.workflow_id).await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Workflow not found".to_string())?;

        let mut session_manager = AssessmentSession::new(session.clone(), workflow_data);
        session_manager.bookmark_question(question_id);
        
        session = session_manager.get_session().clone();
        workflow_manager.repository.update_session(&session).await.map_err(|e| e.to_string())?;
        
        Ok(session)
    } else {
        Err("Assessment workflow not initialized".to_string())
    }
}

/// Update question notes in session
#[tauri::command]
pub async fn update_assessment_question_notes(
    session_id: String,
    question_id: String,
    notes: String,
    workflow_state: State<'_, AssessmentWorkflowState>,
) -> Result<AssessmentSessionModel, String> {
    let workflow_lock = workflow_state.read().await;
    if let Some(workflow_manager) = workflow_lock.as_ref() {
        let mut session = workflow_manager.repository.find_session_by_id(&session_id).await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Session not found".to_string())?;

        let workflow_data = workflow_manager.repository.find_workflow_by_id(&session.workflow_id).await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Workflow not found".to_string())?;

        let mut session_manager = AssessmentSession::new(session.clone(), workflow_data);
        session_manager.update_question_notes(question_id, notes);
        
        session = session_manager.get_session().clone();
        workflow_manager.repository.update_session(&session).await.map_err(|e| e.to_string())?;
        
        Ok(session)
    } else {
        Err("Assessment workflow not initialized".to_string())
    }
}