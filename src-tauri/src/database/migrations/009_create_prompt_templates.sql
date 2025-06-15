-- Create prompt template categories table
CREATE TABLE IF NOT EXISTS template_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- Create prompt templates table
CREATE TABLE IF NOT EXISTS prompt_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id TEXT NOT NULL UNIQUE, -- UUID for external reference
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    system_prompt TEXT,
    user_prompt TEXT NOT NULL,
    variables TEXT NOT NULL, -- JSON array of TemplateVariable
    example_values TEXT, -- JSON object
    tags TEXT, -- JSON array
    version TEXT NOT NULL DEFAULT '1.0.0',
    is_active BOOLEAN NOT NULL DEFAULT 1,
    is_system_template BOOLEAN NOT NULL DEFAULT 0, -- Built-in templates
    created_by INTEGER,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at DATETIME NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create template usage statistics table
CREATE TABLE IF NOT EXISTS template_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id TEXT NOT NULL,
    user_id INTEGER,
    generation_id INTEGER, -- Link to generation_history
    variables_used TEXT, -- JSON object of variables used
    success BOOLEAN NOT NULL DEFAULT 1,
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (template_id) REFERENCES prompt_templates(template_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (generation_id) REFERENCES generation_history(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prompt_templates_template_id ON prompt_templates(template_id);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_active ON prompt_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_system ON prompt_templates(is_system_template);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_created_by ON prompt_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_created_at ON prompt_templates(created_at);

CREATE INDEX IF NOT EXISTS idx_template_usage_template_id ON template_usage(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_user_id ON template_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_created_at ON template_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_template_usage_success ON template_usage(success);

CREATE INDEX IF NOT EXISTS idx_template_categories_active ON template_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_template_categories_sort_order ON template_categories(sort_order);

-- Insert default template categories
INSERT OR IGNORE INTO template_categories (name, description, icon, color, sort_order) VALUES
('generation', 'Content generation templates', 'create', '#1976d2', 1),
('planning', 'Planning and structure templates', 'outline', '#388e3c', 2),
('content', 'Content development templates', 'content_paste', '#f57c00', 3),
('guidance', 'Analysis and guidance templates', 'compass_calibration', '#7b1fa2', 4),
('solution', 'Solution and example templates', 'lightbulb', '#c62828', 5),
('assessment', 'Assessment and evaluation templates', 'quiz', '#00796b', 6);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_prompt_templates_updated_at
    AFTER UPDATE ON prompt_templates
    FOR EACH ROW
BEGIN
    UPDATE prompt_templates SET updated_at = datetime('now') WHERE id = NEW.id;
END;