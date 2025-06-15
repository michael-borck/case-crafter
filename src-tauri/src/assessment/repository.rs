// Assessment workflow repository

use super::models::*;
use super::{AssessmentError, Result};
use crate::database::DatabaseManager;
use chrono::Utc;
use sqlx::Row;
use std::collections::HashMap;
use uuid::Uuid;

/// Repository for assessment workflow database operations
pub struct AssessmentRepository {
    db: DatabaseManager,
}

impl AssessmentRepository {
    pub fn new(db: DatabaseManager) -> Self {
        Self { db }
    }

    /// Create a new assessment workflow
    pub async fn create_workflow(&self, new_workflow: NewAssessmentWorkflow) -> Result<AssessmentWorkflowModel> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        
        let configuration_json = serde_json::to_string(&new_workflow.configuration)?;
        let learning_objectives_json = serde_json::to_string(&new_workflow.learning_objectives)?;
        let metadata_json = serde_json::to_string(&new_workflow.metadata)?;
        let workflow_type_str = serde_json::to_string(&new_workflow.workflow_type)?;

        sqlx::query(
            r#"
            INSERT INTO assessment_workflows (
                id, title, description, case_study_id, workflow_type, configuration,
                status, estimated_duration, difficulty_level, learning_objectives,
                instructions, metadata, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&id)
        .bind(&new_workflow.title)
        .bind(&new_workflow.description)
        .bind(&new_workflow.case_study_id)
        .bind(&workflow_type_str)
        .bind(&configuration_json)
        .bind("draft")
        .bind(new_workflow.estimated_duration)
        .bind(&new_workflow.difficulty_level)
        .bind(&learning_objectives_json)
        .bind(&new_workflow.instructions)
        .bind(&metadata_json)
        .bind(&new_workflow.created_by)
        .bind(&now)
        .bind(&now)
        .execute(self.db.pool())
        .await?;

        self.find_workflow_by_id(&id).await?
            .ok_or_else(|| AssessmentError::NotFound("Failed to create workflow".to_string()))
    }

    /// Find assessment workflow by ID
    pub async fn find_workflow_by_id(&self, id: &str) -> Result<Option<AssessmentWorkflowModel>> {
        let row = sqlx::query(
            r#"
            SELECT id, title, description, case_study_id, workflow_type, configuration,
                   status, estimated_duration, difficulty_level, learning_objectives,
                   instructions, metadata, created_by, created_at, updated_at, published_at
            FROM assessment_workflows 
            WHERE id = ? AND status != 'deleted'
            "#
        )
        .bind(id)
        .fetch_optional(self.db.pool())
        .await?;

        if let Some(row) = row {
            Ok(Some(self.parse_workflow_row(row).await?))
        } else {
            Ok(None)
        }
    }

    /// Update assessment workflow
    pub async fn update_workflow(&self, id: &str, update: UpdateAssessmentWorkflow) -> Result<Option<AssessmentWorkflowModel>> {
        let current = match self.find_workflow_by_id(id).await? {
            Some(workflow) => workflow,
            None => return Ok(None),
        };

        if !self.is_workflow_editable(&current)? {
            return Err(AssessmentError::PermissionDenied(
                "Cannot edit published or archived workflow".to_string()
            ));
        }

        let now = Utc::now();

        if let Some(title) = &update.title {
            sqlx::query("UPDATE assessment_workflows SET title = ?, updated_at = ? WHERE id = ?")
                .bind(title)
                .bind(&now)
                .bind(id)
                .execute(self.db.pool()).await?;
        }

        if let Some(description) = &update.description {
            sqlx::query("UPDATE assessment_workflows SET description = ?, updated_at = ? WHERE id = ?")
                .bind(description)
                .bind(&now)
                .bind(id)
                .execute(self.db.pool()).await?;
        }

        if let Some(workflow_type) = &update.workflow_type {
            let workflow_type_str = serde_json::to_string(workflow_type)?;
            sqlx::query("UPDATE assessment_workflows SET workflow_type = ?, updated_at = ? WHERE id = ?")
                .bind(&workflow_type_str)
                .bind(&now)
                .bind(id)
                .execute(self.db.pool()).await?;
        }

        if let Some(configuration) = &update.configuration {
            let configuration_json = serde_json::to_string(configuration)?;
            sqlx::query("UPDATE assessment_workflows SET configuration = ?, updated_at = ? WHERE id = ?")
                .bind(&configuration_json)
                .bind(&now)
                .bind(id)
                .execute(self.db.pool()).await?;
        }

        if let Some(estimated_duration) = update.estimated_duration {
            sqlx::query("UPDATE assessment_workflows SET estimated_duration = ?, updated_at = ? WHERE id = ?")
                .bind(estimated_duration)
                .bind(&now)
                .bind(id)
                .execute(self.db.pool()).await?;
        }

        if let Some(difficulty_level) = &update.difficulty_level {
            sqlx::query("UPDATE assessment_workflows SET difficulty_level = ?, updated_at = ? WHERE id = ?")
                .bind(difficulty_level)
                .bind(&now)
                .bind(id)
                .execute(self.db.pool()).await?;
        }

        if let Some(learning_objectives) = &update.learning_objectives {
            let learning_objectives_json = serde_json::to_string(learning_objectives)?;
            sqlx::query("UPDATE assessment_workflows SET learning_objectives = ?, updated_at = ? WHERE id = ?")
                .bind(&learning_objectives_json)
                .bind(&now)
                .bind(id)
                .execute(self.db.pool()).await?;
        }

        if let Some(instructions) = &update.instructions {
            sqlx::query("UPDATE assessment_workflows SET instructions = ?, updated_at = ? WHERE id = ?")
                .bind(instructions)
                .bind(&now)
                .bind(id)
                .execute(self.db.pool()).await?;
        }

        if let Some(metadata) = &update.metadata {
            let metadata_json = serde_json::to_string(metadata)?;
            sqlx::query("UPDATE assessment_workflows SET metadata = ?, updated_at = ? WHERE id = ?")
                .bind(&metadata_json)
                .bind(&now)
                .bind(id)
                .execute(self.db.pool()).await?;
        }

        self.find_workflow_by_id(id).await
    }

    /// Change workflow status
    pub async fn update_workflow_status(&self, id: &str, status: AssessmentWorkflowStatus) -> Result<Option<AssessmentWorkflowModel>> {
        let now = Utc::now();
        let published_at = if status == AssessmentWorkflowStatus::Published {
            Some(now)
        } else {
            None
        };

        sqlx::query(
            "UPDATE assessment_workflows SET status = ?, published_at = ?, updated_at = ? WHERE id = ?"
        )
        .bind(match status {
            AssessmentWorkflowStatus::Draft => "draft",
            AssessmentWorkflowStatus::Review => "review", 
            AssessmentWorkflowStatus::Published => "published",
            AssessmentWorkflowStatus::Archived => "archived",
            AssessmentWorkflowStatus::Deleted => "deleted",
        })
        .bind(published_at)
        .bind(now)
        .bind(id)
        .execute(self.db.pool())
        .await?;

        self.find_workflow_by_id(id).await
    }

    /// Delete workflow (soft delete)
    pub async fn delete_workflow(&self, id: &str) -> Result<bool> {
        let result = sqlx::query(
            "UPDATE assessment_workflows SET status = 'deleted', updated_at = ? WHERE id = ? AND status != 'deleted'"
        )
        .bind(Utc::now())
        .bind(id)
        .execute(self.db.pool())
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// List workflows with filtering and pagination
    pub async fn list_workflows(&self, filter: AssessmentWorkflowFilter, limit: i32, offset: i32) -> Result<Vec<AssessmentWorkflowModel>> {
        let mut query = String::from(
            r#"
            SELECT id, title, description, case_study_id, workflow_type, configuration,
                   status, estimated_duration, difficulty_level, learning_objectives,
                   instructions, metadata, created_by, created_at, updated_at, published_at
            FROM assessment_workflows 
            WHERE status != 'deleted'
            "#
        );

        let mut params: Vec<String> = Vec::new();

        // Apply filters
        if let Some(status) = &filter.status {
            query.push_str(" AND status = ?");
            params.push(match status {
                AssessmentWorkflowStatus::Draft => "draft".to_string(),
                AssessmentWorkflowStatus::Review => "review".to_string(),
                AssessmentWorkflowStatus::Published => "published".to_string(),
                AssessmentWorkflowStatus::Archived => "archived".to_string(),
                AssessmentWorkflowStatus::Deleted => "deleted".to_string(),
            });
        }

        if let Some(ref case_study_id) = filter.case_study_id {
            query.push_str(" AND case_study_id = ?");
            params.push(case_study_id.clone());
        }

        if let Some(ref difficulty_level) = filter.difficulty_level {
            query.push_str(" AND difficulty_level = ?");
            params.push(difficulty_level.clone());
        }

        if let Some(ref created_by) = filter.created_by {
            query.push_str(" AND created_by = ?");
            params.push(created_by.clone());
        }

        if let Some(created_after) = filter.created_after {
            query.push_str(" AND created_at >= ?");
            params.push(created_after.to_rfc3339());
        }

        if let Some(created_before) = filter.created_before {
            query.push_str(" AND created_at <= ?");
            params.push(created_before.to_rfc3339());
        }

        query.push_str(" ORDER BY updated_at DESC LIMIT ? OFFSET ?");
        params.push(limit.to_string());
        params.push(offset.to_string());

        let mut query_builder = sqlx::query(&query);
        for param in params {
            query_builder = query_builder.bind(param);
        }

        let rows = query_builder.fetch_all(self.db.pool()).await?;
        let mut workflows = Vec::new();

        for row in rows {
            workflows.push(self.parse_workflow_row(row).await?);
        }

        Ok(workflows)
    }

    /// Create assessment session
    pub async fn create_session(&self, workflow_id: &str, user_id: &str) -> Result<AssessmentSessionModel> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        
        // Check if workflow exists and is published
        let workflow = self.find_workflow_by_id(workflow_id).await?
            .ok_or_else(|| AssessmentError::NotFound("Workflow not found".to_string()))?;
        
        if workflow.status != AssessmentWorkflowStatus::Published {
            return Err(AssessmentError::InvalidState("Workflow is not published".to_string()));
        }

        // Get attempt number
        let attempt_number = self.get_user_attempt_count(workflow_id, user_id).await? + 1;

        // Check if user has exceeded max attempts
        if let Some(max_attempts) = workflow.configuration.max_attempts {
            if attempt_number > max_attempts {
                return Err(AssessmentError::PermissionDenied("Maximum attempts exceeded".to_string()));
            }
        }

        let session_data = SessionData {
            question_sequence: Vec::new(),
            time_per_question: HashMap::new(),
            navigation_history: Vec::new(),
            bookmarked_questions: Vec::new(),
            notes: HashMap::new(),
            case_study_interactions: Vec::new(),
            adaptive_data: None,
            browser_data: BrowserSessionData {
                user_agent: None,
                screen_resolution: None,
                timezone: None,
                connection_events: Vec::new(),
                performance_metrics: PerformanceMetrics {
                    average_response_time: 0.0,
                    page_load_times: Vec::new(),
                    network_latency: None,
                    client_errors: Vec::new(),
                },
            },
        };

        let session_data_json = serde_json::to_string(&session_data)?;
        let responses_json = serde_json::to_string(&HashMap::<String, QuestionResponse>::new())?;

        sqlx::query(
            r#"
            INSERT INTO assessment_sessions (
                id, workflow_id, user_id, session_state, current_question_id, responses,
                start_time, last_activity, time_spent, attempt_number, completion_percentage,
                session_data, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&id)
        .bind(workflow_id)
        .bind(user_id)
        .bind("not_started")
        .bind::<Option<String>>(None)
        .bind(&responses_json)
        .bind(&now)
        .bind(&now)
        .bind(0)
        .bind(attempt_number)
        .bind(0.0)
        .bind(&session_data_json)
        .bind(&now)
        .bind(&now)
        .execute(self.db.pool())
        .await?;

        self.find_session_by_id(&id).await?
            .ok_or_else(|| AssessmentError::NotFound("Failed to create session".to_string()))
    }

    /// Find assessment session by ID
    pub async fn find_session_by_id(&self, id: &str) -> Result<Option<AssessmentSessionModel>> {
        let row = sqlx::query(
            r#"
            SELECT id, workflow_id, user_id, session_state, current_question_id, responses,
                   start_time, end_time, last_activity, time_spent, attempt_number,
                   completion_percentage, current_score, final_score, passed,
                   session_data, created_at, updated_at
            FROM assessment_sessions 
            WHERE id = ?
            "#
        )
        .bind(id)
        .fetch_optional(self.db.pool())
        .await?;

        if let Some(row) = row {
            Ok(Some(self.parse_session_row(row).await?))
        } else {
            Ok(None)
        }
    }

    /// Update assessment session
    pub async fn update_session(&self, session: &AssessmentSessionModel) -> Result<()> {
        let responses_json = serde_json::to_string(&session.responses)?;
        let session_data_json = serde_json::to_string(&session.session_data)?;

        sqlx::query(
            r#"
            UPDATE assessment_sessions SET
                session_state = ?, current_question_id = ?, responses = ?,
                end_time = ?, last_activity = ?, time_spent = ?,
                completion_percentage = ?, current_score = ?, final_score = ?,
                passed = ?, session_data = ?, updated_at = ?
            WHERE id = ?
            "#
        )
        .bind(match session.session_state {
            SessionState::NotStarted => "not_started",
            SessionState::InProgress => "in_progress",
            SessionState::Paused => "paused",
            SessionState::Completed => "completed",
            SessionState::Submitted => "submitted",
            SessionState::TimedOut => "timed_out",
            SessionState::Abandoned => "abandoned",
        })
        .bind(&session.current_question_id)
        .bind(&responses_json)
        .bind(&session.end_time)
        .bind(&session.last_activity)
        .bind(session.time_spent)
        .bind(session.completion_percentage)
        .bind(&session.current_score)
        .bind(&session.final_score)
        .bind(&session.passed)
        .bind(&session_data_json)
        .bind(&Utc::now())
        .bind(&session.id)
        .execute(self.db.pool())
        .await?;

        Ok(())
    }

    /// Get user sessions for a workflow
    pub async fn get_user_sessions(&self, workflow_id: &str, user_id: &str) -> Result<Vec<AssessmentSessionModel>> {
        let rows = sqlx::query(
            r#"
            SELECT id, workflow_id, user_id, session_state, current_question_id, responses,
                   start_time, end_time, last_activity, time_spent, attempt_number,
                   completion_percentage, current_score, final_score, passed,
                   session_data, created_at, updated_at
            FROM assessment_sessions 
            WHERE workflow_id = ? AND user_id = ?
            ORDER BY created_at DESC
            "#
        )
        .bind(workflow_id)
        .bind(user_id)
        .fetch_all(self.db.pool())
        .await?;

        let mut sessions = Vec::new();
        for row in rows {
            sessions.push(self.parse_session_row(row).await?);
        }

        Ok(sessions)
    }

    /// Get assessment statistics
    pub async fn get_assessment_statistics(&self) -> Result<AssessmentStatistics> {
        // Basic counts
        let counts = sqlx::query(
            r#"
            SELECT 
                COUNT(*) as total_workflows,
                COUNT(CASE WHEN status = 'published' THEN 1 END) as published_workflows
            FROM assessment_workflows 
            WHERE status != 'deleted'
            "#
        )
        .fetch_one(self.db.pool())
        .await?;

        // Session statistics
        let session_stats = sqlx::query(
            r#"
            SELECT 
                COUNT(*) as total_sessions,
                COUNT(CASE WHEN session_state IN ('completed', 'submitted') THEN 1 END) as completed_sessions,
                AVG(CASE WHEN final_score IS NOT NULL THEN final_score END) as avg_score,
                AVG(CASE WHEN time_spent > 0 THEN time_spent / 60.0 END) as avg_time_minutes,
                COUNT(CASE WHEN passed = 1 THEN 1 END) * 100.0 / 
                    NULLIF(COUNT(CASE WHEN passed IS NOT NULL THEN 1 END), 0) as pass_rate
            FROM assessment_sessions
            "#
        )
        .fetch_one(self.db.pool())
        .await?;

        let total_workflows: i32 = counts.try_get("total_workflows").unwrap_or(0);
        let published_workflows: i32 = counts.try_get("published_workflows").unwrap_or(0);
        let total_sessions: i32 = session_stats.try_get("total_sessions").unwrap_or(0);
        let completed_sessions: i32 = session_stats.try_get("completed_sessions").unwrap_or(0);
        
        let completion_rate = if total_sessions > 0 {
            completed_sessions as f64 / total_sessions as f64 * 100.0
        } else {
            0.0
        };

        Ok(AssessmentStatistics {
            total_workflows,
            published_workflows,
            total_sessions,
            completed_sessions,
            average_completion_rate: completion_rate,
            average_score: session_stats.try_get("avg_score").unwrap_or(0.0),
            average_time: session_stats.try_get("avg_time_minutes").unwrap_or(0.0),
            pass_rate: session_stats.try_get("pass_rate").unwrap_or(0.0),
            most_popular_workflow: None, // TODO: Implement
            difficulty_distribution: HashMap::new(), // TODO: Implement
            workflow_type_distribution: HashMap::new(), // TODO: Implement
            monthly_activity: Vec::new(), // TODO: Implement
        })
    }

    /// Helper methods
    
    async fn get_user_attempt_count(&self, workflow_id: &str, user_id: &str) -> Result<i32> {
        let count = sqlx::query(
            "SELECT COUNT(*) as count FROM assessment_sessions WHERE workflow_id = ? AND user_id = ?"
        )
        .bind(workflow_id)
        .bind(user_id)
        .fetch_one(self.db.pool())
        .await?;

        Ok(count.try_get("count").unwrap_or(0))
    }

    fn is_workflow_editable(&self, workflow: &AssessmentWorkflowModel) -> Result<bool> {
        Ok(matches!(workflow.status, AssessmentWorkflowStatus::Draft | AssessmentWorkflowStatus::Review))
    }

    async fn parse_workflow_row(&self, row: sqlx::sqlite::SqliteRow) -> Result<AssessmentWorkflowModel> {
        let workflow_type_json: String = row.try_get("workflow_type")?;
        let configuration_json: String = row.try_get("configuration")?;
        let learning_objectives_json: String = row.try_get("learning_objectives")?;
        let metadata_json: String = row.try_get("metadata")?;

        let workflow_type: AssessmentWorkflowType = serde_json::from_str(&workflow_type_json)?;
        let configuration: AssessmentConfiguration = serde_json::from_str(&configuration_json)?;
        let learning_objectives: Vec<String> = serde_json::from_str(&learning_objectives_json)?;
        let metadata: AssessmentMetadata = serde_json::from_str(&metadata_json)?;

        let status_str: String = row.try_get("status")?;
        let status = match status_str.as_str() {
            "draft" => AssessmentWorkflowStatus::Draft,
            "review" => AssessmentWorkflowStatus::Review,
            "published" => AssessmentWorkflowStatus::Published,
            "archived" => AssessmentWorkflowStatus::Archived,
            _ => AssessmentWorkflowStatus::Draft,
        };

        Ok(AssessmentWorkflowModel {
            id: row.try_get("id")?,
            title: row.try_get("title")?,
            description: row.try_get("description")?,
            case_study_id: row.try_get("case_study_id")?,
            workflow_type,
            configuration,
            status,
            estimated_duration: row.try_get("estimated_duration")?,
            difficulty_level: row.try_get("difficulty_level")?,
            learning_objectives,
            instructions: row.try_get("instructions")?,
            metadata,
            created_by: row.try_get("created_by")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
            published_at: row.try_get("published_at")?,
        })
    }

    async fn parse_session_row(&self, row: sqlx::sqlite::SqliteRow) -> Result<AssessmentSessionModel> {
        let responses_json: String = row.try_get("responses")?;
        let session_data_json: String = row.try_get("session_data")?;

        let responses: HashMap<String, QuestionResponse> = serde_json::from_str(&responses_json)?;
        let session_data: SessionData = serde_json::from_str(&session_data_json)?;

        let session_state_str: String = row.try_get("session_state")?;
        let session_state = match session_state_str.as_str() {
            "not_started" => SessionState::NotStarted,
            "in_progress" => SessionState::InProgress,
            "paused" => SessionState::Paused,
            "completed" => SessionState::Completed,
            "submitted" => SessionState::Submitted,
            "timed_out" => SessionState::TimedOut,
            "abandoned" => SessionState::Abandoned,
            _ => SessionState::NotStarted,
        };

        Ok(AssessmentSessionModel {
            id: row.try_get("id")?,
            workflow_id: row.try_get("workflow_id")?,
            user_id: row.try_get("user_id")?,
            session_state,
            current_question_id: row.try_get("current_question_id")?,
            responses,
            start_time: row.try_get("start_time")?,
            end_time: row.try_get("end_time")?,
            last_activity: row.try_get("last_activity")?,
            time_spent: row.try_get("time_spent")?,
            attempt_number: row.try_get("attempt_number")?,
            completion_percentage: row.try_get("completion_percentage")?,
            current_score: row.try_get("current_score")?,
            final_score: row.try_get("final_score")?,
            passed: row.try_get("passed")?,
            session_data,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}