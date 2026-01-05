use crate::db::DbPool;
use crate::models::{CreatePlanningPeriodInput, PlanningPeriod, PlanningPeriodDependencies};
use log::{debug, error, info};

#[tauri::command]
pub async fn list_planning_periods(
    pool: tauri::State<'_, DbPool>,
) -> Result<Vec<PlanningPeriod>, String> {
    debug!("Fetching all planning periods");

    let periods = sqlx::query_as::<_, PlanningPeriod>(
        "SELECT * FROM planning_periods ORDER BY start_date DESC",
    )
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
    let result =
        sqlx::query("INSERT INTO planning_periods (name, start_date, end_date) VALUES (?, ?, ?)")
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
    sqlx::query("UPDATE planning_periods SET name = ?, start_date = ?, end_date = ? WHERE id = ?")
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
pub async fn delete_planning_period(pool: tauri::State<'_, DbPool>, id: i64) -> Result<(), String> {
    debug!("Deleting planning period ID: {}", id);

    // Clear calculated fields for assignments in this planning period before deletion
    sqlx::query(
        "UPDATE assignments 
         SET calculated_allocation_percentage = NULL,
             calculated_effective_hours = NULL,
             last_calculated_at = NULL
         WHERE planning_period_id = ?",
    )
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to invalidate assignments: {}", e);
        e.to_string()
    })?;

    // Delete planning period (CASCADE will delete project_requirements and assignments)
    sqlx::query("DELETE FROM planning_periods WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to delete planning period: {}", e);
            e.to_string()
        })?;

    info!(
        "Successfully deleted planning period ID: {} and invalidated allocations",
        id
    );
    Ok(())
}

#[tauri::command]
pub async fn check_planning_period_dependencies(
    pool: tauri::State<'_, DbPool>,
    id: i64,
) -> Result<PlanningPeriodDependencies, String> {
    debug!("Checking dependencies for planning period ID: {}", id);

    let requirement_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM project_requirements WHERE planning_period_id = ?",
    )
    .bind(id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to count project requirements: {}", e);
        e.to_string()
    })?;

    let assignment_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM assignments WHERE planning_period_id = ?",
    )
    .bind(id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to count assignments: {}", e);
        e.to_string()
    })?;

    info!(
        "Planning period ID {} has {} requirements and {} assignments",
        id, requirement_count, assignment_count
    );

    Ok(PlanningPeriodDependencies {
        requirement_count,
        assignment_count,
    })
}
