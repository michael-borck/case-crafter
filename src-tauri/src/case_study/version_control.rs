// Version control system for case studies

use super::models::*;
use super::{CaseStudyError, Result};
use crate::database::DatabaseManager;
use sqlx::Row;
use chrono::Utc;
use uuid::Uuid;

/// Version control system for tracking case study changes
pub struct CaseStudyVersionControl {
    db: DatabaseManager,
}

impl CaseStudyVersionControl {
    pub fn new(db: DatabaseManager) -> Self {
        Self { db }
    }

    /// Create a new version of a case study
    pub async fn create_version(
        &self,
        case_study: &CaseStudy,
        changes_summary: &str,
        previous_version: Option<&CaseStudy>,
    ) -> Result<CaseStudyVersion> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let metadata_json = serde_json::to_string(&case_study.metadata)?;

        let version = sqlx::query(
            r#"
            INSERT INTO case_study_versions (
                id, case_study_id, version_number, title, content, summary,
                changes_summary, metadata, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id, case_study_id, version_number, title, content, summary,
                     changes_summary, metadata, created_by, created_at
            "#,
        )
        .bind(&id)
        .bind(&case_study.id)
        .bind(case_study.version)
        .bind(&case_study.title)
        .bind(&case_study.content)
        .bind(&case_study.summary)
        .bind(changes_summary)
        .bind(&metadata_json)
        .bind(&case_study.created_by)
        .bind(now)
        .fetch_one(self.db.pool())
        .await?;

        self.parse_version_row(version).await
    }

    /// Get all versions of a case study
    pub async fn get_versions(&self, case_study_id: &str) -> Result<Vec<CaseStudyVersion>> {
        let rows = sqlx::query(
            r#"
            SELECT id, case_study_id, version_number, title, content, summary,
                   changes_summary, metadata, created_by, created_at
            FROM case_study_versions 
            WHERE case_study_id = ?
            ORDER BY version_number DESC
            "#,
        )
        .bind(case_study_id)
        .fetch_all(self.db.pool())
        .await?;

        let mut versions = Vec::new();
        for row in rows {
            versions.push(self.parse_version_row(row).await?);
        }

        Ok(versions)
    }

    /// Get a specific version of a case study
    pub async fn get_version(&self, case_study_id: &str, version_number: i32) -> Result<Option<CaseStudyVersion>> {
        let row = sqlx::query(
            r#"
            SELECT id, case_study_id, version_number, title, content, summary,
                   changes_summary, metadata, created_by, created_at
            FROM case_study_versions 
            WHERE case_study_id = ? AND version_number = ?
            "#,
        )
        .bind(case_study_id)
        .bind(version_number)
        .fetch_optional(self.db.pool())
        .await?;

        if let Some(row) = row {
            Ok(Some(self.parse_version_row(row).await?))
        } else {
            Ok(None)
        }
    }

    /// Get the latest version of a case study
    pub async fn get_latest_version(&self, case_study_id: &str) -> Result<Option<CaseStudyVersion>> {
        let row = sqlx::query(
            r#"
            SELECT id, case_study_id, version_number, title, content, summary,
                   changes_summary, metadata, created_by, created_at
            FROM case_study_versions 
            WHERE case_study_id = ?
            ORDER BY version_number DESC
            LIMIT 1
            "#,
        )
        .bind(case_study_id)
        .fetch_optional(self.db.pool())
        .await?;

        if let Some(row) = row {
            Ok(Some(self.parse_version_row(row).await?))
        } else {
            Ok(None)
        }
    }

    /// Compare two versions and get the differences
    pub async fn compare_versions(
        &self,
        case_study_id: &str,
        version1: i32,
        version2: i32,
    ) -> Result<VersionComparison> {
        let v1 = self.get_version(case_study_id, version1).await?
            .ok_or_else(|| CaseStudyError::NotFound(format!("Version {} not found", version1)))?;
        
        let v2 = self.get_version(case_study_id, version2).await?
            .ok_or_else(|| CaseStudyError::NotFound(format!("Version {} not found", version2)))?;

        Ok(VersionComparison {
            version1: v1.clone(),
            version2: v2.clone(),
            differences: self.calculate_differences(&v1, &v2),
        })
    }

    /// Delete old versions (keep only recent N versions)
    pub async fn cleanup_old_versions(&self, case_study_id: &str, keep_count: i32) -> Result<i32> {
        let deleted_count = sqlx::query(
            r#"
            DELETE FROM case_study_versions 
            WHERE case_study_id = ? 
            AND version_number NOT IN (
                SELECT version_number FROM case_study_versions 
                WHERE case_study_id = ?
                ORDER BY version_number DESC 
                LIMIT ?
            )
            "#,
        )
        .bind(case_study_id)
        .bind(case_study_id)
        .bind(keep_count)
        .execute(self.db.pool())
        .await?;

        Ok(deleted_count.rows_affected() as i32)
    }

    /// Get version history statistics
    pub async fn get_version_statistics(&self, case_study_id: &str) -> Result<VersionStatistics> {
        let stats = sqlx::query(
            r#"
            SELECT 
                COUNT(*) as total_versions,
                MIN(created_at) as first_version_date,
                MAX(created_at) as last_version_date,
                COUNT(DISTINCT created_by) as contributor_count
            FROM case_study_versions 
            WHERE case_study_id = ?
            "#,
        )
        .bind(case_study_id)
        .fetch_one(self.db.pool())
        .await?;

        // Get contributors
        let contributors = sqlx::query(
            r#"
            SELECT DISTINCT created_by, COUNT(*) as version_count
            FROM case_study_versions 
            WHERE case_study_id = ? AND created_by IS NOT NULL
            GROUP BY created_by
            ORDER BY version_count DESC
            "#,
        )
        .bind(case_study_id)
        .fetch_all(self.db.pool())
        .await?;

        let contributor_list: Vec<VersionContributor> = contributors
            .into_iter()
            .filter_map(|row| {
                let created_by: Option<String> = row.try_get("created_by").ok()?;
                let version_count: i64 = row.try_get("version_count").ok()?;
                created_by.map(|created_by| VersionContributor {
                    user_id: created_by,
                    version_count: version_count as i32,
                })
            })
            .collect();

        let total_versions: i64 = stats.try_get("total_versions")?;
        let first_version_date: Option<chrono::DateTime<chrono::Utc>> = stats.try_get("first_version_date")?;
        let last_version_date: Option<chrono::DateTime<chrono::Utc>> = stats.try_get("last_version_date")?;
        let contributor_count: i64 = stats.try_get("contributor_count")?;

        Ok(VersionStatistics {
            total_versions: total_versions as i32,
            first_version_date,
            last_version_date,
            contributor_count: contributor_count as i32,
            contributors: contributor_list,
        })
    }

    /// Calculate differences between two versions
    fn calculate_differences(&self, version1: &CaseStudyVersion, version2: &CaseStudyVersion) -> Vec<VersionDifference> {
        let mut differences = Vec::new();

        // Title changes
        if version1.title != version2.title {
            differences.push(VersionDifference {
                field: "title".to_string(),
                change_type: "modified".to_string(),
                old_value: Some(version1.title.clone()),
                new_value: Some(version2.title.clone()),
            });
        }

        // Content changes
        if version1.content != version2.content {
            differences.push(VersionDifference {
                field: "content".to_string(),
                change_type: "modified".to_string(),
                old_value: Some(format!("Content ({} chars)", version1.content.len())),
                new_value: Some(format!("Content ({} chars)", version2.content.len())),
            });
        }

        // Summary changes
        if version1.summary != version2.summary {
            differences.push(VersionDifference {
                field: "summary".to_string(),
                change_type: "modified".to_string(),
                old_value: version1.summary.clone(),
                new_value: version2.summary.clone(),
            });
        }

        differences
    }

    /// Helper method to parse version row
    async fn parse_version_row(&self, row: sqlx::sqlite::SqliteRow) -> Result<CaseStudyVersion> {
        let metadata_json: String = row.try_get("metadata")?;
        let metadata: CaseStudyMetadata = serde_json::from_str(&metadata_json)?;

        Ok(CaseStudyVersion {
            id: row.try_get("id")?,
            case_study_id: row.try_get("case_study_id")?,
            version_number: row.try_get("version_number")?,
            title: row.try_get("title")?,
            content: row.try_get("content")?,
            summary: row.try_get("summary")?,
            changes_summary: row.try_get("changes_summary")?,
            metadata,
            created_by: row.try_get("created_by")?,
            created_at: row.try_get("created_at")?,
        })
    }
}

/// Version comparison result
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct VersionComparison {
    pub version1: CaseStudyVersion,
    pub version2: CaseStudyVersion,
    pub differences: Vec<VersionDifference>,
}

/// Individual difference between versions
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct VersionDifference {
    pub field: String,
    pub change_type: String, // "added", "removed", "modified"
    pub old_value: Option<String>,
    pub new_value: Option<String>,
}

/// Version statistics for a case study
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct VersionStatistics {
    pub total_versions: i32,
    pub first_version_date: Option<chrono::DateTime<chrono::Utc>>,
    pub last_version_date: Option<chrono::DateTime<chrono::Utc>>,
    pub contributor_count: i32,
    pub contributors: Vec<VersionContributor>,
}

/// Version contributor information
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct VersionContributor {
    pub user_id: String,
    pub version_count: i32,
}