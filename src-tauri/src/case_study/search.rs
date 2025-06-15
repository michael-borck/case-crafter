// Advanced search engine for case studies

use super::models::*;
use super::{CaseStudyError, Result};
use crate::database::DatabaseManager;
use sqlx::Row;
use std::collections::HashMap;

/// Search engine for case studies with advanced filtering and ranking
pub struct CaseStudySearchEngine {
    db: DatabaseManager,
}

impl CaseStudySearchEngine {
    pub fn new(db: DatabaseManager) -> Self {
        Self { db }
    }

    /// Advanced search with multiple criteria and ranking
    pub async fn search(&self, query: CaseStudySearchQuery) -> Result<Vec<CaseStudy>> {
        if query.query.trim().is_empty() {
            return self.list_with_filters(query).await;
        }

        let search_terms = self.parse_search_query(&query.query);
        let mut search_results = Vec::new();

        // Perform search with relevance scoring
        for case_study in self.execute_search_query(&query, &search_terms).await? {
            let score = self.calculate_relevance_score(&case_study, &search_terms);
            search_results.push((case_study, score));
        }

        // Sort by relevance score
        search_results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        // Extract case studies and apply pagination
        let case_studies: Vec<CaseStudy> = search_results.into_iter().map(|(cs, _)| cs).collect();
        
        let offset = query.offset.unwrap_or(0) as usize;
        let limit = query.limit.unwrap_or(20) as usize;
        
        Ok(case_studies.into_iter().skip(offset).take(limit).collect())
    }

    /// Search for similar case studies based on content and metadata
    pub async fn find_similar(&self, case_study_id: &str, limit: i32) -> Result<Vec<CaseStudy>> {
        let reference = match self.get_case_study_for_search(case_study_id).await? {
            Some(case_study) => case_study,
            None => return Ok(Vec::new()),
        };

        // Create search terms from the reference case study
        let content_terms = self.extract_key_terms(&reference.content);
        let industry_terms = vec![reference.industry.clone()];
        let objective_terms = reference.learning_objectives.clone();

        // Build similarity query
        let query = CaseStudySearchQuery {
            query: format!("{} {} {}", 
                content_terms.join(" "), 
                industry_terms.join(" "), 
                objective_terms.join(" ")
            ),
            filters: Some(CaseStudyFilter {
                industry: Some(reference.industry),
                difficulty_level: Some(reference.difficulty_level),
                status: Some(CaseStudyStatus::Published),
                ..Default::default()
            }),
            sort_by: Some("relevance".to_string()),
            sort_order: Some("desc".to_string()),
            limit: Some(limit + 1), // +1 to exclude the reference case study
            offset: Some(0),
            include_content: true,
            include_archived: false,
        };

        let mut results = self.search(query).await?;
        
        // Remove the reference case study from results
        results.retain(|cs| cs.id != case_study_id);
        
        // Limit to requested count
        results.truncate(limit as usize);
        
        Ok(results)
    }

    /// Search by tags
    pub async fn search_by_tags(&self, tags: Vec<String>, limit: i32, offset: i32) -> Result<Vec<CaseStudy>> {
        let filter = CaseStudyFilter {
            tags: Some(tags),
            ..Default::default()
        };

        let query = CaseStudySearchQuery {
            query: String::new(),
            filters: Some(filter),
            limit: Some(limit),
            offset: Some(offset),
            include_content: true,
            include_archived: false,
            ..Default::default()
        };

        self.list_with_filters(query).await
    }

    /// Get search suggestions based on partial query
    pub async fn get_search_suggestions(&self, _partial_query: &str, _limit: i32) -> Result<Vec<String>> {
        // Simplified for now - return empty suggestions
        Ok(Vec::new())
    }

    /// Index case study for search (called when case study is created/updated)
    pub async fn index_case_study(&self, case_study: &CaseStudy) -> Result<()> {
        // For now, this is a placeholder for future full-text search indexing
        // In a production system, you might update a dedicated search index here
        Ok(())
    }

    /// Update case study index (called when case study is updated)
    pub async fn update_case_study_index(&self, case_study: &CaseStudy) -> Result<()> {
        // Placeholder for updating search index
        Ok(())
    }

    /// Remove case study from search index (called when case study is deleted)
    pub async fn remove_case_study_index(&self, case_study_id: &str) -> Result<()> {
        // Placeholder for removing from search index
        Ok(())
    }

    /// Get trending case studies based on recent activity
    pub async fn get_trending(&self, limit: i32) -> Result<Vec<CaseStudy>> {
        // This would typically involve usage analytics
        // For now, return recently published case studies
        let filter = CaseStudyFilter {
            status: Some(CaseStudyStatus::Published),
            ..Default::default()
        };

        let query = CaseStudySearchQuery {
            query: String::new(),
            filters: Some(filter),
            sort_by: Some("published_at".to_string()),
            sort_order: Some("desc".to_string()),
            limit: Some(limit),
            offset: Some(0),
            include_content: true,
            include_archived: false,
        };

        self.list_with_filters(query).await
    }

    /// Execute the main search query
    async fn execute_search_query(
        &self,
        query: &CaseStudySearchQuery,
        search_terms: &[String],
    ) -> Result<Vec<CaseStudy>> {
        let mut sql_query = String::from(
            r#"
            SELECT id, title, description, content, summary, status, category_id,
                   industry, difficulty_level, duration_minutes, word_count,
                   learning_objectives, metadata, version, created_by,
                   created_at, updated_at, published_at, archived_at
            FROM case_studies 
            WHERE status != 'deleted'
            "#
        );

        let mut params: Vec<String> = Vec::new();

        // Add search conditions
        if !search_terms.is_empty() {
            let search_conditions: Vec<String> = search_terms
                .iter()
                .map(|term| {
                    params.push(format!("%{}%", term));
                    params.push(format!("%{}%", term));
                    params.push(format!("%{}%", term));
                    params.push(format!("%{}%", term));
                    "(title LIKE ? OR description LIKE ? OR content LIKE ? OR industry LIKE ?)".to_string()
                })
                .collect();

            sql_query.push_str(&format!(" AND ({})", search_conditions.join(" OR ")));
        }

        // Apply filters
        self.apply_filters_to_query(&mut sql_query, &mut params, &query.filters).await?;

        // Add sorting
        if let Some(ref sort_by) = query.sort_by {
            let sort_order = query.sort_order.as_deref().unwrap_or("desc");
            match sort_by.as_str() {
                "title" => sql_query.push_str(&format!(" ORDER BY title {}", sort_order)),
                "created_at" => sql_query.push_str(&format!(" ORDER BY created_at {}", sort_order)),
                "updated_at" => sql_query.push_str(&format!(" ORDER BY updated_at {}", sort_order)),
                "word_count" => sql_query.push_str(&format!(" ORDER BY word_count {}", sort_order)),
                "duration" => sql_query.push_str(&format!(" ORDER BY duration_minutes {}", sort_order)),
                _ => sql_query.push_str(" ORDER BY updated_at DESC"),
            }
        } else {
            sql_query.push_str(" ORDER BY updated_at DESC");
        }

        // Execute query
        let mut query_builder = sqlx::query(&sql_query);
        for param in params {
            query_builder = query_builder.bind(param);
        }

        let rows = query_builder.fetch_all(self.db.pool()).await?;
        let mut case_studies = Vec::new();

        for row in rows {
            case_studies.push(self.parse_case_study_row(row).await?);
        }

        Ok(case_studies)
    }

    /// List case studies with filters (no text search)
    async fn list_with_filters(&self, query: CaseStudySearchQuery) -> Result<Vec<CaseStudy>> {
        let mut sql_query = String::from(
            r#"
            SELECT id, title, description, content, summary, status, category_id,
                   industry, difficulty_level, duration_minutes, word_count,
                   learning_objectives, metadata, version, created_by,
                   created_at, updated_at, published_at, archived_at
            FROM case_studies 
            WHERE status != 'deleted'
            "#
        );

        let mut params: Vec<String> = Vec::new();

        // Apply filters
        self.apply_filters_to_query(&mut sql_query, &mut params, &query.filters).await?;

        // Add sorting
        if let Some(ref sort_by) = query.sort_by {
            let sort_order = query.sort_order.as_deref().unwrap_or("desc");
            match sort_by.as_str() {
                "title" => sql_query.push_str(&format!(" ORDER BY title {}", sort_order)),
                "created_at" => sql_query.push_str(&format!(" ORDER BY created_at {}", sort_order)),
                "updated_at" => sql_query.push_str(&format!(" ORDER BY updated_at {}", sort_order)),
                "word_count" => sql_query.push_str(&format!(" ORDER BY word_count {}", sort_order)),
                "duration" => sql_query.push_str(&format!(" ORDER BY duration_minutes {}", sort_order)),
                _ => sql_query.push_str(" ORDER BY updated_at DESC"),
            }
        }

        // Add pagination
        if let Some(limit) = query.limit {
            sql_query.push_str(&format!(" LIMIT {}", limit));
            if let Some(offset) = query.offset {
                sql_query.push_str(&format!(" OFFSET {}", offset));
            }
        }

        // Execute query
        let mut query_builder = sqlx::query(&sql_query);
        for param in params {
            query_builder = query_builder.bind(param);
        }

        let rows = query_builder.fetch_all(self.db.pool()).await?;
        let mut case_studies = Vec::new();

        for row in rows {
            case_studies.push(self.parse_case_study_row(row).await?);
        }

        Ok(case_studies)
    }

    /// Apply filters to SQL query
    async fn apply_filters_to_query(
        &self,
        sql_query: &mut String,
        params: &mut Vec<String>,
        filters: &Option<CaseStudyFilter>,
    ) -> Result<()> {
        if let Some(filter) = filters {
            if let Some(ref status) = filter.status {
                sql_query.push_str(" AND status = ?");
                params.push(status.to_string());
            }

            if let Some(ref category_id) = filter.category_id {
                sql_query.push_str(" AND category_id = ?");
                params.push(category_id.clone());
            }

            if let Some(ref industry) = filter.industry {
                sql_query.push_str(" AND industry = ?");
                params.push(industry.clone());
            }

            if let Some(ref difficulty_level) = filter.difficulty_level {
                sql_query.push_str(" AND difficulty_level = ?");
                params.push(difficulty_level.clone());
            }

            if let Some(ref created_by) = filter.created_by {
                sql_query.push_str(" AND created_by = ?");
                params.push(created_by.clone());
            }

            if let Some(created_after) = filter.created_after {
                sql_query.push_str(" AND created_at >= ?");
                params.push(created_after.to_rfc3339());
            }

            if let Some(created_before) = filter.created_before {
                sql_query.push_str(" AND created_at <= ?");
                params.push(created_before.to_rfc3339());
            }

            if let Some(min_duration) = filter.min_duration {
                sql_query.push_str(" AND duration_minutes >= ?");
                params.push(min_duration.to_string());
            }

            if let Some(max_duration) = filter.max_duration {
                sql_query.push_str(" AND duration_minutes <= ?");
                params.push(max_duration.to_string());
            }

            if let Some(min_word_count) = filter.min_word_count {
                sql_query.push_str(" AND word_count >= ?");
                params.push(min_word_count.to_string());
            }

            if let Some(max_word_count) = filter.max_word_count {
                sql_query.push_str(" AND word_count <= ?");
                params.push(max_word_count.to_string());
            }
        }

        Ok(())
    }

    /// Parse search query into individual terms
    fn parse_search_query(&self, query: &str) -> Vec<String> {
        query
            .split_whitespace()
            .filter(|term| term.len() > 2) // Filter out very short terms
            .map(|term| term.to_lowercase())
            .collect()
    }

    /// Calculate relevance score for search results
    fn calculate_relevance_score(&self, case_study: &CaseStudy, search_terms: &[String]) -> f64 {
        let mut score = 0.0;

        for term in search_terms {
            // Title matches have highest weight
            if case_study.title.to_lowercase().contains(term) {
                score += 10.0;
            }

            // Description matches
            if let Some(ref description) = case_study.description {
                if description.to_lowercase().contains(term) {
                    score += 5.0;
                }
            }

            // Industry matches
            if case_study.industry.to_lowercase().contains(term) {
                score += 7.0;
            }

            // Content matches (lower weight due to volume)
            if case_study.content.to_lowercase().contains(term) {
                score += 2.0;
            }

            // Learning objectives matches
            for objective in &case_study.learning_objectives {
                if objective.to_lowercase().contains(term) {
                    score += 3.0;
                }
            }
        }

        // Boost score for published content
        if case_study.status == CaseStudyStatus::Published {
            score *= 1.2;
        }

        score
    }

    /// Extract key terms from content for similarity matching
    fn extract_key_terms(&self, content: &str) -> Vec<String> {
        let words: Vec<String> = content
            .split_whitespace()
            .filter(|word| word.len() > 4) // Only meaningful words
            .map(|word| word.to_lowercase())
            .collect();

        // Simple frequency analysis to find key terms
        let mut word_count: HashMap<String, usize> = HashMap::new();
        for word in words {
            *word_count.entry(word).or_insert(0) += 1;
        }

        // Sort by frequency and take top terms
        let mut sorted_words: Vec<(String, usize)> = word_count.into_iter().collect();
        sorted_words.sort_by(|a, b| b.1.cmp(&a.1));

        sorted_words
            .into_iter()
            .take(10) // Top 10 terms
            .map(|(word, _)| word)
            .collect()
    }

    /// Helper method to get case study for search operations
    async fn get_case_study_for_search(&self, id: &str) -> Result<Option<CaseStudy>> {
        let row = sqlx::query(
            r#"
            SELECT id, title, description, content, summary, status, category_id,
                   industry, difficulty_level, duration_minutes, word_count,
                   learning_objectives, metadata, version, created_by,
                   created_at, updated_at, published_at, archived_at
            FROM case_studies 
            WHERE id = ? AND status != 'deleted'
            "#
        )
        .bind(id)
        .fetch_optional(self.db.pool())
        .await?;

        if let Some(row) = row {
            Ok(Some(self.parse_case_study_row(row).await?))
        } else {
            Ok(None)
        }
    }

    /// Helper method to parse case study row
    async fn parse_case_study_row(&self, row: sqlx::sqlite::SqliteRow) -> Result<CaseStudy> {
        let learning_objectives_json: String = row.try_get("learning_objectives")?;
        let metadata_json: String = row.try_get("metadata")?;

        let learning_objectives: Vec<String> = serde_json::from_str(&learning_objectives_json)?;
        let metadata: CaseStudyMetadata = serde_json::from_str(&metadata_json)?;

        Ok(CaseStudy {
            id: row.try_get("id")?,
            title: row.try_get("title")?,
            description: row.try_get("description")?,
            content: row.try_get("content")?,
            summary: row.try_get("summary")?,
            status: row.try_get("status")?,
            category_id: row.try_get("category_id")?,
            industry: row.try_get("industry")?,
            difficulty_level: row.try_get("difficulty_level")?,
            duration_minutes: row.try_get("duration_minutes")?,
            word_count: row.try_get("word_count")?,
            learning_objectives,
            metadata,
            version: row.try_get("version")?,
            created_by: row.try_get("created_by")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
            published_at: row.try_get("published_at")?,
            archived_at: row.try_get("archived_at")?,
        })
    }
}