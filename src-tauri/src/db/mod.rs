use log::{debug, error, info};
use sqlx::{
    sqlite::{SqliteConnectOptions, SqlitePool},
    Pool, Sqlite,
};
use std::path::PathBuf;
use std::str::FromStr;

pub type DbPool = Pool<Sqlite>;

pub async fn init_database() -> Result<DbPool, sqlx::Error> {
    debug!("Initializing database connection");

    // Get the app data directory
    let app_dir = get_app_data_dir();
    std::fs::create_dir_all(&app_dir).expect("Failed to create app data directory");

    let db_path = app_dir.join("capacity_planner.db");
    let db_url = format!("sqlite://{}", db_path.display());

    debug!("Database path: {}", db_path.display());

    // Create connection options with create_if_missing
    let options = SqliteConnectOptions::from_str(&db_url)?.create_if_missing(true);

    // Create connection pool
    let pool = SqlitePool::connect_with(options).await.map_err(|e| {
        error!("Failed to connect to database: {}", e);
        e
    })?;

    // Run migrations
    run_migrations(&pool).await?;

    info!("Database initialized successfully");
    Ok(pool)
}

fn get_app_data_dir() -> PathBuf {
    dirs::home_dir()
        .expect("Failed to get home directory")
        .join(".capacity-planner")
}

async fn run_migrations(pool: &DbPool) -> Result<(), sqlx::Error> {
    debug!("Running database migrations");

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

    // Create projects table (global entities, no dates/status)
    // Note: required_hours column is deprecated but kept for backward compatibility
    // New workflow uses project_requirements table instead
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            required_hours REAL NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create project_requirements table (links project + planning_period with required hours)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS project_requirements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            planning_period_id INTEGER NOT NULL,
            required_hours REAL NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (planning_period_id) REFERENCES planning_periods(id) ON DELETE CASCADE,
            UNIQUE(project_id, planning_period_id)
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create assignments table (links person + project + planning_period)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            person_id INTEGER NOT NULL,
            project_id INTEGER NOT NULL,
            planning_period_id INTEGER NOT NULL,
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
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (planning_period_id) REFERENCES planning_periods(id) ON DELETE CASCADE
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

    // Create jobs table (global job templates)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create job_overhead_tasks table (overhead tasks within a job)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS job_overhead_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            effort_hours REAL NOT NULL,
            effort_period TEXT NOT NULL CHECK(effort_period IN ('daily', 'weekly')),
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create person_job_assignments table (links person + job + planning_period)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS person_job_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            person_id INTEGER NOT NULL,
            job_id INTEGER NOT NULL,
            planning_period_id INTEGER NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
            FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
            FOREIGN KEY (planning_period_id) REFERENCES planning_periods(id) ON DELETE CASCADE,
            UNIQUE(person_id, job_id, planning_period_id)
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Drop old overhead tables (clean slate migration)
    sqlx::query("DROP TABLE IF EXISTS overhead_assignments")
        .execute(pool)
        .await
        .ok(); // Ignore error if table doesn't exist

    sqlx::query("DROP TABLE IF EXISTS overheads")
        .execute(pool)
        .await
        .ok(); // Ignore error if table doesn't exist

    // Create indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_assignments_person ON assignments(person_id)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_assignments_project ON assignments(project_id)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_assignments_planning_period ON assignments(planning_period_id)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_absences_person ON absences(person_id)")
        .execute(pool)
        .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_job_overhead_tasks_job ON job_overhead_tasks(job_id)",
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_person_job_assignments_person ON person_job_assignments(person_id)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_person_job_assignments_job ON person_job_assignments(job_id)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_person_job_assignments_period ON person_job_assignments(planning_period_id)")
        .execute(pool)
        .await?;

    // Drop old overhead indexes (they will be removed when tables are dropped)
    sqlx::query("DROP INDEX IF EXISTS idx_overheads_planning_period")
        .execute(pool)
        .await
        .ok();

    sqlx::query("DROP INDEX IF EXISTS idx_overhead_assignments_overhead")
        .execute(pool)
        .await
        .ok();

    sqlx::query("DROP INDEX IF EXISTS idx_overhead_assignments_person")
        .execute(pool)
        .await
        .ok();

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_project_requirements_project ON project_requirements(project_id)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_project_requirements_period ON project_requirements(planning_period_id)")
        .execute(pool)
        .await?;

    // Add priority column to project_requirements if it doesn't exist
    // This migration handles both new databases and existing ones
    // Default priority=10 corresponds to "Medium" priority
    sqlx::query("ALTER TABLE project_requirements ADD COLUMN priority INTEGER DEFAULT 10")
        .execute(pool)
        .await
        .ok(); // Ignore error if column already exists (SQLite limitation)

    debug!("Priority column migration completed");

    // Create countries table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS countries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            iso_code TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create holidays table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS holidays (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            country_id INTEGER NOT NULL,
            name TEXT,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Add country_id column to people table if it doesn't exist
    // People can be assigned to a country; when country is deleted, country_id becomes NULL
    sqlx::query("ALTER TABLE people ADD COLUMN country_id INTEGER REFERENCES countries(id) ON DELETE SET NULL")
        .execute(pool)
        .await
        .ok(); // Ignore error if column already exists (SQLite limitation)

    debug!("Country and holidays tables migration completed");

    // Create indexes for holidays and countries
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_holidays_country ON holidays(country_id)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_holidays_dates ON holidays(start_date, end_date)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_people_country ON people(country_id)")
        .execute(pool)
        .await?;

    // Add working_days column to people table if it doesn't exist
    // Default to Mon-Fri (5-day work week) for backward compatibility
    sqlx::query("ALTER TABLE people ADD COLUMN working_days TEXT DEFAULT 'Mon,Tue,Wed,Thu,Fri'")
        .execute(pool)
        .await
        .ok(); // Ignore error if column already exists (SQLite limitation)

    debug!("Working days migration completed");

    info!("Database migrations completed successfully");
    Ok(())
}
