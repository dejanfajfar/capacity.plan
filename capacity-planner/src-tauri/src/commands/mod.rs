use crate::db::DbPool;
use crate::models::{
    Person, CreatePersonInput, 
    Project, CreateProjectInput,
    PlanningPeriod, CreatePlanningPeriodInput,
};

#[tauri::command]
pub async fn list_people(pool: tauri::State<'_, DbPool>) -> Result<Vec<Person>, String> {
    let people = sqlx::query_as::<_, Person>("SELECT * FROM people ORDER BY name")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(people)
}

#[tauri::command]
pub async fn create_person(
    pool: tauri::State<'_, DbPool>,
    input: CreatePersonInput,
) -> Result<Person, String> {
    let result = sqlx::query(
        "INSERT INTO people (name, email, available_hours_per_week) VALUES (?, ?, ?)"
    )
    .bind(&input.name)
    .bind(&input.email)
    .bind(input.available_hours_per_week)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let id = result.last_insert_rowid();

    let person = sqlx::query_as::<_, Person>("SELECT * FROM people WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(person)
}

#[tauri::command]
pub async fn update_person(
    pool: tauri::State<'_, DbPool>,
    id: i64,
    input: CreatePersonInput,
) -> Result<Person, String> {
    sqlx::query(
        "UPDATE people SET name = ?, email = ?, available_hours_per_week = ? WHERE id = ?"
    )
    .bind(&input.name)
    .bind(&input.email)
    .bind(input.available_hours_per_week)
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let person = sqlx::query_as::<_, Person>("SELECT * FROM people WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(person)
}

#[tauri::command]
pub async fn delete_person(
    pool: tauri::State<'_, DbPool>,
    id: i64,
) -> Result<(), String> {
    sqlx::query("DELETE FROM people WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

// ============================================================================
// Project Commands
// ============================================================================

#[tauri::command]
pub async fn list_projects(
    pool: tauri::State<'_, DbPool>,
    planning_period_id: Option<i64>,
) -> Result<Vec<Project>, String> {
    let projects = if let Some(period_id) = planning_period_id {
        sqlx::query_as::<_, Project>(
            "SELECT * FROM projects WHERE planning_period_id = ? ORDER BY start_date"
        )
        .bind(period_id)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?
    } else {
        sqlx::query_as::<_, Project>("SELECT * FROM projects ORDER BY start_date")
            .fetch_all(pool.inner())
            .await
            .map_err(|e| e.to_string())?
    };

    Ok(projects)
}

#[tauri::command]
pub async fn create_project(
    pool: tauri::State<'_, DbPool>,
    input: CreateProjectInput,
) -> Result<Project, String> {
    let status = input.status.unwrap_or_else(|| "planned".to_string());
    
    let result = sqlx::query(
        "INSERT INTO projects (name, description, required_hours, start_date, end_date, status) 
         VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&input.name)
    .bind(&input.description)
    .bind(input.required_hours)
    .bind(&input.start_date)
    .bind(&input.end_date)
    .bind(&status)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let id = result.last_insert_rowid();

    let project = sqlx::query_as::<_, Project>("SELECT * FROM projects WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(project)
}

#[tauri::command]
pub async fn update_project(
    pool: tauri::State<'_, DbPool>,
    id: i64,
    input: CreateProjectInput,
) -> Result<Project, String> {
    let status = input.status.unwrap_or_else(|| "planned".to_string());
    
    sqlx::query(
        "UPDATE projects 
         SET name = ?, description = ?, required_hours = ?, start_date = ?, end_date = ?, status = ? 
         WHERE id = ?"
    )
    .bind(&input.name)
    .bind(&input.description)
    .bind(input.required_hours)
    .bind(&input.start_date)
    .bind(&input.end_date)
    .bind(&status)
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let project = sqlx::query_as::<_, Project>("SELECT * FROM projects WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(project)
}

#[tauri::command]
pub async fn delete_project(
    pool: tauri::State<'_, DbPool>,
    id: i64,
) -> Result<(), String> {
    sqlx::query("DELETE FROM projects WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

// ============================================================================
// Planning Period Commands
// ============================================================================

#[tauri::command]
pub async fn list_planning_periods(pool: tauri::State<'_, DbPool>) -> Result<Vec<PlanningPeriod>, String> {
    let periods = sqlx::query_as::<_, PlanningPeriod>("SELECT * FROM planning_periods ORDER BY start_date DESC")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(periods)
}

#[tauri::command]
pub async fn create_planning_period(
    pool: tauri::State<'_, DbPool>,
    input: CreatePlanningPeriodInput,
) -> Result<PlanningPeriod, String> {
    let result = sqlx::query(
        "INSERT INTO planning_periods (name, start_date, end_date) VALUES (?, ?, ?)"
    )
    .bind(&input.name)
    .bind(&input.start_date)
    .bind(&input.end_date)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let id = result.last_insert_rowid();

    let period = sqlx::query_as::<_, PlanningPeriod>("SELECT * FROM planning_periods WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(period)
}

#[tauri::command]
pub async fn update_planning_period(
    pool: tauri::State<'_, DbPool>,
    id: i64,
    input: CreatePlanningPeriodInput,
) -> Result<PlanningPeriod, String> {
    sqlx::query(
        "UPDATE planning_periods SET name = ?, start_date = ?, end_date = ? WHERE id = ?"
    )
    .bind(&input.name)
    .bind(&input.start_date)
    .bind(&input.end_date)
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let period = sqlx::query_as::<_, PlanningPeriod>("SELECT * FROM planning_periods WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(period)
}

#[tauri::command]
pub async fn delete_planning_period(
    pool: tauri::State<'_, DbPool>,
    id: i64,
) -> Result<(), String> {
    sqlx::query("DELETE FROM planning_periods WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
