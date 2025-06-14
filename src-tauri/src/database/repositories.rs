use sqlx::SqlitePool;
use anyhow::Result;
use super::models::*;

/// User repository for database operations
pub struct UserRepository {
    pool: SqlitePool,
}

impl UserRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, user: NewUser) -> Result<User> {
        let user_result = sqlx::query_as::<_, User>(
            r#"
            INSERT INTO users (username, email, full_name, password_hash, role, preferences)
            VALUES (?, ?, ?, ?, ?, ?)
            RETURNING id, username, email, full_name, password_hash, role, preferences, created_at, updated_at
            "#
        )
        .bind(&user.username)
        .bind(&user.email)
        .bind(&user.full_name)
        .bind(&user.password_hash)
        .bind(user.role.unwrap_or_else(|| "user".to_string()))
        .bind(&user.preferences)
        .fetch_one(&self.pool)
        .await?;

        Ok(user_result)
    }

    pub async fn find_by_id(&self, id: i64) -> Result<Option<User>> {
        let user = sqlx::query_as::<_, User>(
            "SELECT id, username, email, full_name, password_hash, role, preferences, created_at, updated_at FROM users WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn find_by_username(&self, username: &str) -> Result<Option<User>> {
        let user = sqlx::query_as::<_, User>(
            "SELECT id, username, email, full_name, password_hash, role, preferences, created_at, updated_at FROM users WHERE username = ?"
        )
        .bind(username)
        .fetch_optional(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn list_all(&self) -> Result<Vec<User>> {
        let users = sqlx::query_as::<_, User>(
            "SELECT id, username, email, full_name, password_hash, role, preferences, created_at, updated_at FROM users ORDER BY created_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(users)
    }

    pub async fn update(&self, id: i64, _update_data: UpdateUser) -> Result<Option<User>> {
        // Simplified update for now - just update timestamp
        // TODO: Implement proper field-by-field updates
        sqlx::query("UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        self.find_by_id(id).await
    }

    pub async fn delete(&self, id: i64) -> Result<bool> {
        let result = sqlx::query("DELETE FROM users WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

/// Case Study repository for database operations
pub struct CaseStudyRepository {
    pool: SqlitePool,
}

impl CaseStudyRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, case_study: NewCaseStudy) -> Result<CaseStudy> {
        let case_study_result = sqlx::query_as::<_, CaseStudy>(
            r#"
            INSERT INTO case_studies (
                title, description, domain_id, template_id, difficulty_level, 
                estimated_duration, learning_objectives, tags, content, 
                background_info, problem_statement, analysis_framework, 
                sample_solution, metadata, status, created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id, title, description, domain_id, template_id, difficulty_level, 
                      estimated_duration, learning_objectives, tags, content, 
                      background_info, problem_statement, analysis_framework, 
                      sample_solution, metadata, status, created_by, created_at, updated_at, published_at
            "#
        )
        .bind(&case_study.title)
        .bind(&case_study.description)
        .bind(case_study.domain_id)
        .bind(case_study.template_id)
        .bind(&case_study.difficulty_level)
        .bind(case_study.estimated_duration)
        .bind(&case_study.learning_objectives)
        .bind(&case_study.tags)
        .bind(&case_study.content)
        .bind(&case_study.background_info)
        .bind(&case_study.problem_statement)
        .bind(&case_study.analysis_framework)
        .bind(&case_study.sample_solution)
        .bind(&case_study.metadata)
        .bind(case_study.status.unwrap_or_else(|| "draft".to_string()))
        .bind(case_study.created_by)
        .fetch_one(&self.pool)
        .await?;

        Ok(case_study_result)
    }

    pub async fn find_by_id(&self, id: i64) -> Result<Option<CaseStudy>> {
        let case_study = sqlx::query_as::<_, CaseStudy>(
            "SELECT * FROM case_studies WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(case_study)
    }

    pub async fn list_by_domain(&self, domain_id: i64) -> Result<Vec<CaseStudy>> {
        let case_studies = sqlx::query_as::<_, CaseStudy>(
            "SELECT * FROM case_studies WHERE domain_id = ? ORDER BY created_at DESC"
        )
        .bind(domain_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(case_studies)
    }

    pub async fn list_by_status(&self, status: &str) -> Result<Vec<CaseStudy>> {
        let case_studies = sqlx::query_as::<_, CaseStudy>(
            "SELECT * FROM case_studies WHERE status = ? ORDER BY created_at DESC"
        )
        .bind(status)
        .fetch_all(&self.pool)
        .await?;

        Ok(case_studies)
    }

    pub async fn list_published(&self) -> Result<Vec<CaseStudy>> {
        let case_studies = sqlx::query_as::<_, CaseStudy>(
            "SELECT * FROM case_studies WHERE status = 'published' ORDER BY created_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(case_studies)
    }

    pub async fn search(&self, query: &str) -> Result<Vec<CaseStudy>> {
        let case_studies = sqlx::query_as::<_, CaseStudy>(
            r#"
            SELECT * FROM case_studies 
            WHERE title LIKE ? OR description LIKE ? OR content LIKE ?
            ORDER BY created_at DESC
            "#
        )
        .bind(format!("%{}%", query))
        .bind(format!("%{}%", query))
        .bind(format!("%{}%", query))
        .fetch_all(&self.pool)
        .await?;

        Ok(case_studies)
    }

    pub async fn get_summary_view(&self) -> Result<Vec<CaseStudySummary>> {
        let summaries = sqlx::query_as::<_, CaseStudySummary>(
            "SELECT * FROM case_study_summary ORDER BY created_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(summaries)
    }

    pub async fn update_status(&self, id: i64, status: &str) -> Result<bool> {
        let result = sqlx::query(
            "UPDATE case_studies SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        )
        .bind(status)
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn delete(&self, id: i64) -> Result<bool> {
        let result = sqlx::query("DELETE FROM case_studies WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

/// Domain repository for database operations
pub struct DomainRepository {
    pool: SqlitePool,
}

impl DomainRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn list_all(&self) -> Result<Vec<Domain>> {
        let domains = sqlx::query_as::<_, Domain>(
            "SELECT * FROM domains ORDER BY name"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(domains)
    }

    pub async fn find_by_id(&self, id: i64) -> Result<Option<Domain>> {
        let domain = sqlx::query_as::<_, Domain>(
            "SELECT * FROM domains WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(domain)
    }

    pub async fn find_by_name(&self, name: &str) -> Result<Option<Domain>> {
        let domain = sqlx::query_as::<_, Domain>(
            "SELECT * FROM domains WHERE name = ?"
        )
        .bind(name)
        .fetch_optional(&self.pool)
        .await?;

        Ok(domain)
    }

    pub async fn create(&self, domain: NewDomain) -> Result<Domain> {
        let domain_result = sqlx::query_as::<_, Domain>(
            "INSERT INTO domains (name, description, color, icon) VALUES (?, ?, ?, ?) RETURNING id, name, description, color, icon, created_at"
        )
        .bind(&domain.name)
        .bind(&domain.description)
        .bind(&domain.color)
        .bind(&domain.icon)
        .fetch_one(&self.pool)
        .await?;

        Ok(domain_result)
    }
}

/// Assessment Question repository
pub struct AssessmentQuestionRepository {
    pool: SqlitePool,
}

impl AssessmentQuestionRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, question: NewAssessmentQuestion) -> Result<AssessmentQuestion> {
        let question_result = sqlx::query_as::<_, AssessmentQuestion>(
            r#"
            INSERT INTO assessment_questions (
                case_study_id, question_text, question_type, options, 
                correct_answer, sample_answer, rubric, points, order_index, is_required
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id, case_study_id, question_text, question_type, options, 
                      correct_answer, sample_answer, rubric, points, order_index, is_required, created_at
            "#
        )
        .bind(question.case_study_id)
        .bind(&question.question_text)
        .bind(&question.question_type)
        .bind(&question.options)
        .bind(&question.correct_answer)
        .bind(&question.sample_answer)
        .bind(&question.rubric)
        .bind(question.points.unwrap_or(1))
        .bind(question.order_index.unwrap_or(0))
        .bind(question.is_required.unwrap_or(true))
        .fetch_one(&self.pool)
        .await?;

        Ok(question_result)
    }

    pub async fn list_by_case_study(&self, case_study_id: i64) -> Result<Vec<AssessmentQuestion>> {
        let questions = sqlx::query_as::<_, AssessmentQuestion>(
            "SELECT * FROM assessment_questions WHERE case_study_id = ? ORDER BY order_index"
        )
        .bind(case_study_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(questions)
    }

    pub async fn delete(&self, id: i64) -> Result<bool> {
        let result = sqlx::query("DELETE FROM assessment_questions WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

/// User Progress repository
pub struct UserProgressRepository {
    pool: SqlitePool,
}

impl UserProgressRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, progress: NewUserProgress) -> Result<UserProgress> {
        let progress_result = sqlx::query_as::<_, UserProgress>(
            r#"
            INSERT INTO user_progress (
                user_id, case_study_id, status, time_spent, answers, 
                score, feedback, notes, started_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id, user_id, case_study_id, status, time_spent, answers, 
                      score, feedback, notes, started_at, completed_at, last_accessed, created_at
            "#
        )
        .bind(progress.user_id)
        .bind(progress.case_study_id)
        .bind(progress.status.unwrap_or_else(|| "not_started".to_string()))
        .bind(progress.time_spent.unwrap_or(0))
        .bind(&progress.answers)
        .bind(progress.score)
        .bind(&progress.feedback)
        .bind(&progress.notes)
        .bind(progress.started_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(progress_result)
    }

    pub async fn find_by_user_and_case_study(&self, user_id: i64, case_study_id: i64) -> Result<Option<UserProgress>> {
        let progress = sqlx::query_as::<_, UserProgress>(
            "SELECT * FROM user_progress WHERE user_id = ? AND case_study_id = ?"
        )
        .bind(user_id)
        .bind(case_study_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(progress)
    }

    pub async fn list_by_user(&self, user_id: i64) -> Result<Vec<UserProgress>> {
        let progress = sqlx::query_as::<_, UserProgress>(
            "SELECT * FROM user_progress WHERE user_id = ? ORDER BY last_accessed DESC"
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(progress)
    }

    pub async fn get_user_summary(&self, user_id: i64) -> Result<Option<UserProgressSummary>> {
        let summary = sqlx::query_as::<_, UserProgressSummary>(
            "SELECT * FROM user_progress_summary WHERE user_id = ?"
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(summary)
    }

    pub async fn update_progress(&self, user_id: i64, case_study_id: i64, status: &str, score: Option<f64>) -> Result<bool> {
        let result = sqlx::query(
            r#"
            UPDATE user_progress 
            SET status = ?, score = ?, last_accessed = CURRENT_TIMESTAMP
            WHERE user_id = ? AND case_study_id = ?
            "#
        )
        .bind(status)
        .bind(score)
        .bind(user_id)
        .bind(case_study_id)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }
}

/// Application Settings repository
pub struct AppSettingRepository {
    pool: SqlitePool,
}

impl AppSettingRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn get_by_key(&self, key: &str) -> Result<Option<AppSetting>> {
        let setting = sqlx::query_as::<_, AppSetting>(
            "SELECT * FROM app_settings WHERE key = ?"
        )
        .bind(key)
        .fetch_optional(&self.pool)
        .await?;

        Ok(setting)
    }

    pub async fn set_value(&self, key: &str, value: &str) -> Result<bool> {
        let result = sqlx::query(
            r#"
            INSERT INTO app_settings (key, value, updated_at) 
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET 
                value = excluded.value, 
                updated_at = CURRENT_TIMESTAMP
            "#
        )
        .bind(key)
        .bind(value)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn list_user_configurable(&self) -> Result<Vec<AppSetting>> {
        let settings = sqlx::query_as::<_, AppSetting>(
            "SELECT * FROM app_settings WHERE is_user_configurable = true ORDER BY key"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(settings)
    }
}

/// Generation History repository
pub struct GenerationHistoryRepository {
    pool: SqlitePool,
}

impl GenerationHistoryRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, history: NewGenerationHistory) -> Result<GenerationHistory> {
        let history_result = sqlx::query_as::<_, GenerationHistory>(
            r#"
            INSERT INTO generation_history (
                case_study_id, generation_type, prompt_template, user_input,
                ai_provider, model_name, prompt_tokens, completion_tokens,
                generation_time_ms, success, error_message, created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id, case_study_id, generation_type, prompt_template, user_input,
                      ai_provider, model_name, prompt_tokens, completion_tokens,
                      generation_time_ms, success, error_message, created_by, created_at
            "#
        )
        .bind(history.case_study_id)
        .bind(&history.generation_type)
        .bind(&history.prompt_template)
        .bind(&history.user_input)
        .bind(&history.ai_provider)
        .bind(&history.model_name)
        .bind(history.prompt_tokens)
        .bind(history.completion_tokens)
        .bind(history.generation_time_ms)
        .bind(history.success.unwrap_or(true))
        .bind(&history.error_message)
        .bind(history.created_by)
        .fetch_one(&self.pool)
        .await?;

        Ok(history_result)
    }

    pub async fn list_by_case_study(&self, case_study_id: i64) -> Result<Vec<GenerationHistory>> {
        let history = sqlx::query_as::<_, GenerationHistory>(
            "SELECT * FROM generation_history WHERE case_study_id = ? ORDER BY created_at DESC"
        )
        .bind(case_study_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(history)
    }

    pub async fn get_recent(&self, limit: i64) -> Result<Vec<GenerationHistory>> {
        let history = sqlx::query_as::<_, GenerationHistory>(
            "SELECT * FROM generation_history ORDER BY created_at DESC LIMIT ?"
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(history)
    }
}