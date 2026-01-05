use crate::db::DbPool;
use crate::models::{
    CreateOverheadAssignmentInput, CreateOverheadInput, Overhead, OverheadAssignment,
    OverheadAssignmentWithDetails,
};
use log::{debug, error, info};

#[tauri::command]
pub async fn list_overheads(
    pool: tauri::State<'_, DbPool>,
    planning_period_id: i64,
) -> Result<Vec<Overhead>, String> {
    debug!(
        "Fetching overheads for planning period ID: {}",
        planning_period_id
    );

    let overheads = sqlx::query_as::<_, Overhead>(
        "SELECT * FROM overheads WHERE planning_period_id = ? ORDER BY name",
    )
    .bind(planning_period_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to fetch overheads: {}", e);
        e.to_string()
    })?;

    info!("Successfully fetched {} overheads", overheads.len());
    Ok(overheads)
}

#[tauri::command]
pub async fn create_overhead(
    pool: tauri::State<'_, DbPool>,
    input: CreateOverheadInput,
) -> Result<Overhead, String> {
    debug!(
        "Creating overhead for planning period ID: {}",
        input.planning_period_id
    );

    let result = sqlx::query(
        "INSERT INTO overheads (planning_period_id, name, description) 
         VALUES (?, ?, ?)",
    )
    .bind(input.planning_period_id)
    .bind(&input.name)
    .bind(&input.description)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to insert overhead: {}", e);
        e.to_string()
    })?;

    let id = result.last_insert_rowid();
    debug!("Inserted overhead with ID: {}", id);

    let overhead = sqlx::query_as::<_, Overhead>("SELECT * FROM overheads WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch created overhead: {}", e);
            e.to_string()
        })?;

    info!("Successfully created overhead");
    Ok(overhead)
}

#[tauri::command]
pub async fn update_overhead(
    pool: tauri::State<'_, DbPool>,
    id: i64,
    input: CreateOverheadInput,
) -> Result<Overhead, String> {
    debug!("Updating overhead ID: {}", id);

    sqlx::query(
        "UPDATE overheads 
         SET name = ?, description = ?
         WHERE id = ?",
    )
    .bind(&input.name)
    .bind(&input.description)
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to update overhead: {}", e);
        e.to_string()
    })?;

    let overhead = sqlx::query_as::<_, Overhead>("SELECT * FROM overheads WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch updated overhead: {}", e);
            e.to_string()
        })?;

    info!("Successfully updated overhead ID: {}", id);
    Ok(overhead)
}

#[tauri::command]
pub async fn delete_overhead(pool: tauri::State<'_, DbPool>, id: i64) -> Result<(), String> {
    debug!("Deleting overhead ID: {}", id);

    sqlx::query("DELETE FROM overheads WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to delete overhead: {}", e);
            e.to_string()
        })?;

    info!("Successfully deleted overhead ID: {}", id);
    Ok(())
}

#[tauri::command]
pub async fn list_overhead_assignments(
    pool: tauri::State<'_, DbPool>,
    overhead_id: i64,
) -> Result<Vec<OverheadAssignment>, String> {
    debug!(
        "Fetching overhead assignments for overhead ID: {}",
        overhead_id
    );

    let assignments = sqlx::query_as::<_, OverheadAssignment>(
        "SELECT * FROM overhead_assignments WHERE overhead_id = ? ORDER BY person_id",
    )
    .bind(overhead_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to fetch overhead assignments: {}", e);
        e.to_string()
    })?;

    info!(
        "Successfully fetched {} overhead assignments",
        assignments.len()
    );
    Ok(assignments)
}

#[tauri::command]
pub async fn list_person_overhead_assignments(
    pool: tauri::State<'_, DbPool>,
    person_id: i64,
    planning_period_id: i64,
) -> Result<Vec<OverheadAssignmentWithDetails>, String> {
    debug!(
        "Fetching overhead assignments for person ID: {} in period: {}",
        person_id, planning_period_id
    );

    let assignments = sqlx::query_as::<_, OverheadAssignmentWithDetails>(
        "SELECT 
            oa.id,
            oa.overhead_id,
            o.name as overhead_name,
            o.description as overhead_description,
            oa.person_id,
            oa.effort_hours,
            oa.effort_period,
            oa.created_at
         FROM overhead_assignments oa
         JOIN overheads o ON oa.overhead_id = o.id
         WHERE oa.person_id = ? AND o.planning_period_id = ?
         ORDER BY o.name",
    )
    .bind(person_id)
    .bind(planning_period_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to fetch person overhead assignments: {}", e);
        e.to_string()
    })?;

    info!(
        "Successfully fetched {} person overhead assignments",
        assignments.len()
    );
    Ok(assignments)
}

#[tauri::command]
pub async fn create_overhead_assignment(
    pool: tauri::State<'_, DbPool>,
    input: CreateOverheadAssignmentInput,
) -> Result<OverheadAssignment, String> {
    debug!(
        "Creating overhead assignment for person ID: {} to overhead ID: {}",
        input.person_id, input.overhead_id
    );

    let result = sqlx::query(
        "INSERT INTO overhead_assignments (overhead_id, person_id, effort_hours, effort_period) 
         VALUES (?, ?, ?, ?)",
    )
    .bind(input.overhead_id)
    .bind(input.person_id)
    .bind(input.effort_hours)
    .bind(&input.effort_period)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to insert overhead assignment: {}", e);
        e.to_string()
    })?;

    let id = result.last_insert_rowid();
    debug!("Inserted overhead assignment with ID: {}", id);

    let assignment =
        sqlx::query_as::<_, OverheadAssignment>("SELECT * FROM overhead_assignments WHERE id = ?")
            .bind(id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| {
                error!("Failed to fetch created overhead assignment: {}", e);
                e.to_string()
            })?;

    info!("Successfully created overhead assignment");
    Ok(assignment)
}

#[tauri::command]
pub async fn update_overhead_assignment(
    pool: tauri::State<'_, DbPool>,
    id: i64,
    input: CreateOverheadAssignmentInput,
) -> Result<OverheadAssignment, String> {
    debug!("Updating overhead assignment ID: {}", id);

    sqlx::query(
        "UPDATE overhead_assignments 
         SET effort_hours = ?, effort_period = ?
         WHERE id = ?",
    )
    .bind(input.effort_hours)
    .bind(&input.effort_period)
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to update overhead assignment: {}", e);
        e.to_string()
    })?;

    let assignment =
        sqlx::query_as::<_, OverheadAssignment>("SELECT * FROM overhead_assignments WHERE id = ?")
            .bind(id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| {
                error!("Failed to fetch updated overhead assignment: {}", e);
                e.to_string()
            })?;

    info!("Successfully updated overhead assignment ID: {}", id);
    Ok(assignment)
}

#[tauri::command]
pub async fn delete_overhead_assignment(
    pool: tauri::State<'_, DbPool>,
    id: i64,
) -> Result<(), String> {
    debug!("Deleting overhead assignment ID: {}", id);

    sqlx::query("DELETE FROM overhead_assignments WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to delete overhead assignment: {}", e);
            e.to_string()
        })?;

    info!("Successfully deleted overhead assignment ID: {}", id);
    Ok(())
}
