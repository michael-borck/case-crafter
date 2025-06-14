-- Case Crafter Database Schema
-- SQLite schema for case studies, users, and configurations

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Users table for multi-user support
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT,
    full_name TEXT,
    password_hash TEXT, -- For future authentication if needed
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'instructor', 'user')),
    preferences TEXT, -- JSON for user preferences
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Domains table for categorizing case studies
CREATE TABLE domains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT, -- Hex color for UI theming
    icon TEXT, -- Icon identifier
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default domains
INSERT INTO domains (name, description, color, icon) VALUES
('Business', 'Business strategy, management, and operations', '#2196F3', 'business'),
('Technology', 'Software development, IT systems, and digital transformation', '#4CAF50', 'computer'),
('Healthcare', 'Medical procedures, patient care, and healthcare systems', '#F44336', 'medical_services'),
('Science', 'Research methodologies, experiments, and scientific analysis', '#9C27B0', 'science');

-- Configuration templates for dynamic form generation
CREATE TABLE configuration_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    domain_id INTEGER REFERENCES domains(id),
    template_data TEXT NOT NULL, -- JSON schema for form fields
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Case studies table
CREATE TABLE case_studies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    domain_id INTEGER NOT NULL REFERENCES domains(id),
    template_id INTEGER REFERENCES configuration_templates(id),
    difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    estimated_duration INTEGER, -- in minutes
    learning_objectives TEXT, -- JSON array of objectives
    tags TEXT, -- JSON array of tags for searchability
    content TEXT NOT NULL, -- Main case study content in markdown
    background_info TEXT, -- Additional context
    problem_statement TEXT,
    analysis_framework TEXT, -- Suggested analysis approach
    sample_solution TEXT, -- Optional sample solution
    metadata TEXT, -- JSON for additional properties
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME
);

-- Assessment questions linked to case studies
CREATE TABLE assessment_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_study_id INTEGER NOT NULL REFERENCES case_studies(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'short_answer', 'essay', 'analysis', 'reflection')),
    options TEXT, -- JSON array for multiple choice options
    correct_answer TEXT, -- For multiple choice or specific answers
    sample_answer TEXT, -- Sample answer for open-ended questions
    rubric TEXT, -- JSON rubric for grading criteria
    points INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI generation history and prompts
CREATE TABLE generation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_study_id INTEGER REFERENCES case_studies(id),
    generation_type TEXT NOT NULL CHECK (generation_type IN ('case_study', 'questions', 'outline', 'background')),
    prompt_template TEXT,
    user_input TEXT, -- JSON of user inputs
    ai_provider TEXT, -- 'ollama', 'openai', etc.
    model_name TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    generation_time_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User learning analytics and progress tracking
CREATE TABLE user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    case_study_id INTEGER NOT NULL REFERENCES case_studies(id),
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'reviewed')),
    time_spent INTEGER DEFAULT 0, -- in seconds
    answers TEXT, -- JSON of user answers to assessment questions
    score DECIMAL(5,2), -- Overall score as percentage
    feedback TEXT, -- Instructor or system feedback
    notes TEXT, -- User's personal notes
    started_at DATETIME,
    completed_at DATETIME,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- System settings and application configuration
CREATE TABLE app_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    data_type TEXT DEFAULT 'string' CHECK (data_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    is_user_configurable BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO app_settings (key, value, data_type, description, is_user_configurable) VALUES
('app_version', '0.1.0', 'string', 'Current application version', FALSE),
('theme_mode', 'light', 'string', 'Default theme mode', TRUE),
('ai_provider', 'ollama', 'string', 'Default AI provider', TRUE),
('default_model', 'llama3.2', 'string', 'Default AI model name', TRUE),
('auto_save_interval', '300', 'number', 'Auto-save interval in seconds', TRUE),
('max_case_study_length', '10000', 'number', 'Maximum case study content length', TRUE),
('enable_analytics', 'true', 'boolean', 'Enable learning analytics tracking', TRUE),
('backup_frequency', '86400', 'number', 'Database backup frequency in seconds', TRUE);

-- File attachments for case studies
CREATE TABLE attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_study_id INTEGER NOT NULL REFERENCES case_studies(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_name TEXT,
    file_path TEXT NOT NULL, -- Relative path in app data directory
    file_size INTEGER,
    mime_type TEXT,
    description TEXT,
    uploaded_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Collections/playlists of case studies
CREATE TABLE collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Many-to-many relationship between collections and case studies
CREATE TABLE collection_case_studies (
    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    case_study_id INTEGER NOT NULL REFERENCES case_studies(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (collection_id, case_study_id)
);

-- Indexes for performance optimization
CREATE INDEX idx_case_studies_domain ON case_studies(domain_id);
CREATE INDEX idx_case_studies_status ON case_studies(status);
CREATE INDEX idx_case_studies_created_by ON case_studies(created_by);
CREATE INDEX idx_case_studies_created_at ON case_studies(created_at);
CREATE INDEX idx_assessment_questions_case_study ON assessment_questions(case_study_id);
CREATE INDEX idx_user_progress_user ON user_progress(user_id);
CREATE INDEX idx_user_progress_case_study ON user_progress(case_study_id);
CREATE INDEX idx_generation_history_case_study ON generation_history(case_study_id);
CREATE INDEX idx_attachments_case_study ON attachments(case_study_id);

-- Triggers for maintaining updated_at timestamps
CREATE TRIGGER update_users_timestamp 
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_case_studies_timestamp 
    AFTER UPDATE ON case_studies
    BEGIN
        UPDATE case_studies SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_configuration_templates_timestamp 
    AFTER UPDATE ON configuration_templates
    BEGIN
        UPDATE configuration_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_app_settings_timestamp 
    AFTER UPDATE ON app_settings
    BEGIN
        UPDATE app_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_collections_timestamp 
    AFTER UPDATE ON collections
    BEGIN
        UPDATE collections SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Views for common queries
CREATE VIEW case_study_summary AS
SELECT 
    cs.id,
    cs.title,
    cs.description,
    cs.difficulty_level,
    cs.estimated_duration,
    cs.status,
    cs.created_at,
    cs.updated_at,
    d.name as domain_name,
    d.color as domain_color,
    u.username as author,
    COUNT(aq.id) as question_count
FROM case_studies cs
JOIN domains d ON cs.domain_id = d.id
JOIN users u ON cs.created_by = u.id
LEFT JOIN assessment_questions aq ON cs.id = aq.case_study_id
GROUP BY cs.id, cs.title, cs.description, cs.difficulty_level, 
         cs.estimated_duration, cs.status, cs.created_at, cs.updated_at,
         d.name, d.color, u.username;

CREATE VIEW user_progress_summary AS
SELECT 
    up.user_id,
    u.username,
    COUNT(CASE WHEN up.status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN up.status = 'in_progress' THEN 1 END) as in_progress_count,
    COUNT(*) as total_attempted,
    AVG(up.score) as average_score,
    SUM(up.time_spent) as total_time_spent
FROM user_progress up
JOIN users u ON up.user_id = u.id
GROUP BY up.user_id, u.username;