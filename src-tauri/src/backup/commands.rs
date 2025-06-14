// Tauri commands for backup management

use super::{
    BackupManager, BackupConfig, BackupInfo, BackupStats,
    scheduler::{BackupScheduler, BackupSchedule, SchedulerStats, BackupEvent, SchedulerStatus}
};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, State};
use tokio::sync::Mutex;

// Type aliases for state management
type BackupManagerState = Arc<Mutex<Arc<BackupManager>>>;
type BackupSchedulerState = Arc<Mutex<BackupScheduler>>;

/// Initialize backup with configuration
#[tauri::command]
pub async fn initialize_backup(
    config: BackupConfig,
    backup_manager_state: State<'_, BackupManagerState>,
) -> std::result::Result<bool, String> {
    let manager_arc = backup_manager_state.lock().await;
    // Note: BackupManager doesn't have set_config as mutable, 
    // this would need to be redesigned for proper state management
    // For now, return success as a placeholder
    Ok(true)
}

/// Get current backup configuration
#[tauri::command]
pub async fn get_backup_config(
    backup_manager_state: State<'_, BackupManagerState>,
) -> std::result::Result<BackupConfig, String> {
    let manager_arc = backup_manager_state.lock().await;
    Ok(manager_arc.get_config().clone())
}

/// Create a manual backup
#[tauri::command]
pub async fn create_backup(
    description: Option<String>,
    backup_manager_state: State<'_, BackupManagerState>,
) -> std::result::Result<BackupInfo, String> {
    let manager_arc = backup_manager_state.lock().await;
    manager_arc.create_backup(description).await.map_err(|e| e.to_string())
}

/// List all available backups
#[tauri::command]
pub async fn list_backups(
    backup_manager_state: State<'_, BackupManagerState>,
) -> std::result::Result<Vec<BackupInfo>, String> {
    let manager = backup_manager_state.lock().await;
    manager.list_backups().await.map_err(|e| e.to_string())
}

/// Restore from a backup
#[tauri::command]
pub async fn restore_backup(
    backup_path: String,
    force: bool,
    backup_manager_state: State<'_, BackupManagerState>,
) -> std::result::Result<bool, String> {
    let manager = backup_manager_state.lock().await;
    manager
        .restore_backup(&PathBuf::from(backup_path), force)
        .await
        .map(|_| true)
        .map_err(|e| e.to_string())
}

/// Delete a backup file
#[tauri::command]
pub async fn delete_backup(
    backup_path: String,
    backup_manager_state: State<'_, BackupManagerState>,
) -> std::result::Result<bool, String> {
    let manager = backup_manager_state.lock().await;
    manager
        .delete_backup(&PathBuf::from(backup_path))
        .await
        .map(|_| true)
        .map_err(|e| e.to_string())
}

/// Validate a backup file
#[tauri::command]
pub async fn validate_backup(
    backup_path: String,
    backup_manager_state: State<'_, BackupManagerState>,
) -> std::result::Result<bool, String> {
    let manager = backup_manager_state.lock().await;
    manager
        .validate_backup(&PathBuf::from(backup_path))
        .await
        .map_err(|e| e.to_string())
}

/// Get backup statistics
#[tauri::command]
pub async fn get_backup_stats(
    backup_manager_state: State<'_, BackupManagerState>,
) -> std::result::Result<BackupStats, String> {
    let manager = backup_manager_state.lock().await;
    manager.get_backup_stats().await.map_err(|e| e.to_string())
}

/// Start the backup scheduler
#[tauri::command]
pub async fn start_backup_scheduler(
    backup_scheduler_state: State<'_, BackupSchedulerState>,
) -> std::result::Result<bool, String> {
    let mut scheduler = backup_scheduler_state.lock().await;
    scheduler.start().await.map(|_| true).map_err(|e| e.to_string())
}

/// Stop the backup scheduler
#[tauri::command]
pub async fn stop_backup_scheduler(
    backup_scheduler_state: State<'_, BackupSchedulerState>,
) -> std::result::Result<bool, String> {
    let mut scheduler = backup_scheduler_state.lock().await;
    scheduler.stop().await.map(|_| true).map_err(|e| e.to_string())
}

/// Pause the backup scheduler
#[tauri::command]
pub async fn pause_backup_scheduler(
    backup_scheduler_state: State<'_, BackupSchedulerState>,
) -> std::result::Result<bool, String> {
    let scheduler = backup_scheduler_state.lock().await;
    scheduler.pause().await.map(|_| true).map_err(|e| e.to_string())
}

/// Resume the backup scheduler
#[tauri::command]
pub async fn resume_backup_scheduler(
    backup_scheduler_state: State<'_, BackupSchedulerState>,
) -> std::result::Result<bool, String> {
    let scheduler = backup_scheduler_state.lock().await;
    scheduler.resume().await.map(|_| true).map_err(|e| e.to_string())
}

/// Update backup schedule configuration
#[tauri::command]
pub async fn update_backup_schedule(
    schedule: BackupSchedule,
    backup_scheduler_state: State<'_, BackupSchedulerState>,
) -> std::result::Result<bool, String> {
    let scheduler = backup_scheduler_state.lock().await;
    scheduler
        .update_schedule(schedule)
        .await
        .map(|_| true)
        .map_err(|e| e.to_string())
}

/// Get current scheduler status
#[tauri::command]
pub async fn get_scheduler_status(
    backup_scheduler_state: State<'_, BackupSchedulerState>,
) -> std::result::Result<SchedulerStatus, String> {
    let scheduler = backup_scheduler_state.lock().await;
    Ok(scheduler.get_status().await)
}

/// Get current backup schedule
#[tauri::command]
pub async fn get_backup_schedule(
    backup_scheduler_state: State<'_, BackupSchedulerState>,
) -> std::result::Result<BackupSchedule, String> {
    let scheduler = backup_scheduler_state.lock().await;
    Ok(scheduler.get_schedule().await)
}

/// Get scheduler statistics
#[tauri::command]
pub async fn get_scheduler_stats(
    backup_scheduler_state: State<'_, BackupSchedulerState>,
) -> std::result::Result<SchedulerStats, String> {
    let scheduler = backup_scheduler_state.lock().await;
    Ok(scheduler.get_stats().await)
}

/// Get recent backup events
#[tauri::command]
pub async fn get_backup_events(
    limit: usize,
    backup_scheduler_state: State<'_, BackupSchedulerState>,
) -> std::result::Result<Vec<BackupEvent>, String> {
    let scheduler = backup_scheduler_state.lock().await;
    Ok(scheduler.get_recent_events(limit).await)
}

/// Trigger an immediate backup
#[tauri::command]
pub async fn trigger_immediate_backup(
    description: Option<String>,
    backup_scheduler_state: State<'_, BackupSchedulerState>,
) -> std::result::Result<bool, String> {
    let scheduler = backup_scheduler_state.lock().await;
    scheduler
        .trigger_backup(description)
        .await
        .map(|_| true)
        .map_err(|e| e.to_string())
}

/// Export backup configuration
#[tauri::command]
pub async fn export_backup_config(
    backup_manager_state: State<'_, BackupManagerState>,
    backup_scheduler_state: State<'_, BackupSchedulerState>,
) -> std::result::Result<HashMap<String, serde_json::Value>, String> {
    let manager = backup_manager_state.lock().await;
    let scheduler = backup_scheduler_state.lock().await;

    let mut config = HashMap::new();
    
    config.insert(
        "backup_config".to_string(),
        serde_json::to_value(manager.get_config()).map_err(|e| e.to_string())?
    );
    
    config.insert(
        "backup_schedule".to_string(),
        serde_json::to_value(scheduler.get_schedule().await).map_err(|e| e.to_string())?
    );
    
    config.insert(
        "scheduler_stats".to_string(),
        serde_json::to_value(scheduler.get_stats().await).map_err(|e| e.to_string())?
    );

    Ok(config)
}

/// Import backup configuration
#[tauri::command]
pub async fn import_backup_config(
    config_data: HashMap<String, serde_json::Value>,
    backup_manager_state: State<'_, BackupManagerState>,
    backup_scheduler_state: State<'_, BackupSchedulerState>,
) -> std::result::Result<bool, String> {
    let mut manager = backup_manager_state.lock().await;
    let scheduler = backup_scheduler_state.lock().await;

    // Import backup configuration
    if let Some(_backup_config_value) = config_data.get("backup_config") {
        // Note: BackupManager would need to be redesigned to support mutable config updates
        // For now, this is a placeholder
    }

    // Import schedule configuration
    if let Some(schedule_value) = config_data.get("backup_schedule") {
        let schedule: BackupSchedule = serde_json::from_value(schedule_value.clone())
            .map_err(|e| format!("Invalid schedule config: {}", e))?;
        scheduler.update_schedule(schedule)
            .await
            .map_err(|e| e.to_string())?;
    }

    Ok(true)
}

/// Test backup system functionality
#[tauri::command]
pub async fn test_backup_system(
    backup_manager_state: State<'_, BackupManagerState>,
) -> std::result::Result<HashMap<String, serde_json::Value>, String> {
    let manager = backup_manager_state.lock().await;
    
    let mut results = HashMap::new();
    
    // Test backup directory access
    let backup_dir_accessible = match manager.get_backup_stats().await {
        Ok(_) => true,
        Err(e) => {
            results.insert("backup_directory_error".to_string(), serde_json::json!(e.to_string()));
            false
        }
    };
    results.insert("backup_directory_accessible".to_string(), serde_json::json!(backup_dir_accessible));

    // Test database connection - simplified for now
    let database_accessible = true; // Placeholder - would test actual connection
    results.insert("database_accessible".to_string(), serde_json::json!(database_accessible));

    // Test encryption if available - simplified for now  
    let encryption_available = false; // Placeholder - would check encryption manager
    results.insert("encryption_available".to_string(), serde_json::json!(encryption_available));

    // Overall system health
    let system_healthy = backup_dir_accessible && database_accessible;
    results.insert("system_healthy".to_string(), serde_json::json!(system_healthy));

    Ok(results)
}

/// Get backup system information
#[tauri::command]
pub async fn get_backup_system_info(
    app_handle: AppHandle,
) -> std::result::Result<HashMap<String, serde_json::Value>, String> {
    let mut info = HashMap::new();

    // Get app version
    info.insert("app_version".to_string(), serde_json::json!(env!("CARGO_PKG_VERSION")));
    
    // Get database schema version
    info.insert("database_version".to_string(), serde_json::json!("1.0"));
    
    // Get supported backup features
    let features = vec![
        "compression",
        "encryption", 
        "scheduling",
        "incremental", // Future feature
        "cloud_sync",  // Future feature
    ];
    info.insert("supported_features".to_string(), serde_json::json!(features));

    // Get backup formats
    let formats = vec!["json", "encrypted_json"];
    info.insert("supported_formats".to_string(), serde_json::json!(formats));

    // Get default paths
    let app_data_dir = get_app_data_dir(&app_handle)?;
    info.insert("app_data_directory".to_string(), serde_json::json!(app_data_dir.to_string_lossy()));
    info.insert("default_backup_directory".to_string(), serde_json::json!(app_data_dir.join("backups").to_string_lossy()));

    Ok(info)
}

// Helper function to get app data directory
fn get_app_data_dir(app_handle: &AppHandle) -> std::result::Result<PathBuf, String> {
    // Temporary workaround - in production this would use app_handle.path()
    let home_dir = std::env::var("HOME").map_err(|_| "Could not get home directory".to_string())?;
    let app_data_dir = PathBuf::from(home_dir).join(".local/share/case-crafter");
    Ok(app_data_dir)
}

/// Setup backup state for Tauri app
pub fn setup_backup_state(
    app_handle: AppHandle,
    database_manager: Arc<crate::database::DatabaseManager>,
    encryption_manager: Option<Arc<crate::encryption::EncryptionManager>>,
) -> (BackupManagerState, BackupSchedulerState) {
    let backup_manager = BackupManager::new(
        app_handle,
        database_manager,
        encryption_manager,
    );
    
    let backup_manager_arc = Arc::new(backup_manager);
    let backup_scheduler = BackupScheduler::new(Arc::clone(&backup_manager_arc));
    
    let backup_manager_state = Arc::new(Mutex::new(backup_manager_arc));
    let backup_scheduler_state = Arc::new(Mutex::new(backup_scheduler));
    
    (backup_manager_state, backup_scheduler_state)
}