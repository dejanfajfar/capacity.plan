use crate::db::DbPool;
use crate::models::{
    Person, CreatePersonInput, 
    Project, CreateProjectInput,
    PlanningPeriod, CreatePlanningPeriodInput,
    Assignment, CreateAssignmentInput,
};
use log::{debug, info, error, warn};

#[tauri::command]
pub async fn list_people(pool: tauri::State<'_, DbPool>) -> Result<Vec<Person>, String> {
    debug!("Fetching all people");
    
    let people = sqlx::query_as::<_, Person>("SELECT * FROM people ORDER BY name")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch people: {}", e);
            e.to_string()
        })?;

    info!("Successfully fetched {} people", people.len());
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
) -> Result<Vec<Project>, String> {
    debug!("Fetching all projects");
    
    let projects = sqlx::query_as::<_, Project>("SELECT * FROM projects ORDER BY name")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch projects: {}", e);
            e.to_string()
        })?;

    info!("Successfully fetched {} projects", projects.len());
    Ok(projects)
}

#[tauri::command]
pub async fn create_project(
    pool: tauri::State<'_, DbPool>,
    input: CreateProjectInput,
) -> Result<Project, String> {
    debug!("Creating project: {}", input.name);
    
    let result = sqlx::query(
        "INSERT INTO projects (name, description, required_hours) VALUES (?, ?, ?)"
    )
    .bind(&input.name)
    .bind(&input.description)
    .bind(input.required_hours)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to insert project: {}", e);
        e.to_string()
    })?;

    let id = result.last_insert_rowid();
    debug!("Inserted project with ID: {}", id);

    let project = sqlx::query_as::<_, Project>("SELECT * FROM projects WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch created project: {}", e);
            e.to_string()
        })?;

    info!("Successfully created project: {}", project.name);
    Ok(project)
}

#[tauri::command]
pub async fn update_project(
    pool: tauri::State<'_, DbPool>,
    id: i64,
    input: CreateProjectInput,
) -> Result<Project, String> {
    debug!("Updating project ID: {}", id);
    
    sqlx::query(
        "UPDATE projects SET name = ?, description = ?, required_hours = ? WHERE id = ?"
    )
    .bind(&input.name)
    .bind(&input.description)
    .bind(input.required_hours)
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to update project: {}", e);
        e.to_string()
    })?;

    let project = sqlx::query_as::<_, Project>("SELECT * FROM projects WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch updated project: {}", e);
            e.to_string()
        })?;

    info!("Successfully updated project: {}", project.name);
    Ok(project)
}

#[tauri::command]
pub async fn delete_project(
    pool: tauri::State<'_, DbPool>,
    id: i64,
) -> Result<(), String> {
    debug!("Deleting project ID: {}", id);
    
    sqlx::query("DELETE FROM projects WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to delete project: {}", e);
            e.to_string()
        })?;

    info!("Successfully deleted project ID: {}", id);
    Ok(())
}

// ============================================================================
// Planning Period Commands
// ============================================================================

#[tauri::command]
pub async fn list_planning_periods(pool: tauri::State<'_, DbPool>) -> Result<Vec<PlanningPeriod>, String> {
    debug!("Fetching all planning periods");
    
    let periods = sqlx::query_as::<_, PlanningPeriod>("SELECT * FROM planning_periods ORDER BY start_date DESC")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch planning periods: {}", e);
            e.to_string()
        })?;

    info!("Successfully fetched {} planning periods", periods.len());
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

// ============================================================================
// Assignment Commands
// ============================================================================

#[tauri::command]
pub async fn list_assignments(
    pool: tauri::State<'_, DbPool>,
    planning_period_id: i64,
) -> Result<Vec<Assignment>, String> {
    debug!("Fetching assignments for planning period ID: {}", planning_period_id);
    
    let assignments = sqlx::query_as::<_, Assignment>(
        "SELECT * FROM assignments WHERE planning_period_id = ? ORDER BY created_at"
    )
    .bind(planning_period_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to fetch assignments: {}", e);
        e.to_string()
    })?;

    info!("Successfully fetched {} assignments", assignments.len());
    Ok(assignments)
}

#[tauri::command]
pub async fn create_assignment(
    pool: tauri::State<'_, DbPool>,
    input: CreateAssignmentInput,
) -> Result<Assignment, String> {
    debug!("Creating assignment for person_id: {}, project_id: {}, period_id: {}", 
        input.person_id, input.project_id, input.planning_period_id);
    
    // Get planning period to use for date defaults and validation
    let period = sqlx::query_as::<_, PlanningPeriod>(
        "SELECT * FROM planning_periods WHERE id = ?"
    )
    .bind(input.planning_period_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        error!("Planning period not found: {}", e);
        format!("Planning period not found: {}", e)
    })?;

    // Default dates to full period if not specified
    let start_date = input.start_date.unwrap_or(period.start_date.clone());
    let end_date = input.end_date.unwrap_or(period.end_date.clone());

    // Validate dates are within planning period
    if start_date < period.start_date || start_date > period.end_date {
        warn!("Start date validation failed: date not within planning period");
        return Err("Start date must be within planning period".to_string());
    }
    if end_date < period.start_date || end_date > period.end_date {
        warn!("End date validation failed: date not within planning period");
        return Err("End date must be within planning period".to_string());
    }
    if start_date > end_date {
        warn!("Date order validation failed: start date after end date");
        return Err("Start date must be before end date".to_string());
    }

    let result = sqlx::query(
        "INSERT INTO assignments 
         (person_id, project_id, planning_period_id, productivity_factor, start_date, end_date) 
         VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(input.person_id)
    .bind(input.project_id)
    .bind(input.planning_period_id)
    .bind(input.productivity_factor)
    .bind(&start_date)
    .bind(&end_date)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to insert assignment: {}", e);
        e.to_string()
    })?;

    let id = result.last_insert_rowid();
    debug!("Inserted assignment with ID: {}", id);

    let assignment = sqlx::query_as::<_, Assignment>("SELECT * FROM assignments WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch created assignment: {}", e);
            e.to_string()
        })?;

    info!("Successfully created assignment");
    Ok(assignment)
}

#[tauri::command]
pub async fn update_assignment(
    pool: tauri::State<'_, DbPool>,
    id: i64,
    input: CreateAssignmentInput,
) -> Result<Assignment, String> {
    debug!("Updating assignment ID: {}", id);
    
    // Get planning period for validation
    let period = sqlx::query_as::<_, PlanningPeriod>(
        "SELECT * FROM planning_periods WHERE id = ?"
    )
    .bind(input.planning_period_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        error!("Planning period not found: {}", e);
        format!("Planning period not found: {}", e)
    })?;

    let start_date = input.start_date.unwrap_or(period.start_date.clone());
    let end_date = input.end_date.unwrap_or(period.end_date.clone());

    // Validate dates
    if start_date < period.start_date || start_date > period.end_date {
        warn!("Start date validation failed: date not within planning period");
        return Err("Start date must be within planning period".to_string());
    }
    if end_date < period.start_date || end_date > period.end_date {
        warn!("End date validation failed: date not within planning period");
        return Err("End date must be within planning period".to_string());
    }
    if start_date > end_date {
        warn!("Date order validation failed: start date after end date");
        return Err("Start date must be before end date".to_string());
    }

    sqlx::query(
        "UPDATE assignments 
         SET person_id = ?, project_id = ?, planning_period_id = ?, 
             productivity_factor = ?, start_date = ?, end_date = ? 
         WHERE id = ?"
    )
    .bind(input.person_id)
    .bind(input.project_id)
    .bind(input.planning_period_id)
    .bind(input.productivity_factor)
    .bind(&start_date)
    .bind(&end_date)
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to update assignment: {}", e);
        e.to_string()
    })?;

    let assignment = sqlx::query_as::<_, Assignment>("SELECT * FROM assignments WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch updated assignment: {}", e);
            e.to_string()
        })?;

    info!("Successfully updated assignment ID: {}", id);
    Ok(assignment)
}

#[tauri::command]
pub async fn delete_assignment(
    pool: tauri::State<'_, DbPool>,
    id: i64,
) -> Result<(), String> {
    debug!("Deleting assignment ID: {}", id);
    
    sqlx::query("DELETE FROM assignments WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to delete assignment: {}", e);
            e.to_string()
        })?;

    info!("Successfully deleted assignment ID: {}", id);
    Ok(())
}
