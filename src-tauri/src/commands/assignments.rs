use crate::db::DbPool;
use crate::models::{Assignment, CreateAssignmentInput, PlanningPeriod};
use log::{debug, error, info, warn};

#[tauri::command]
pub async fn list_assignments(
    pool: tauri::State<'_, DbPool>,
    planning_period_id: i64,
) -> Result<Vec<Assignment>, String> {
    debug!(
        "Fetching assignments for planning period ID: {}",
        planning_period_id
    );

    let assignments = sqlx::query_as::<_, Assignment>(
        "SELECT * FROM assignments WHERE planning_period_id = ? ORDER BY created_at",
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
    debug!(
        "Creating assignment for person_id: {}, project_id: {}, period_id: {}",
        input.person_id, input.project_id, input.planning_period_id
    );

    // Validate that project requirement exists for this period
    let requirement_exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM project_requirements 
         WHERE project_id = ? AND planning_period_id = ?",
    )
    .bind(input.project_id)
    .bind(input.planning_period_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to check project requirement: {}", e);
        e.to_string()
    })?;

    if requirement_exists == 0 {
        warn!(
            "Validation failed: No project requirement defined for project_id: {}, period_id: {}",
            input.project_id, input.planning_period_id
        );
        return Err("Cannot create assignment: Project requirement must be defined for this planning period first. Please set the required hours in the Project Requirements tab.".to_string());
    }

    // Get planning period to use for date defaults and validation
    let period = sqlx::query_as::<_, PlanningPeriod>("SELECT * FROM planning_periods WHERE id = ?")
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
         VALUES (?, ?, ?, ?, ?, ?)",
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

    // Validate that project requirement exists for this period
    let requirement_exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM project_requirements 
         WHERE project_id = ? AND planning_period_id = ?",
    )
    .bind(input.project_id)
    .bind(input.planning_period_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to check project requirement: {}", e);
        e.to_string()
    })?;

    if requirement_exists == 0 {
        warn!(
            "Validation failed: No project requirement defined for project_id: {}, period_id: {}",
            input.project_id, input.planning_period_id
        );
        return Err("Cannot update assignment: Project requirement must be defined for this planning period first. Please set the required hours in the Project Requirements tab.".to_string());
    }

    // Get planning period for validation
    let period = sqlx::query_as::<_, PlanningPeriod>("SELECT * FROM planning_periods WHERE id = ?")
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
         WHERE id = ?",
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
pub async fn delete_assignment(pool: tauri::State<'_, DbPool>, id: i64) -> Result<(), String> {
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
