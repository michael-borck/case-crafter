// Automated backup scheduler

use super::{BackupManager, BackupConfig, BackupError, Result};
use chrono::{DateTime, Utc, Duration};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use tokio::time::{interval, Duration as TokioDuration, sleep};
use tokio::task::JoinHandle;

/// Backup schedule configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupSchedule {
    pub enabled: bool,
    pub interval_hours: u64,
    pub next_backup: Option<DateTime<Utc>>,
    pub last_backup: Option<DateTime<Utc>>,
    pub retry_attempts: u32,
    pub retry_delay_minutes: u64,
}

impl Default for BackupSchedule {
    fn default() -> Self {
        Self {
            enabled: true,
            interval_hours: 24,
            next_backup: None,
            last_backup: None,
            retry_attempts: 3,
            retry_delay_minutes: 30,
        }
    }
}

/// Backup scheduler status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SchedulerStatus {
    Stopped,
    Running,
    Paused,
    Error(String),
}

/// Statistics for the backup scheduler
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchedulerStats {
    pub status: SchedulerStatus,
    pub total_scheduled_backups: u64,
    pub successful_backups: u64,
    pub failed_backups: u64,
    pub last_backup_time: Option<DateTime<Utc>>,
    pub next_backup_time: Option<DateTime<Utc>>,
    pub uptime_hours: f64,
}

/// Event types for backup scheduler
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BackupEvent {
    BackupStarted { timestamp: DateTime<Utc> },
    BackupCompleted { timestamp: DateTime<Utc>, backup_id: String, size_bytes: u64 },
    BackupFailed { timestamp: DateTime<Utc>, error: String, retry_count: u32 },
    SchedulerStarted { timestamp: DateTime<Utc> },
    SchedulerStopped { timestamp: DateTime<Utc> },
    SchedulerPaused { timestamp: DateTime<Utc> },
    SchedulerResumed { timestamp: DateTime<Utc> },
    ConfigurationChanged { timestamp: DateTime<Utc> },
}

/// Backup scheduler for automated backups
pub struct BackupScheduler {
    backup_manager: Arc<BackupManager>,
    schedule: Arc<RwLock<BackupSchedule>>,
    status: Arc<RwLock<SchedulerStatus>>,
    stats: Arc<RwLock<SchedulerStats>>,
    task_handle: Arc<Mutex<Option<JoinHandle<()>>>>,
    event_log: Arc<RwLock<Vec<BackupEvent>>>,
    started_at: Option<DateTime<Utc>>,
}

impl BackupScheduler {
    /// Create a new backup scheduler
    pub fn new(backup_manager: Arc<BackupManager>) -> Self {
        Self {
            backup_manager,
            schedule: Arc::new(RwLock::new(BackupSchedule::default())),
            status: Arc::new(RwLock::new(SchedulerStatus::Stopped)),
            stats: Arc::new(RwLock::new(SchedulerStats {
                status: SchedulerStatus::Stopped,
                total_scheduled_backups: 0,
                successful_backups: 0,
                failed_backups: 0,
                last_backup_time: None,
                next_backup_time: None,
                uptime_hours: 0.0,
            })),
            task_handle: Arc::new(Mutex::new(None)),
            event_log: Arc::new(RwLock::new(Vec::new())),
            started_at: None,
        }
    }

    /// Start the backup scheduler
    pub async fn start(&mut self) -> Result<()> {
        let mut task_handle = self.task_handle.lock().await;
        
        // Stop existing task if running
        if let Some(handle) = task_handle.take() {
            handle.abort();
        }

        // Update status
        *self.status.write().await = SchedulerStatus::Running;
        self.started_at = Some(Utc::now());

        // Log event
        self.log_event(BackupEvent::SchedulerStarted { 
            timestamp: Utc::now() 
        }).await;

        // Calculate next backup time
        self.update_next_backup_time().await;

        // Start scheduler task
        let backup_manager = Arc::clone(&self.backup_manager);
        let schedule = Arc::clone(&self.schedule);
        let status = Arc::clone(&self.status);
        let stats = Arc::clone(&self.stats);
        let event_log = Arc::clone(&self.event_log);

        let handle = tokio::spawn(async move {
            Self::scheduler_loop(backup_manager, schedule, status, stats, event_log).await;
        });

        *task_handle = Some(handle);
        
        println!("Backup scheduler started");
        Ok(())
    }

    /// Stop the backup scheduler
    pub async fn stop(&mut self) -> Result<()> {
        let mut task_handle = self.task_handle.lock().await;
        
        if let Some(handle) = task_handle.take() {
            handle.abort();
        }

        *self.status.write().await = SchedulerStatus::Stopped;
        
        self.log_event(BackupEvent::SchedulerStopped { 
            timestamp: Utc::now() 
        }).await;

        println!("Backup scheduler stopped");
        Ok(())
    }

    /// Pause the backup scheduler
    pub async fn pause(&self) -> Result<()> {
        *self.status.write().await = SchedulerStatus::Paused;
        
        self.log_event(BackupEvent::SchedulerPaused { 
            timestamp: Utc::now() 
        }).await;

        println!("Backup scheduler paused");
        Ok(())
    }

    /// Resume the backup scheduler
    pub async fn resume(&self) -> Result<()> {
        *self.status.write().await = SchedulerStatus::Running;
        
        self.log_event(BackupEvent::SchedulerResumed { 
            timestamp: Utc::now() 
        }).await;

        self.update_next_backup_time().await;
        
        println!("Backup scheduler resumed");
        Ok(())
    }

    /// Update backup schedule configuration
    pub async fn update_schedule(&self, new_schedule: BackupSchedule) -> Result<()> {
        *self.schedule.write().await = new_schedule;
        
        self.log_event(BackupEvent::ConfigurationChanged { 
            timestamp: Utc::now() 
        }).await;

        self.update_next_backup_time().await;
        
        println!("Backup schedule updated");
        Ok(())
    }

    /// Get current scheduler status
    pub async fn get_status(&self) -> SchedulerStatus {
        self.status.read().await.clone()
    }

    /// Get current backup schedule
    pub async fn get_schedule(&self) -> BackupSchedule {
        self.schedule.read().await.clone()
    }

    /// Get scheduler statistics
    pub async fn get_stats(&self) -> SchedulerStats {
        let mut stats = self.stats.read().await.clone();
        
        // Update uptime if running
        if let Some(started_at) = self.started_at {
            if matches!(stats.status, SchedulerStatus::Running) {
                let uptime = Utc::now().signed_duration_since(started_at);
                stats.uptime_hours = uptime.num_milliseconds() as f64 / (1000.0 * 60.0 * 60.0);
            }
        }

        stats
    }

    /// Get recent backup events
    pub async fn get_recent_events(&self, limit: usize) -> Vec<BackupEvent> {
        let event_log = self.event_log.read().await;
        let start_index = if event_log.len() > limit {
            event_log.len() - limit
        } else {
            0
        };
        event_log[start_index..].to_vec()
    }

    /// Trigger an immediate backup
    pub async fn trigger_backup(&self, description: Option<String>) -> Result<()> {
        self.log_event(BackupEvent::BackupStarted { 
            timestamp: Utc::now() 
        }).await;

        match self.backup_manager.create_backup(description).await {
            Ok(backup_info) => {
                // Update stats
                {
                    let mut stats = self.stats.write().await;
                    stats.successful_backups += 1;
                    stats.last_backup_time = Some(backup_info.metadata.created_at);
                }

                // Update schedule
                {
                    let mut schedule = self.schedule.write().await;
                    schedule.last_backup = Some(backup_info.metadata.created_at);
                }

                self.log_event(BackupEvent::BackupCompleted {
                    timestamp: backup_info.metadata.created_at,
                    backup_id: backup_info.metadata.id,
                    size_bytes: backup_info.file_size,
                }).await;

                self.update_next_backup_time().await;
                
                println!("Manual backup completed successfully");
                Ok(())
            }
            Err(e) => {
                // Update stats
                {
                    let mut stats = self.stats.write().await;
                    stats.failed_backups += 1;
                }

                self.log_event(BackupEvent::BackupFailed {
                    timestamp: Utc::now(),
                    error: e.to_string(),
                    retry_count: 0,
                }).await;

                Err(e)
            }
        }
    }

    // Private helper methods

    async fn scheduler_loop(
        backup_manager: Arc<BackupManager>,
        schedule: Arc<RwLock<BackupSchedule>>,
        status: Arc<RwLock<SchedulerStatus>>,
        stats: Arc<RwLock<SchedulerStats>>,
        event_log: Arc<RwLock<Vec<BackupEvent>>>,
    ) {
        let mut check_interval = interval(TokioDuration::from_secs(60)); // Check every minute

        loop {
            check_interval.tick().await;

            // Check if scheduler is running
            let current_status = status.read().await.clone();
            match current_status {
                SchedulerStatus::Stopped => break,
                SchedulerStatus::Paused => continue,
                SchedulerStatus::Error(_) => continue,
                SchedulerStatus::Running => {}
            }

            // Check if backup is needed
            let schedule_data = schedule.read().await.clone();
            if !schedule_data.enabled {
                continue;
            }

            if let Some(next_backup) = schedule_data.next_backup {
                if Utc::now() >= next_backup {
                    // Time for a backup
                    Self::perform_scheduled_backup(
                        &backup_manager,
                        &schedule,
                        &stats,
                        &event_log,
                    ).await;
                }
            }
        }
    }

    async fn perform_scheduled_backup(
        backup_manager: &Arc<BackupManager>,
        schedule: &Arc<RwLock<BackupSchedule>>,
        stats: &Arc<RwLock<SchedulerStats>>,
        event_log: &Arc<RwLock<Vec<BackupEvent>>>,
    ) {
        let mut retry_count = 0;
        let max_retries = schedule.read().await.retry_attempts;
        let retry_delay = schedule.read().await.retry_delay_minutes;

        // Log backup start
        Self::log_event_static(
            event_log,
            BackupEvent::BackupStarted { timestamp: Utc::now() }
        ).await;

        // Update stats
        {
            let mut stats = stats.write().await;
            stats.total_scheduled_backups += 1;
        }

        loop {
            match backup_manager.create_backup(Some("Scheduled backup".to_string())).await {
                Ok(backup_info) => {
                    // Success - update stats and schedule
                    {
                        let mut stats = stats.write().await;
                        stats.successful_backups += 1;
                        stats.last_backup_time = Some(backup_info.metadata.created_at);
                    }

                    {
                        let mut schedule_data = schedule.write().await;
                        schedule_data.last_backup = Some(backup_info.metadata.created_at);
                        // Calculate next backup time
                        schedule_data.next_backup = Some(
                            backup_info.metadata.created_at + Duration::hours(schedule_data.interval_hours as i64)
                        );
                    }

                    Self::log_event_static(
                        event_log,
                        BackupEvent::BackupCompleted {
                            timestamp: backup_info.metadata.created_at,
                            backup_id: backup_info.metadata.id,
                            size_bytes: backup_info.file_size,
                        }
                    ).await;

                    println!("Scheduled backup completed successfully");
                    break;
                }
                Err(e) => {
                    retry_count += 1;
                    
                    Self::log_event_static(
                        event_log,
                        BackupEvent::BackupFailed {
                            timestamp: Utc::now(),
                            error: e.to_string(),
                            retry_count,
                        }
                    ).await;

                    if retry_count >= max_retries {
                        // Max retries reached - update stats and schedule next attempt
                        {
                            let mut stats = stats.write().await;
                            stats.failed_backups += 1;
                        }

                        {
                            let mut schedule_data = schedule.write().await;
                            // Schedule next attempt in the normal interval
                            schedule_data.next_backup = Some(
                                Utc::now() + Duration::hours(schedule_data.interval_hours as i64)
                            );
                        }

                        eprintln!("Scheduled backup failed after {} retries: {}", max_retries, e);
                        break;
                    } else {
                        // Wait before retry
                        println!("Backup failed, retrying in {} minutes (attempt {}/{})", retry_delay, retry_count, max_retries);
                        sleep(TokioDuration::from_secs(retry_delay * 60)).await;
                    }
                }
            }
        }
    }

    async fn update_next_backup_time(&self) {
        let mut schedule = self.schedule.write().await;
        
        if schedule.enabled {
            let next_time = if let Some(last_backup) = schedule.last_backup {
                last_backup + Duration::hours(schedule.interval_hours as i64)
            } else {
                // No previous backup, schedule for now + interval
                Utc::now() + Duration::hours(schedule.interval_hours as i64)
            };
            
            schedule.next_backup = Some(next_time);
        } else {
            schedule.next_backup = None;
        }
    }

    async fn log_event(&self, event: BackupEvent) {
        Self::log_event_static(&self.event_log, event).await;
    }

    async fn log_event_static(event_log: &Arc<RwLock<Vec<BackupEvent>>>, event: BackupEvent) {
        let mut log = event_log.write().await;
        log.push(event);
        
        // Keep only last 1000 events
        if log.len() > 1000 {
            log.drain(0..100); // Remove oldest 100 events
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_backup_schedule_default() {
        let schedule = BackupSchedule::default();
        assert!(schedule.enabled);
        assert_eq!(schedule.interval_hours, 24);
        assert_eq!(schedule.retry_attempts, 3);
        assert_eq!(schedule.retry_delay_minutes, 30);
    }

    #[test]
    fn test_backup_event_serialization() {
        let event = BackupEvent::BackupCompleted {
            timestamp: Utc::now(),
            backup_id: "test-123".to_string(),
            size_bytes: 1024,
        };

        let json = serde_json::to_string(&event).unwrap();
        let deserialized: BackupEvent = serde_json::from_str(&json).unwrap();
        
        match (event, deserialized) {
            (BackupEvent::BackupCompleted { backup_id: id1, .. }, 
             BackupEvent::BackupCompleted { backup_id: id2, .. }) => {
                assert_eq!(id1, id2);
            }
            _ => panic!("Event serialization failed"),
        }
    }
}