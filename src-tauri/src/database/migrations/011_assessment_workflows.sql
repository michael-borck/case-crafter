-- Migration 011: Assessment workflow integration tables

-- Assessment workflows table
CREATE TABLE assessment_workflows (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    case_study_id TEXT NOT NULL,
    workflow_type TEXT NOT NULL, -- JSON serialized AssessmentWorkflowType
    configuration TEXT NOT NULL, -- JSON serialized AssessmentConfiguration
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived', 'deleted')),
    estimated_duration INTEGER NOT NULL, -- minutes
    difficulty_level TEXT NOT NULL,
    learning_objectives TEXT NOT NULL, -- JSON array
    instructions TEXT,
    metadata TEXT NOT NULL DEFAULT '{}', -- JSON object for enhanced metadata
    created_by TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME,
    FOREIGN KEY (case_study_id) REFERENCES case_studies(id) ON DELETE CASCADE
);

-- Assessment sessions table for tracking user progress
CREATE TABLE assessment_sessions (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    session_state TEXT NOT NULL DEFAULT 'not_started' CHECK (session_state IN ('not_started', 'in_progress', 'paused', 'completed', 'submitted', 'timed_out', 'abandoned')),
    current_question_id TEXT,
    responses TEXT NOT NULL DEFAULT '{}', -- JSON object of QuestionResponse
    start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    last_activity DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    time_spent INTEGER NOT NULL DEFAULT 0, -- seconds
    attempt_number INTEGER NOT NULL DEFAULT 1,
    completion_percentage REAL NOT NULL DEFAULT 0.0,
    current_score REAL,
    final_score REAL,
    passed BOOLEAN,
    session_data TEXT NOT NULL DEFAULT '{}', -- JSON object for SessionData
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES assessment_workflows(id) ON DELETE CASCADE
);

-- Assessment results archive table
CREATE TABLE assessment_results (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    overall_score REAL NOT NULL,
    percentage_score REAL NOT NULL,
    passed BOOLEAN NOT NULL,
    completion_time INTEGER NOT NULL, -- seconds
    question_results TEXT NOT NULL, -- JSON array of QuestionResult
    competency_scores TEXT NOT NULL DEFAULT '{}', -- JSON object
    difficulty_performance TEXT NOT NULL DEFAULT '{}', -- JSON object
    time_analysis TEXT NOT NULL DEFAULT '{}', -- JSON object for TimeAnalysis
    learning_insights TEXT NOT NULL DEFAULT '{}', -- JSON object for LearningInsights
    recommendations TEXT NOT NULL DEFAULT '[]', -- JSON array of LearningRecommendation
    generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (workflow_id) REFERENCES assessment_workflows(id) ON DELETE CASCADE
);

-- Question bank table for storing generated questions
CREATE TABLE assessment_questions_bank (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    question_type TEXT NOT NULL, -- 'single_choice', 'multiple_choice', 'text_input', etc.
    question_text TEXT NOT NULL,
    options TEXT, -- JSON array of question options
    correct_answer TEXT, -- JSON for correct answer(s)
    explanation TEXT,
    difficulty_level TEXT NOT NULL,
    competencies TEXT NOT NULL DEFAULT '[]', -- JSON array
    bloom_taxonomy_level TEXT,
    estimated_time INTEGER, -- seconds to answer
    metadata TEXT NOT NULL DEFAULT '{}', -- JSON object
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES assessment_workflows(id) ON DELETE CASCADE
);

-- Indexes for performance optimization
CREATE INDEX idx_assessment_workflows_case_study_id ON assessment_workflows(case_study_id);
CREATE INDEX idx_assessment_workflows_status ON assessment_workflows(status);
CREATE INDEX idx_assessment_workflows_difficulty ON assessment_workflows(difficulty_level);
CREATE INDEX idx_assessment_workflows_created_at ON assessment_workflows(created_at);
CREATE INDEX idx_assessment_workflows_updated_at ON assessment_workflows(updated_at);

CREATE INDEX idx_assessment_sessions_workflow_id ON assessment_sessions(workflow_id);
CREATE INDEX idx_assessment_sessions_user_id ON assessment_sessions(user_id);
CREATE INDEX idx_assessment_sessions_state ON assessment_sessions(session_state);
CREATE INDEX idx_assessment_sessions_workflow_user ON assessment_sessions(workflow_id, user_id);
CREATE INDEX idx_assessment_sessions_created_at ON assessment_sessions(created_at);
CREATE INDEX idx_assessment_sessions_last_activity ON assessment_sessions(last_activity);

CREATE INDEX idx_assessment_results_session_id ON assessment_results(session_id);
CREATE INDEX idx_assessment_results_workflow_id ON assessment_results(workflow_id);
CREATE INDEX idx_assessment_results_user_id ON assessment_results(user_id);
CREATE INDEX idx_assessment_results_passed ON assessment_results(passed);
CREATE INDEX idx_assessment_results_generated_at ON assessment_results(generated_at);

CREATE INDEX idx_assessment_questions_workflow_id ON assessment_questions_bank(workflow_id);
CREATE INDEX idx_assessment_questions_type ON assessment_questions_bank(question_type);
CREATE INDEX idx_assessment_questions_difficulty ON assessment_questions_bank(difficulty_level);

-- Triggers for automatic updated_at timestamp
CREATE TRIGGER update_assessment_workflows_updated_at
    AFTER UPDATE ON assessment_workflows
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE assessment_workflows SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_assessment_sessions_updated_at
    AFTER UPDATE ON assessment_sessions
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE assessment_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_assessment_questions_updated_at
    AFTER UPDATE ON assessment_questions_bank
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE assessment_questions_bank SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;