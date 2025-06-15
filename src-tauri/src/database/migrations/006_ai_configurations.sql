-- AI Configuration Storage
-- Stores the AI provider configurations, settings, and preferences

CREATE TABLE IF NOT EXISTS ai_configurations (
    id INTEGER PRIMARY KEY DEFAULT 1,
    config_data TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT single_config CHECK (id = 1)
);

-- Index for performance (though we only have one row)
CREATE INDEX IF NOT EXISTS idx_ai_configurations_updated_at ON ai_configurations(updated_at);