-- Migration 012: Dynamic Configuration System
-- Create tables for dynamic field configurations and form management

-- Create configurations table for dynamic field configurations
CREATE TABLE configurations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    version TEXT NOT NULL DEFAULT '1.0',
    framework TEXT,
    category TEXT NOT NULL,
    schema_data TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    is_template BOOLEAN NOT NULL DEFAULT 0,
    tags TEXT NOT NULL DEFAULT '[]',
    target_audience TEXT NOT NULL DEFAULT '[]',
    difficulty_level TEXT,
    estimated_minutes INTEGER,
    locale TEXT NOT NULL DEFAULT 'en',
    custom_metadata TEXT NOT NULL DEFAULT '{}',
    created_by TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create configuration usage tracking table
CREATE TABLE configuration_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    configuration_id TEXT NOT NULL,
    user_id TEXT,
    used_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usage_context TEXT NOT NULL,
    usage_metadata TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (configuration_id) REFERENCES configurations(id) ON DELETE CASCADE
);

-- Create form submissions table
CREATE TABLE form_submissions (
    id TEXT PRIMARY KEY,
    configuration_id TEXT NOT NULL,
    user_id TEXT,
    form_data TEXT NOT NULL,
    validation_results TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'processing',
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (configuration_id) REFERENCES configurations(id) ON DELETE CASCADE
);

-- Create indexes for configuration performance
CREATE INDEX idx_configurations_status ON configurations(status);
CREATE INDEX idx_configurations_category ON configurations(category);
CREATE INDEX idx_configurations_framework ON configurations(framework);
CREATE INDEX idx_configurations_is_template ON configurations(is_template);
CREATE INDEX idx_configurations_difficulty_level ON configurations(difficulty_level);
CREATE INDEX idx_configurations_locale ON configurations(locale);
CREATE INDEX idx_configurations_created_by ON configurations(created_by);
CREATE INDEX idx_configurations_created_at ON configurations(created_at);
CREATE INDEX idx_configurations_updated_at ON configurations(updated_at);

CREATE INDEX idx_configuration_usage_configuration_id ON configuration_usage(configuration_id);
CREATE INDEX idx_configuration_usage_user_id ON configuration_usage(user_id);
CREATE INDEX idx_configuration_usage_used_at ON configuration_usage(used_at);
CREATE INDEX idx_configuration_usage_context ON configuration_usage(usage_context);

CREATE INDEX idx_form_submissions_configuration_id ON form_submissions(configuration_id);
CREATE INDEX idx_form_submissions_user_id ON form_submissions(user_id);
CREATE INDEX idx_form_submissions_status ON form_submissions(status);
CREATE INDEX idx_form_submissions_submitted_at ON form_submissions(submitted_at);

-- Create triggers for configuration updated_at timestamps
CREATE TRIGGER update_configurations_updated_at
    AFTER UPDATE ON configurations
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE configurations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_form_submissions_updated_at
    AFTER UPDATE ON form_submissions
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE form_submissions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;