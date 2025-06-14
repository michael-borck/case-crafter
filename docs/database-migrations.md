# Database Migration System

## Overview

The Case Crafter application includes a robust database migration system built on SQLx for SQLite. This system ensures safe, versioned schema updates across development, testing, and production deployments.

## Features

- **Versioned Migrations**: Each migration has a unique version identifier
- **Dependency Management**: Migrations can specify dependencies on other migrations
- **Checksum Validation**: Migration integrity is verified using MD5 checksums
- **Rollback Support**: Ability to rollback individual migrations
- **Transaction Safety**: All migrations run within database transactions
- **CLI Interface**: Command-line tools for migration management
- **Automatic Application**: Migrations run automatically on app startup

## Migration Structure

Each migration consists of:
- **Version**: Unique identifier (e.g., "001", "002")
- **Name**: Descriptive name for the migration
- **Description**: Detailed explanation of changes
- **Up SQL**: Forward migration SQL statements
- **Down SQL**: Rollback SQL statements
- **Dependencies**: List of required prior migrations
- **Timestamp**: Creation time for audit purposes

## Migration Table

The system maintains a `schema_migrations` table:

```sql
CREATE TABLE schema_migrations (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    checksum TEXT NOT NULL
);
```

## Usage

### Automatic Migrations

Migrations run automatically when the application starts:

```rust
// In main.rs
let db_manager = DatabaseManager::new(&app_handle).await?;
// Migrations are applied during initialization
```

### Manual Migration Commands

#### Via Tauri Commands (Frontend)

```typescript
// Check migration status
const stats = await invoke('get_database_stats');

// Run migrations
const result = await invoke('run_database_migration', { command: 'migrate' });

// Check status
const result = await invoke('run_database_migration', { command: 'status' });

// Rollback specific migration
const result = await invoke('run_database_migration', { 
    command: 'rollback:002' 
});
```

#### Via CLI Tool

```bash
# Run all pending migrations
cargo run --bin migrate migrate

# Check migration status
cargo run --bin migrate status

# Rollback specific migration
cargo run --bin migrate rollback:002
```

#### Via Rust API

```rust
use case_crafter::database::{DatabaseManager, MigrationManager};

// Initialize database with migrations
let db_manager = DatabaseManager::new(&app_handle).await?;

// Manual migration control
let migration_manager = MigrationManager::new(db_manager.pool().clone());
migration_manager.migrate().await?;
migration_manager.status().await?;
migration_manager.rollback_migration("002").await?;
```

## Built-in Migrations

### Migration 001: Initial Schema
- Creates all core tables (users, domains, case_studies, etc.)
- Sets up indexes and triggers
- Inserts default data (domains, settings)
- Establishes foreign key relationships

### Migration 002: Performance Indexes
- Adds additional indexes for query optimization
- Improves search and filtering performance
- Depends on Migration 001

## Creating New Migrations

To add a new migration:

1. **Register in MigrationManager**:
```rust
fn register_initial_migrations(&mut self) {
    let migration_003 = Migration {
        version: "003".to_string(),
        name: "add_user_preferences".to_string(),
        description: "Add user preferences table".to_string(),
        up_sql: r#"
            CREATE TABLE user_preferences (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                UNIQUE(user_id, key)
            );
        "#.to_string(),
        down_sql: r#"
            DROP TABLE user_preferences;
        "#.to_string(),
        dependencies: vec!["001".to_string()],
        created_at: Utc::now(),
    };
    
    self.register_migration(migration_003);
}
```

2. **Version Naming Convention**:
   - Use 3-digit zero-padded numbers: 001, 002, 003...
   - Sequential ordering for dependency resolution
   - Descriptive names in snake_case

3. **SQL Guidelines**:
   - Use `CREATE TABLE IF NOT EXISTS` for safety
   - Include proper foreign key constraints
   - Add indexes for performance-critical queries
   - Provide complete rollback SQL

## Safety Features

### Transaction Safety
- Each migration runs in a database transaction
- Failure rolls back all changes from that migration
- Database remains in consistent state

### Dependency Checking
- Dependencies are verified before applying migrations
- Prevents applying migrations out of order
- Clear error messages for missing dependencies

### Checksum Validation
- Migration SQL is checksummed on application
- Prevents accidental modification of applied migrations
- Ensures migration integrity across environments

### Error Handling
- Comprehensive error types for different failure scenarios
- Detailed error messages for debugging
- Graceful degradation on migration failures

## Database Connection Management

### Connection Pooling
- SQLite connection pool with configurable size
- WAL mode for better concurrency
- Foreign key constraints enabled
- Busy timeout for locked database handling

### Path Management
- Database stored in app data directory
- Cross-platform path resolution
- Automatic directory creation
- Backup and restore functionality

## Monitoring and Maintenance

### Migration Status
```bash
Migration Status:
================

Applied migrations:
  ✓ 001 - initial_schema (applied: 2025-01-15 10:30:00)
  ✓ 002 - add_performance_indexes (applied: 2025-01-15 10:30:01)

Pending migrations:
  ○ 003 - add_user_preferences
```

### Database Statistics
- Table row counts
- Database file size
- Performance metrics
- Health check status

### Backup Integration
- Automatic backups before major migrations
- Manual backup/restore capabilities
- Backup rotation and cleanup

## Best Practices

1. **Test Thoroughly**: Test both up and down migrations
2. **Small Changes**: Keep migrations focused and small
3. **Backup First**: Always backup before production migrations
4. **Document Well**: Include clear descriptions and comments
5. **Version Carefully**: Use sequential versioning
6. **Handle Failures**: Design for rollback scenarios
7. **Monitor Performance**: Watch for migration impact on startup time

## Error Recovery

### Failed Migration
1. Check error logs for specific failure reason
2. Verify database state (partially applied changes)
3. Fix migration SQL if needed
4. Re-apply or rollback as appropriate

### Inconsistent State
1. Use migration status to identify issues
2. Manual SQL fixes may be required
3. Update migration table if necessary
4. Consider fresh database initialization for development

## Future Enhancements

- Schema diff generation
- Migration squashing for performance
- Blue-green deployment support
- Multi-tenant migration management
- Visual migration timeline in UI