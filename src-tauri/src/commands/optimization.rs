use crate::capacity::{optimize_assignments_proportional, OptimizationResult};
use crate::db::DbPool;
use log::info;

#[tauri::command]
pub async fn optimize_assignments(
    pool: tauri::State<'_, DbPool>,
    planning_period_id: i64,
) -> Result<OptimizationResult, String> {
    info!(
        "Running optimization for planning period ID: {}",
        planning_period_id
    );

    let result = optimize_assignments_proportional(planning_period_id, pool.inner()).await?;

    info!("Optimization completed successfully");
    Ok(result)
}
