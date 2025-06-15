// Tauri commands for case study management

use super::manager::CaseStudyManager;
use super::models::*;
use super::{CaseStudyError, Result as CaseStudyResult};
use crate::database::DatabaseManager;
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;

type CaseStudyManagerState = Arc<RwLock<Option<CaseStudyManager>>>;

/// Initialize case study manager state
pub fn setup_case_study_manager_state(db: DatabaseManager) -> CaseStudyManagerState {
    let manager = CaseStudyManager::new(db);
    Arc::new(RwLock::new(Some(manager)))
}

/// Create a new case study
#[tauri::command]
pub async fn create_case_study(
    new_case_study: NewCaseStudy,
    manager_state: State<'_, CaseStudyManagerState>,
) -> Result<CaseStudy, String> {
    let manager_lock = manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.create_case_study(new_case_study).await.map_err(|e| e.to_string())
    } else {
        Err("Case study manager not initialized".to_string())
    }
}

/// Get case study by ID
#[tauri::command]
pub async fn get_case_study(
    id: String,
    manager_state: State<'_, CaseStudyManagerState>,
) -> Result<Option<CaseStudy>, String> {
    let manager_lock = manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.get_case_study(&id).await.map_err(|e| e.to_string())
    } else {
        Err("Case study manager not initialized".to_string())
    }
}

/// Update case study
#[tauri::command]
pub async fn update_case_study(
    id: String,
    update: UpdateCaseStudy,
    manager_state: State<'_, CaseStudyManagerState>,
) -> Result<Option<CaseStudy>, String> {
    let manager_lock = manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.update_case_study(&id, update).await.map_err(|e| e.to_string())
    } else {
        Err("Case study manager not initialized".to_string())
    }
}

/// Delete case study
#[tauri::command]
pub async fn delete_case_study(
    id: String,
    manager_state: State<'_, CaseStudyManagerState>,
) -> Result<bool, String> {
    let manager_lock = manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.delete_case_study(&id).await.map_err(|e| e.to_string())
    } else {
        Err("Case study manager not initialized".to_string())
    }
}

/// List case studies with filtering and pagination
#[tauri::command]
pub async fn list_case_studies(
    filter: Option<CaseStudyFilter>,
    limit: Option<i32>,
    offset: Option<i32>,
    manager_state: State<'_, CaseStudyManagerState>,
) -> Result<Vec<CaseStudy>, String> {
    let manager_lock = manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        let filter = filter.unwrap_or_default();
        let limit = limit.unwrap_or(20);
        let offset = offset.unwrap_or(0);
        
        manager.list_case_studies(filter, limit, offset).await.map_err(|e| e.to_string())
    } else {
        Err("Case study manager not initialized".to_string())
    }
}

/// Search case studies
#[tauri::command]
pub async fn search_case_studies(
    query: CaseStudySearchQuery,
    manager_state: State<'_, CaseStudyManagerState>,
) -> Result<Vec<CaseStudy>, String> {
    let manager_lock = manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.search_case_studies(query).await.map_err(|e| e.to_string())
    } else {
        Err("Case study manager not initialized".to_string())
    }
}

/// Publish case study
#[tauri::command]
pub async fn publish_case_study(
    id: String,
    manager_state: State<'_, CaseStudyManagerState>,
) -> Result<Option<CaseStudy>, String> {
    let manager_lock = manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.publish_case_study(&id).await.map_err(|e| e.to_string())
    } else {
        Err("Case study manager not initialized".to_string())
    }
}

/// Archive case study
#[tauri::command]
pub async fn archive_case_study(
    id: String,
    manager_state: State<'_, CaseStudyManagerState>,
) -> Result<Option<CaseStudy>, String> {
    let manager_lock = manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.archive_case_study(&id).await.map_err(|e| e.to_string())
    } else {
        Err("Case study manager not initialized".to_string())
    }
}

/// Restore archived case study
#[tauri::command]
pub async fn restore_case_study(
    id: String,
    manager_state: State<'_, CaseStudyManagerState>,
) -> Result<Option<CaseStudy>, String> {
    let manager_lock = manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.restore_case_study(&id).await.map_err(|e| e.to_string())
    } else {
        Err("Case study manager not initialized".to_string())
    }
}

/// Duplicate case study
#[tauri::command]
pub async fn duplicate_case_study(
    id: String,
    new_title: Option<String>,
    manager_state: State<'_, CaseStudyManagerState>,
) -> Result<CaseStudy, String> {
    let manager_lock = manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.duplicate_case_study(&id, new_title).await.map_err(|e| e.to_string())
    } else {
        Err("Case study manager not initialized".to_string())
    }
}

/// Get case study versions
#[tauri::command]
pub async fn get_case_study_versions(
    case_study_id: String,
    manager_state: State<'_, CaseStudyManagerState>,
) -> Result<Vec<CaseStudyVersion>, String> {
    let manager_lock = manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.get_case_study_versions(&case_study_id).await.map_err(|e| e.to_string())
    } else {
        Err("Case study manager not initialized".to_string())
    }
}

/// Get specific version of case study
#[tauri::command]
pub async fn get_case_study_version(
    case_study_id: String,
    version: i32,
    manager_state: State<'_, CaseStudyManagerState>,
) -> Result<Option<CaseStudyVersion>, String> {
    let manager_lock = manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.get_case_study_version(&case_study_id, version).await.map_err(|e| e.to_string())
    } else {
        Err("Case study manager not initialized".to_string())
    }
}

/// Restore case study to specific version
#[tauri::command]
pub async fn restore_to_version(
    case_study_id: String,
    version: i32,
    manager_state: State<'_, CaseStudyManagerState>,
) -> Result<Option<CaseStudy>, String> {
    let manager_lock = manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.restore_to_version(&case_study_id, version).await.map_err(|e| e.to_string())
    } else {
        Err("Case study manager not initialized".to_string())
    }
}

/// Get case study statistics
#[tauri::command]
pub async fn get_case_study_statistics(
    manager_state: State<'_, CaseStudyManagerState>,
) -> Result<CaseStudyStatistics, String> {
    let manager_lock = manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.get_statistics().await.map_err(|e| e.to_string())
    } else {
        Err("Case study manager not initialized".to_string())
    }
}

/// Get recent case studies
#[tauri::command]
pub async fn get_recent_case_studies(
    limit: Option<i32>,
    manager_state: State<'_, CaseStudyManagerState>,
) -> Result<Vec<CaseStudy>, String> {
    let manager_lock = manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        let limit = limit.unwrap_or(10);
        manager.get_recent_case_studies(limit).await.map_err(|e| e.to_string())
    } else {
        Err("Case study manager not initialized".to_string())
    }
}

/// Get case studies by category
#[tauri::command]
pub async fn get_case_studies_by_category(
    category_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
    manager_state: State<'_, CaseStudyManagerState>,
) -> Result<Vec<CaseStudy>, String> {
    let manager_lock = manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        let limit = limit.unwrap_or(20);
        let offset = offset.unwrap_or(0);
        manager.get_case_studies_by_category(&category_id, limit, offset).await.map_err(|e| e.to_string())
    } else {
        Err("Case study manager not initialized".to_string())
    }
}

/// Get case studies by status
#[tauri::command]
pub async fn get_case_studies_by_status(
    status: String,
    limit: Option<i32>,
    offset: Option<i32>,
    manager_state: State<'_, CaseStudyManagerState>,
) -> Result<Vec<CaseStudy>, String> {
    let manager_lock = manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        let status: CaseStudyStatus = status.parse().map_err(|e| format!("Invalid status: {}", e))?;
        let limit = limit.unwrap_or(20);
        let offset = offset.unwrap_or(0);
        manager.get_case_studies_by_status(status, limit, offset).await.map_err(|e| e.to_string())
    } else {
        Err("Case study manager not initialized".to_string())
    }
}

/// Count case studies matching filter
#[tauri::command]
pub async fn count_case_studies(
    filter: Option<CaseStudyFilter>,
    manager_state: State<'_, CaseStudyManagerState>,
) -> Result<i32, String> {
    let manager_lock = manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        let filter = filter.unwrap_or_default();
        manager.count_case_studies(filter).await.map_err(|e| e.to_string())
    } else {
        Err("Case study manager not initialized".to_string())
    }
}

/// Check if case study exists
#[tauri::command]
pub async fn case_study_exists(
    id: String,
    manager_state: State<'_, CaseStudyManagerState>,
) -> Result<bool, String> {
    let manager_lock = manager_state.read().await;
    if let Some(manager) = manager_lock.as_ref() {
        manager.case_study_exists(&id).await.map_err(|e| e.to_string())
    } else {
        Err("Case study manager not initialized".to_string())
    }
}

/// Create default case study metadata
#[tauri::command]
pub async fn create_default_case_study_metadata() -> Result<CaseStudyMetadata, String> {
    Ok(CaseStudyMetadata::default())
}

/// Create default case study filter
#[tauri::command]
pub async fn create_default_case_study_filter() -> Result<CaseStudyFilter, String> {
    Ok(CaseStudyFilter::default())
}

/// Create default search query
#[tauri::command]
pub async fn create_default_search_query() -> Result<CaseStudySearchQuery, String> {
    Ok(CaseStudySearchQuery::default())
}

/// Get available case study statuses
#[tauri::command]
pub async fn get_case_study_statuses() -> Result<Vec<String>, String> {
    Ok(vec![
        "draft".to_string(),
        "review".to_string(),
        "published".to_string(),
        "archived".to_string(),
    ])
}

/// Validate case study data
#[tauri::command]
pub async fn validate_case_study_data(
    case_study: NewCaseStudy,
) -> Result<Vec<String>, String> {
    let mut errors = Vec::new();

    // Title validation
    if case_study.title.trim().is_empty() {
        errors.push("Title cannot be empty".to_string());
    }
    if case_study.title.len() > 200 {
        errors.push("Title too long (max 200 characters)".to_string());
    }

    // Content validation
    if case_study.content.trim().is_empty() {
        errors.push("Content cannot be empty".to_string());
    }
    if case_study.content.len() < 100 {
        errors.push("Content too short (minimum 100 characters)".to_string());
    }

    // Industry validation
    if case_study.industry.trim().is_empty() {
        errors.push("Industry cannot be empty".to_string());
    }

    // Duration validation
    if case_study.duration_minutes <= 0 {
        errors.push("Duration must be positive".to_string());
    }
    if case_study.duration_minutes > 480 {
        errors.push("Duration cannot exceed 8 hours".to_string());
    }

    // Learning objectives validation
    if case_study.learning_objectives.is_empty() {
        errors.push("At least one learning objective is required".to_string());
    }
    if case_study.learning_objectives.len() > 10 {
        errors.push("Too many learning objectives (max 10)".to_string());
    }
    for objective in &case_study.learning_objectives {
        if objective.trim().is_empty() {
            errors.push("Learning objectives cannot be empty".to_string());
            break;
        }
    }

    Ok(errors)
}

/// Validate update data
#[tauri::command]
pub async fn validate_case_study_update_data(
    update: UpdateCaseStudy,
) -> Result<Vec<String>, String> {
    let mut errors = Vec::new();

    if let Some(ref title) = update.title {
        if title.trim().is_empty() {
            errors.push("Title cannot be empty".to_string());
        }
        if title.len() > 200 {
            errors.push("Title too long (max 200 characters)".to_string());
        }
    }

    if let Some(ref content) = update.content {
        if content.trim().is_empty() {
            errors.push("Content cannot be empty".to_string());
        }
        if content.len() < 100 {
            errors.push("Content too short (minimum 100 characters)".to_string());
        }
    }

    if let Some(ref industry) = update.industry {
        if industry.trim().is_empty() {
            errors.push("Industry cannot be empty".to_string());
        }
    }

    if let Some(duration) = update.duration_minutes {
        if duration <= 0 {
            errors.push("Duration must be positive".to_string());
        }
        if duration > 480 {
            errors.push("Duration cannot exceed 8 hours".to_string());
        }
    }

    if let Some(ref objectives) = update.learning_objectives {
        if objectives.is_empty() {
            errors.push("At least one learning objective is required".to_string());
        }
        if objectives.len() > 10 {
            errors.push("Too many learning objectives (max 10)".to_string());
        }
        for objective in objectives {
            if objective.trim().is_empty() {
                errors.push("Learning objectives cannot be empty".to_string());
                break;
            }
        }
    }

    Ok(errors)
}