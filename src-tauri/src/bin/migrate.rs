use case_crafter::database::MigrationManager;
use sqlx::SqlitePool;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    
    if args.len() < 2 {
        println!("Usage: cargo run --bin migrate <command>");
        println!("Commands:");
        println!("  migrate     - Run all pending migrations");
        println!("  status      - Show migration status");
        println!("  rollback:<version> - Rollback specific migration");
        return Ok(());
    }

    let command = &args[1];
    
    // Create a temporary database connection for migrations
    // In a real scenario, you'd want to use the same database path logic
    let database_url = "sqlite:case_crafter_migrations.db";
    let pool = SqlitePool::connect(database_url).await?;
    
    let migration_manager = MigrationManager::new(pool);
    migration_manager.initialize().await?;
    
    match command.as_str() {
        "migrate" | "up" => {
            migration_manager.migrate().await?;
        }
        "status" => {
            migration_manager.status().await?;
        }
        cmd if cmd.starts_with("rollback:") => {
            let version = cmd.strip_prefix("rollback:").unwrap();
            migration_manager.rollback_migration(version).await?;
        }
        _ => {
            println!("Unknown migration command: {}", command);
            println!("Available commands: migrate, status, rollback:<version>");
        }
    }
    
    Ok(())
}