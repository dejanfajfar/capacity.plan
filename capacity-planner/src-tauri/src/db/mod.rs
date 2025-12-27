use sqlx::{sqlite::{SqlitePool, SqliteConnectOptions}, Pool, Sqlite};
use std::path::PathBuf;
use std::str::FromStr;

pub type DbPool = Pool<Sqlite>;

pub async fn init_database() -> Result<DbPool, sqlx::Error> {
    // Get the app data directory
    let app_dir = get_app_data_dir();
    std::fs::create_dir_all(&app_dir).expect("Failed to create app data directory");

    let db_path = app_dir.join("capacity_planner.db");
    let db_url = format!("sqlite://{}", db_path.display());

    // Create connection options with create_if_missing
    let options = SqliteConnectOptions::from_str(&db_url)?
        .create_if_missing(true);

    // Create connection pool
    let pool = SqlitePool::connect_with(options).await?;

    // Run migrations
    run_migrations(&pool).await?;

    Ok(pool)
}

fn get_app_data_dir() -> PathBuf {
    let home = std::env::var("HOME").expect("HOME environment variable not set");
    PathBuf::from(home)
        .join(".capacity-planner")
}

async fn run_migrations(pool: &DbPool) -> Result<(), sqlx::Error> {
    // Create planning_periods table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS planning_periods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create people table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS people (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            available_hours_per_week REAL NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create projects table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            required_hours REAL NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            status TEXT DEFAULT 'planned',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create assignments table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            person_id INTEGER NOT NULL,
            project_id INTEGER NOT NULL,
            productivity_factor REAL NOT NULL DEFAULT 0.5,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            is_pinned BOOLEAN DEFAULT 0,
            pinned_allocation_percentage REAL,
            calculated_allocation_percentage REAL,
            calculated_effective_hours REAL,
            last_calculated_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create absences table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS absences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            person_id INTEGER NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            days INTEGER NOT NULL,
            reason TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_assignments_person ON assignments(person_id)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_assignments_project ON assignments(project_id)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_absences_person ON absences(person_id)")
        .execute(pool)
        .await?;

    Ok(())
}
