// Case study management service layer

use super::models::*;
use super::repository::CaseStudyRepository;
use super::search::CaseStudySearchEngine;
use super::version_control::CaseStudyVersionControl;
use super::{CaseStudyError, Result};
use crate::database::DatabaseManager;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Main case study management service
pub struct CaseStudyManager {
    repository: CaseStudyRepository,
    search_engine: CaseStudySearchEngine,
    version_control: CaseStudyVersionControl,
}

impl CaseStudyManager {
    pub fn new(db: DatabaseManager) -> Self {
        let repository = CaseStudyRepository::new(db.clone());
        let search_engine = CaseStudySearchEngine::new(db.clone());
        let version_control = CaseStudyVersionControl::new(db);

        Self {
            repository,
            search_engine,
            version_control,
        }
    }

    /// Create a new case study
    pub async fn create_case_study(&self, new_case_study: NewCaseStudy) -> Result<CaseStudy> {
        // Validate the case study data
        self.validate_case_study_data(&new_case_study)?;

        // Create the case study
        let case_study = self.repository.create(new_case_study).await?;

        // Index for search
        self.search_engine.index_case_study(&case_study).await?;

        // Create initial version
        self.version_control.create_version(&case_study, "Initial version", None).await?;

        Ok(case_study)
    }

    /// Update an existing case study
    pub async fn update_case_study(&self, id: &str, update: UpdateCaseStudy) -> Result<Option<CaseStudy>> {
        // Check if case study exists and is editable
        let current = match self.repository.find_by_id(id).await? {
            Some(case_study) => case_study,
            None => return Ok(None),
        };

        if !current.is_editable() {
            return Err(CaseStudyError::PermissionDenied(
                "Cannot edit published or archived case study".to_string()
            ));
        }

        // Validate update data
        self.validate_update_data(&update)?;

        // Update the case study
        let updated = self.repository.update(id, update).await?;

        if let Some(ref case_study) = updated {
            // Update search index
            self.search_engine.update_case_study_index(case_study).await?;

            // Create new version if content changed
            if case_study.version > current.version {
                self.version_control.create_version(case_study, "Content updated", Some(&current)).await?;
            }
        }

        Ok(updated)
    }

    /// Get case study by ID
    pub async fn get_case_study(&self, id: &str) -> Result<Option<CaseStudy>> {
        self.repository.find_by_id(id).await
    }

    /// Delete case study (soft delete)
    pub async fn delete_case_study(&self, id: &str) -> Result<bool> {
        // Check if case study exists
        let case_study = match self.repository.find_by_id(id).await? {
            Some(case_study) => case_study,
            None => return Ok(false),
        };

        // Soft delete
        let deleted = self.repository.delete(id).await?;

        if deleted {
            // Remove from search index
            self.search_engine.remove_case_study_index(id).await?;
        }

        Ok(deleted)
    }

    /// List case studies with filtering and pagination
    pub async fn list_case_studies(
        &self,
        filter: CaseStudyFilter,
        limit: i32,
        offset: i32,
    ) -> Result<Vec<CaseStudy>> {
        self.repository.list(filter, limit, offset).await
    }

    /// Search case studies
    pub async fn search_case_studies(&self, query: CaseStudySearchQuery) -> Result<Vec<CaseStudy>> {
        self.search_engine.search(query).await
    }

    /// Publish case study
    pub async fn publish_case_study(&self, id: &str) -> Result<Option<CaseStudy>> {
        let case_study = match self.repository.find_by_id(id).await? {
            Some(case_study) => case_study,
            None => return Ok(None),
        };

        // Validate that case study is ready for publishing
        self.validate_for_publishing(&case_study)?;

        // Update status to published
        let published = self.repository.update_status(id, CaseStudyStatus::Published).await?;

        if let Some(ref case_study) = published {
            // Update search index
            self.search_engine.update_case_study_index(case_study).await?;

            // Create version for publishing
            self.version_control.create_version(case_study, "Published", None).await?;
        }

        Ok(published)
    }

    /// Archive case study
    pub async fn archive_case_study(&self, id: &str) -> Result<Option<CaseStudy>> {
        let archived = self.repository.update_status(id, CaseStudyStatus::Archived).await?;

        if let Some(ref case_study) = archived {
            // Update search index
            self.search_engine.update_case_study_index(case_study).await?;

            // Create version for archiving
            self.version_control.create_version(case_study, "Archived", None).await?;
        }

        Ok(archived)
    }

    /// Restore archived case study to draft
    pub async fn restore_case_study(&self, id: &str) -> Result<Option<CaseStudy>> {
        let case_study = match self.repository.find_by_id(id).await? {
            Some(case_study) => case_study,
            None => return Ok(None),
        };

        if case_study.status != CaseStudyStatus::Archived {
            return Err(CaseStudyError::InvalidData(
                "Only archived case studies can be restored".to_string()
            ));
        }

        let restored = self.repository.update_status(id, CaseStudyStatus::Draft).await?;

        if let Some(ref case_study) = restored {
            // Update search index
            self.search_engine.update_case_study_index(case_study).await?;

            // Create version for restoration
            self.version_control.create_version(case_study, "Restored from archive", None).await?;
        }

        Ok(restored)
    }

    /// Get case study versions
    pub async fn get_case_study_versions(&self, case_study_id: &str) -> Result<Vec<CaseStudyVersion>> {
        self.version_control.get_versions(case_study_id).await
    }

    /// Get specific version of case study
    pub async fn get_case_study_version(&self, case_study_id: &str, version: i32) -> Result<Option<CaseStudyVersion>> {
        self.version_control.get_version(case_study_id, version).await
    }

    /// Restore case study to specific version
    pub async fn restore_to_version(&self, case_study_id: &str, version: i32) -> Result<Option<CaseStudy>> {
        let current = match self.repository.find_by_id(case_study_id).await? {
            Some(case_study) => case_study,
            None => return Ok(None),
        };

        if !current.is_editable() {
            return Err(CaseStudyError::PermissionDenied(
                "Cannot restore published or archived case study".to_string()
            ));
        }

        let version_data = match self.version_control.get_version(case_study_id, version).await? {
            Some(version) => version,
            None => return Err(CaseStudyError::NotFound(format!("Version {} not found", version))),
        };

        // Create update from version data
        let update = UpdateCaseStudy {
            title: Some(version_data.title),
            content: Some(version_data.content),
            summary: version_data.summary,
            metadata: Some(version_data.metadata),
            description: None,
            category_id: None,
            industry: None,
            difficulty_level: None,
            duration_minutes: None,
            learning_objectives: None,
        };

        // Update case study
        let updated = self.repository.update(case_study_id, update).await?;

        if let Some(ref case_study) = updated {
            // Update search index
            self.search_engine.update_case_study_index(case_study).await?;

            // Create version for restoration
            self.version_control.create_version(
                case_study, 
                &format!("Restored to version {}", version), 
                Some(&current)
            ).await?;
        }

        Ok(updated)
    }

    /// Get case study statistics
    pub async fn get_statistics(&self) -> Result<CaseStudyStatistics> {
        self.repository.get_statistics().await
    }

    /// Get recent case studies
    pub async fn get_recent_case_studies(&self, limit: i32) -> Result<Vec<CaseStudy>> {
        self.repository.get_recent(limit).await
    }

    /// Get case studies by category
    pub async fn get_case_studies_by_category(&self, category_id: &str, limit: i32, offset: i32) -> Result<Vec<CaseStudy>> {
        self.repository.list_by_category(category_id, limit, offset).await
    }

    /// Get case studies by status
    pub async fn get_case_studies_by_status(&self, status: CaseStudyStatus, limit: i32, offset: i32) -> Result<Vec<CaseStudy>> {
        self.repository.list_by_status(status, limit, offset).await
    }

    /// Count case studies matching filter
    pub async fn count_case_studies(&self, filter: CaseStudyFilter) -> Result<i32> {
        self.repository.count(filter).await
    }

    /// Check if case study exists
    pub async fn case_study_exists(&self, id: &str) -> Result<bool> {
        self.repository.exists(id).await
    }

    /// Duplicate case study
    pub async fn duplicate_case_study(&self, id: &str, new_title: Option<String>) -> Result<CaseStudy> {
        let original = match self.repository.find_by_id(id).await? {
            Some(case_study) => case_study,
            None => return Err(CaseStudyError::NotFound(format!("Case study {} not found", id))),
        };

        let title = new_title.unwrap_or_else(|| format!("{} (Copy)", original.title));

        let new_case_study = NewCaseStudy {
            title,
            description: original.description,
            content: original.content,
            summary: original.summary,
            category_id: original.category_id,
            industry: original.industry,
            difficulty_level: original.difficulty_level,
            duration_minutes: original.duration_minutes,
            learning_objectives: original.learning_objectives,
            metadata: original.metadata,
            created_by: None, // Will be set to current user
        };

        self.create_case_study(new_case_study).await
    }

    /// Validate case study data
    fn validate_case_study_data(&self, case_study: &NewCaseStudy) -> Result<()> {
        if case_study.title.trim().is_empty() {
            return Err(CaseStudyError::InvalidData("Title cannot be empty".to_string()));
        }

        if case_study.title.len() > 200 {
            return Err(CaseStudyError::InvalidData("Title too long (max 200 characters)".to_string()));
        }

        if case_study.content.trim().is_empty() {
            return Err(CaseStudyError::InvalidData("Content cannot be empty".to_string()));
        }

        if case_study.content.len() < 100 {
            return Err(CaseStudyError::InvalidData("Content too short (minimum 100 characters)".to_string()));
        }

        if case_study.industry.trim().is_empty() {
            return Err(CaseStudyError::InvalidData("Industry cannot be empty".to_string()));
        }

        if case_study.duration_minutes <= 0 {
            return Err(CaseStudyError::InvalidData("Duration must be positive".to_string()));
        }

        if case_study.duration_minutes > 480 {
            return Err(CaseStudyError::InvalidData("Duration cannot exceed 8 hours".to_string()));
        }

        if case_study.learning_objectives.is_empty() {
            return Err(CaseStudyError::InvalidData("At least one learning objective is required".to_string()));
        }

        if case_study.learning_objectives.len() > 10 {
            return Err(CaseStudyError::InvalidData("Too many learning objectives (max 10)".to_string()));
        }

        for objective in &case_study.learning_objectives {
            if objective.trim().is_empty() {
                return Err(CaseStudyError::InvalidData("Learning objectives cannot be empty".to_string()));
            }
        }

        Ok(())
    }

    /// Validate update data
    fn validate_update_data(&self, update: &UpdateCaseStudy) -> Result<()> {
        if let Some(ref title) = update.title {
            if title.trim().is_empty() {
                return Err(CaseStudyError::InvalidData("Title cannot be empty".to_string()));
            }
            if title.len() > 200 {
                return Err(CaseStudyError::InvalidData("Title too long (max 200 characters)".to_string()));
            }
        }

        if let Some(ref content) = update.content {
            if content.trim().is_empty() {
                return Err(CaseStudyError::InvalidData("Content cannot be empty".to_string()));
            }
            if content.len() < 100 {
                return Err(CaseStudyError::InvalidData("Content too short (minimum 100 characters)".to_string()));
            }
        }

        if let Some(ref industry) = update.industry {
            if industry.trim().is_empty() {
                return Err(CaseStudyError::InvalidData("Industry cannot be empty".to_string()));
            }
        }

        if let Some(duration) = update.duration_minutes {
            if duration <= 0 {
                return Err(CaseStudyError::InvalidData("Duration must be positive".to_string()));
            }
            if duration > 480 {
                return Err(CaseStudyError::InvalidData("Duration cannot exceed 8 hours".to_string()));
            }
        }

        if let Some(ref objectives) = update.learning_objectives {
            if objectives.is_empty() {
                return Err(CaseStudyError::InvalidData("At least one learning objective is required".to_string()));
            }
            if objectives.len() > 10 {
                return Err(CaseStudyError::InvalidData("Too many learning objectives (max 10)".to_string()));
            }
            for objective in objectives {
                if objective.trim().is_empty() {
                    return Err(CaseStudyError::InvalidData("Learning objectives cannot be empty".to_string()));
                }
            }
        }

        Ok(())
    }

    /// Validate case study for publishing
    fn validate_for_publishing(&self, case_study: &CaseStudy) -> Result<()> {
        if case_study.status != CaseStudyStatus::Review && case_study.status != CaseStudyStatus::Draft {
            return Err(CaseStudyError::InvalidData(
                "Only draft or review case studies can be published".to_string()
            ));
        }

        if case_study.content.len() < 200 {
            return Err(CaseStudyError::InvalidData(
                "Case study content too short for publishing (minimum 200 characters)".to_string()
            ));
        }

        if case_study.learning_objectives.is_empty() {
            return Err(CaseStudyError::InvalidData(
                "Learning objectives are required for publishing".to_string()
            ));
        }

        Ok(())
    }
}