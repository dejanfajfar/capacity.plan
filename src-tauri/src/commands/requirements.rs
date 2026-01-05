use crate::db::DbPool;
use crate::models::{CreateProjectRequirementInput, ProjectRequirement};
use log::{debug, error, info};

#[tauri::command]
pub async fn list_project_requirements(
    pool: tauri::State<'_, DbPool>,
    planning_period_id: i64,
) -> Result<Vec<ProjectRequirement>, String> {
    debug!(
        "Fetching project requirements for planning period ID: {}",
        planning_period_id
    );

    let requirements = sqlx::query_as::<_, ProjectRequirement>(
        "SELECT * FROM project_requirements WHERE planning_period_id = ? ORDER BY project_id",
    )
    .bind(planning_period_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to fetch project requirements: {}", e);
        e.to_string()
    })?;

    info!(
        "Successfully fetched {} project requirements",
        requirements.len()
    );
    Ok(requirements)
}

#[tauri::command]
pub async fn get_project_requirement(
    pool: tauri::State<'_, DbPool>,
    project_id: i64,
    planning_period_id: i64,
) -> Result<Option<ProjectRequirement>, String> {
    debug!(
        "Fetching project requirement for project_id: {}, period_id: {}",
        project_id, planning_period_id
    );

    let requirement = sqlx::query_as::<_, ProjectRequirement>(
        "SELECT * FROM project_requirements WHERE project_id = ? AND planning_period_id = ?",
    )
    .bind(project_id)
    .bind(planning_period_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to fetch project requirement: {}", e);
        e.to_string()
    })?;

    Ok(requirement)
}

#[tauri::command]
pub async fn upsert_project_requirement(
    pool: tauri::State<'_, DbPool>,
    input: CreateProjectRequirementInput,
) -> Result<ProjectRequirement, String> {
    debug!(
        "Upserting project requirement for project_id: {}, period_id: {}",
        input.project_id, input.planning_period_id
    );

    // Use INSERT OR REPLACE for upsert functionality
    let result = sqlx::query(
        "INSERT INTO project_requirements (project_id, planning_period_id, required_hours)
         VALUES (?, ?, ?)
         ON CONFLICT(project_id, planning_period_id) 
         DO UPDATE SET required_hours = excluded.required_hours",
    )
    .bind(input.project_id)
    .bind(input.planning_period_id)
    .bind(input.required_hours)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to upsert project requirement: {}", e);
        e.to_string()
    })?;

    let id = result.last_insert_rowid();

    let requirement =
        sqlx::query_as::<_, ProjectRequirement>("SELECT * FROM project_requirements WHERE id = ?")
            .bind(id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| {
                error!("Failed to fetch upserted project requirement: {}", e);
                e.to_string()
            })?;

    info!("Successfully upserted project requirement");
    Ok(requirement)
}

#[tauri::command]
pub async fn batch_upsert_project_requirements(
    pool: tauri::State<'_, DbPool>,
    planning_period_id: i64,
    requirements: Vec<CreateProjectRequirementInput>,
) -> Result<(), String> {
    debug!(
        "Batch upserting {} project requirements for period_id: {}",
        requirements.len(),
        planning_period_id
    );

    // Start a transaction
    let mut tx = pool.begin().await.map_err(|e| {
        error!("Failed to start transaction: {}", e);
        e.to_string()
    })?;

    for req in requirements {
        let priority = req.priority.unwrap_or(10); // Default to Medium
        sqlx::query(
            "INSERT INTO project_requirements (project_id, planning_period_id, required_hours, priority)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(project_id, planning_period_id) 
             DO UPDATE SET required_hours = excluded.required_hours,
                           priority = excluded.priority",
        )
        .bind(req.project_id)
        .bind(req.planning_period_id)
        .bind(req.required_hours)
        .bind(priority)
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            error!("Failed to upsert requirement in batch: {}", e);
            e.to_string()
        })?;
    }

    tx.commit().await.map_err(|e| {
        error!("Failed to commit transaction: {}", e);
        e.to_string()
    })?;

    info!("Successfully batch upserted project requirements");
    Ok(())
}

#[tauri::command]
pub async fn delete_project_requirement(
    pool: tauri::State<'_, DbPool>,
    id: i64,
) -> Result<(), String> {
    debug!("Deleting project requirement ID: {}", id);

    sqlx::query("DELETE FROM project_requirements WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to delete project requirement: {}", e);
            e.to_string()
        })?;

    info!("Successfully deleted project requirement ID: {}", id);
    Ok(())
}
