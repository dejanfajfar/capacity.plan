use crate::db::DbPool;
use crate::models::{CreateProjectInput, Project, ProjectDependencies};
use log::{debug, error, info};

#[tauri::command]
pub async fn list_projects(pool: tauri::State<'_, DbPool>) -> Result<Vec<Project>, String> {
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

    let result =
        sqlx::query("INSERT INTO projects (name, description, required_hours) VALUES (?, ?, ?)")
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

    sqlx::query("UPDATE projects SET name = ?, description = ?, required_hours = ? WHERE id = ?")
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
pub async fn delete_project(pool: tauri::State<'_, DbPool>, id: i64) -> Result<(), String> {
    debug!("Deleting project ID: {}", id);

    // Clear calculated fields for assignments involving this project before deletion
    sqlx::query(
        "UPDATE assignments 
         SET calculated_allocation_percentage = NULL,
             calculated_effective_hours = NULL,
             last_calculated_at = NULL
         WHERE project_id = ?",
    )
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to invalidate assignments: {}", e);
        e.to_string()
    })?;

    // Delete project (CASCADE will delete project_requirements and assignments)
    sqlx::query("DELETE FROM projects WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to delete project: {}", e);
            e.to_string()
        })?;

    info!(
        "Successfully deleted project ID: {} and invalidated allocations",
        id
    );
    Ok(())
}

#[tauri::command]
pub async fn check_project_dependencies(
    pool: tauri::State<'_, DbPool>,
    id: i64,
) -> Result<ProjectDependencies, String> {
    debug!("Checking dependencies for project ID: {}", id);

    let requirement_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM project_requirements WHERE project_id = ?",
    )
    .bind(id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to count project requirements: {}", e);
        e.to_string()
    })?;

    let assignment_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM assignments WHERE project_id = ?")
            .bind(id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| {
                error!("Failed to count assignments: {}", e);
                e.to_string()
            })?;

    info!(
        "Project ID {} has {} requirements and {} assignments",
        id, requirement_count, assignment_count
    );

    Ok(ProjectDependencies {
        requirement_count,
        assignment_count,
    })
}
