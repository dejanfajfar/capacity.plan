use crate::db::DbPool;
use crate::models::{
    Absence, Assignment, CreateAbsenceInput, CreateAssignmentInput, CreatePersonInput,
    CreatePlanningPeriodInput, CreateProjectInput, CreateProjectRequirementInput, Person,
    PlanningPeriod, Project, ProjectRequirement, PersonDependencies, ProjectDependencies,
    PlanningPeriodDependencies,
};
use crate::capacity::{
    optimize_assignments_proportional, AssignmentSummary, CapacityOverview,
    OptimizationResult, PersonAssignmentSummary, PersonCapacity, ProjectStaffing,
    calculate_person_available_hours,
};
use log::{debug, error, info, warn};
use std::collections::HashMap;

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
    let result =
        sqlx::query("INSERT INTO people (name, email, available_hours_per_week) VALUES (?, ?, ?)")
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
    sqlx::query("UPDATE people SET name = ?, email = ?, available_hours_per_week = ? WHERE id = ?")
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
pub async fn delete_person(pool: tauri::State<'_, DbPool>, id: i64) -> Result<(), String> {
    debug!("Deleting person ID: {}", id);

    // Clear calculated fields for assignments involving this person before deletion
    sqlx::query(
        "UPDATE assignments 
         SET calculated_allocation_percentage = NULL,
             calculated_effective_hours = NULL,
             last_calculated_at = NULL
         WHERE person_id = ?"
    )
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to invalidate assignments: {}", e);
        e.to_string()
    })?;

    // Delete person (CASCADE will delete assignments and absences)
    sqlx::query("DELETE FROM people WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to delete person: {}", e);
            e.to_string()
        })?;

    info!("Successfully deleted person ID: {} and invalidated allocations", id);
    Ok(())
}

#[tauri::command]
pub async fn check_person_dependencies(
    pool: tauri::State<'_, DbPool>,
    id: i64,
) -> Result<PersonDependencies, String> {
    debug!("Checking dependencies for person ID: {}", id);

    let assignment_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM assignments WHERE person_id = ?"
    )
    .bind(id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to count assignments: {}", e);
        e.to_string()
    })?;

    let absence_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM absences WHERE person_id = ?"
    )
    .bind(id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to count absences: {}", e);
        e.to_string()
    })?;

    info!("Person ID {} has {} assignments and {} absences", id, assignment_count, absence_count);

    Ok(PersonDependencies {
        assignment_count,
        absence_count,
    })
}

// ============================================================================
// Project Commands
// ============================================================================

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
         WHERE project_id = ?"
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

    info!("Successfully deleted project ID: {} and invalidated allocations", id);
    Ok(())
}

#[tauri::command]
pub async fn check_project_dependencies(
    pool: tauri::State<'_, DbPool>,
    id: i64,
) -> Result<ProjectDependencies, String> {
    debug!("Checking dependencies for project ID: {}", id);

    let requirement_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM project_requirements WHERE project_id = ?"
    )
    .bind(id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to count project requirements: {}", e);
        e.to_string()
    })?;

    let assignment_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM assignments WHERE project_id = ?"
    )
    .bind(id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to count assignments: {}", e);
        e.to_string()
    })?;

    info!("Project ID {} has {} requirements and {} assignments", id, requirement_count, assignment_count);

    Ok(ProjectDependencies {
        requirement_count,
        assignment_count,
    })
}

// ============================================================================
// Planning Period Commands
// ============================================================================

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
         WHERE planning_period_id = ?"
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

    info!("Successfully deleted planning period ID: {} and invalidated allocations", id);
    Ok(())
}

#[tauri::command]
pub async fn check_planning_period_dependencies(
    pool: tauri::State<'_, DbPool>,
    id: i64,
) -> Result<PlanningPeriodDependencies, String> {
    debug!("Checking dependencies for planning period ID: {}", id);

    let requirement_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM project_requirements WHERE planning_period_id = ?"
    )
    .bind(id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to count project requirements: {}", e);
        e.to_string()
    })?;

    let assignment_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM assignments WHERE planning_period_id = ?"
    )
    .bind(id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to count assignments: {}", e);
        e.to_string()
    })?;

    info!("Planning period ID {} has {} requirements and {} assignments", id, requirement_count, assignment_count);

    Ok(PlanningPeriodDependencies {
        requirement_count,
        assignment_count,
    })
}

// ============================================================================
// Project Requirement Commands
// ============================================================================

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

// ============================================================================
// Assignment Commands
// ============================================================================

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

// ============================================================================
// Absence Commands
// ============================================================================

#[tauri::command]
pub async fn list_absences(
    pool: tauri::State<'_, DbPool>,
    person_id: i64,
) -> Result<Vec<Absence>, String> {
    debug!("Fetching absences for person ID: {}", person_id);

    let absences = sqlx::query_as::<_, Absence>(
        "SELECT * FROM absences WHERE person_id = ? ORDER BY start_date DESC"
    )
    .bind(person_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to fetch absences: {}", e);
        e.to_string()
    })?;

    info!("Successfully fetched {} absences", absences.len());
    Ok(absences)
}

#[tauri::command]
pub async fn create_absence(
    pool: tauri::State<'_, DbPool>,
    input: CreateAbsenceInput,
) -> Result<Absence, String> {
    debug!("Creating absence for person ID: {}", input.person_id);

    let result = sqlx::query(
        "INSERT INTO absences (person_id, start_date, end_date, days, reason) 
         VALUES (?, ?, ?, ?, ?)"
    )
    .bind(input.person_id)
    .bind(&input.start_date)
    .bind(&input.end_date)
    .bind(input.days)
    .bind(&input.reason)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to insert absence: {}", e);
        e.to_string()
    })?;

    let id = result.last_insert_rowid();
    debug!("Inserted absence with ID: {}", id);

    let absence = sqlx::query_as::<_, Absence>("SELECT * FROM absences WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch created absence: {}", e);
            e.to_string()
        })?;

    info!("Successfully created absence");
    Ok(absence)
}

#[tauri::command]
pub async fn delete_absence(pool: tauri::State<'_, DbPool>, id: i64) -> Result<(), String> {
    debug!("Deleting absence ID: {}", id);

    sqlx::query("DELETE FROM absences WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to delete absence: {}", e);
            e.to_string()
        })?;

    info!("Successfully deleted absence ID: {}", id);
    Ok(())
}

// ============================================================================
// Optimization Commands
// ============================================================================

#[tauri::command]
pub async fn optimize_assignments(
    pool: tauri::State<'_, DbPool>,
    planning_period_id: i64,
) -> Result<OptimizationResult, String> {
    info!("Running optimization for planning period ID: {}", planning_period_id);
    
    let result = optimize_assignments_proportional(planning_period_id, pool.inner()).await?;
    
    info!("Optimization completed successfully");
    Ok(result)
}

// ============================================================================
// Capacity Analytics Commands
// ============================================================================

#[tauri::command]
pub async fn get_capacity_overview(
    pool: tauri::State<'_, DbPool>,
    planning_period_id: i64,
) -> Result<CapacityOverview, String> {
    debug!("Getting capacity overview for planning period ID: {}", planning_period_id);

    // Load planning period
    let planning_period = sqlx::query_as::<_, PlanningPeriod>(
        "SELECT * FROM planning_periods WHERE id = ?"
    )
    .bind(planning_period_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Failed to fetch planning period: {}", e))?;

    // Load all people
    let people = sqlx::query_as::<_, Person>("SELECT * FROM people ORDER BY name")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| format!("Failed to fetch people: {}", e))?;

    // Load all projects
    let projects = sqlx::query_as::<_, Project>("SELECT * FROM projects ORDER BY name")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| format!("Failed to fetch projects: {}", e))?;

    // Load project requirements
    let requirements = sqlx::query_as::<_, ProjectRequirement>(
        "SELECT * FROM project_requirements WHERE planning_period_id = ?"
    )
    .bind(planning_period_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Failed to fetch project requirements: {}", e))?;

    let requirements_map: HashMap<i64, ProjectRequirement> = requirements
        .into_iter()
        .map(|r| (r.project_id, r))
        .collect();

    // Load all assignments for this planning period
    let assignments = sqlx::query_as::<_, Assignment>(
        "SELECT * FROM assignments WHERE planning_period_id = ?"
    )
    .bind(planning_period_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Failed to fetch assignments: {}", e))?;

    // Build people capacity
    let mut people_capacity = Vec::new();
    let mut over_committed_count = 0;

    for person in &people {
        let available_hours = calculate_person_available_hours(person, &planning_period, pool.inner()).await?;
        
        let person_assignments: Vec<&Assignment> = assignments
            .iter()
            .filter(|a| a.person_id == person.id)
            .collect();

        let mut total_allocated_hours = 0.0;
        let mut total_effective_hours = 0.0;
        let mut assignment_summaries = Vec::new();

        for assignment in &person_assignments {
            let allocation_pct = if assignment.is_pinned {
                assignment.pinned_allocation_percentage.unwrap_or(0.0)
            } else {
                assignment.calculated_allocation_percentage.unwrap_or(0.0)
            };

            let allocated_hours = available_hours * (allocation_pct / 100.0);
            let effective_hours = assignment.calculated_effective_hours.unwrap_or(0.0);

            total_allocated_hours += allocated_hours;
            total_effective_hours += effective_hours;

            // Get project name
            let project_name = projects
                .iter()
                .find(|p| p.id == assignment.project_id)
                .map(|p| p.name.clone())
                .unwrap_or_else(|| format!("Project {}", assignment.project_id));

            assignment_summaries.push(AssignmentSummary {
                assignment_id: assignment.id,
                project_name,
                allocation_percentage: allocation_pct,
                effective_hours,
                is_pinned: assignment.is_pinned,
            });
        }

        let utilization = if available_hours > 0.0 {
            (total_allocated_hours / available_hours) * 100.0
        } else {
            0.0
        };

        let is_over_committed = utilization > 100.0;
        if is_over_committed {
            over_committed_count += 1;
        }

        people_capacity.push(PersonCapacity {
            person_id: person.id,
            person_name: person.name.clone(),
            total_available_hours: available_hours,
            total_allocated_hours,
            total_effective_hours,
            utilization_percentage: utilization,
            is_over_committed,
            assignments: assignment_summaries,
        });
    }

    // Build project staffing
    let mut project_staffing = Vec::new();
    let mut under_staffed_count = 0;

    for project in &projects {
        // Only include projects that have requirements in this planning period
        if let Some(requirement) = requirements_map.get(&project.id) {
            let project_assignments: Vec<&Assignment> = assignments
                .iter()
                .filter(|a| a.project_id == project.id)
                .collect();

            let mut total_allocated_hours = 0.0;
            let mut total_effective_hours = 0.0;
            let mut assigned_people_summaries = Vec::new();

            for assignment in &project_assignments {
                let person = people.iter().find(|p| p.id == assignment.person_id);
                
                if let Some(person) = person {
                    let available_hours = calculate_person_available_hours(person, &planning_period, pool.inner()).await?;
                    
                    let allocation_pct = if assignment.is_pinned {
                        assignment.pinned_allocation_percentage.unwrap_or(0.0)
                    } else {
                        assignment.calculated_allocation_percentage.unwrap_or(0.0)
                    };

                    let allocated_hours = available_hours * (allocation_pct / 100.0);
                    let effective_hours = assignment.calculated_effective_hours.unwrap_or(0.0);

                    total_allocated_hours += allocated_hours;
                    total_effective_hours += effective_hours;

                    assigned_people_summaries.push(PersonAssignmentSummary {
                        assignment_id: assignment.id,
                        person_name: person.name.clone(),
                        allocation_percentage: allocation_pct,
                        productivity_factor: assignment.productivity_factor,
                        effective_hours,
                    });
                }
            }

            let staffing_percentage = if requirement.required_hours > 0.0 {
                (total_effective_hours / requirement.required_hours) * 100.0
            } else {
                0.0
            };

            let is_viable = staffing_percentage >= 100.0;
            let shortfall = if !is_viable {
                requirement.required_hours - total_effective_hours
            } else {
                0.0
            };

            if !is_viable {
                under_staffed_count += 1;
            }

            project_staffing.push(ProjectStaffing {
                project_id: project.id,
                project_name: project.name.clone(),
                required_hours: requirement.required_hours,
                total_allocated_hours,
                total_effective_hours,
                staffing_percentage,
                is_viable,
                shortfall,
                assigned_people: assigned_people_summaries,
            });
        }
    }

    let overview = CapacityOverview {
        total_people: people.len(),
        total_projects: project_staffing.len(),
        over_committed_people: over_committed_count,
        under_staffed_projects: under_staffed_count,
        people_capacity,
        project_staffing,
    };

    info!("Successfully generated capacity overview");
    Ok(overview)
}

#[tauri::command]
pub async fn get_person_capacity(
    pool: tauri::State<'_, DbPool>,
    person_id: i64,
    planning_period_id: i64,
) -> Result<PersonCapacity, String> {
    debug!("Getting capacity for person ID: {} in period ID: {}", person_id, planning_period_id);

    // Load person
    let person = sqlx::query_as::<_, Person>("SELECT * FROM people WHERE id = ?")
        .bind(person_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| format!("Failed to fetch person: {}", e))?;

    // Load planning period
    let planning_period = sqlx::query_as::<_, PlanningPeriod>(
        "SELECT * FROM planning_periods WHERE id = ?"
    )
    .bind(planning_period_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Failed to fetch planning period: {}", e))?;

    // Calculate available hours
    let available_hours = calculate_person_available_hours(&person, &planning_period, pool.inner()).await?;

    // Load assignments
    let assignments = sqlx::query_as::<_, Assignment>(
        "SELECT * FROM assignments WHERE person_id = ? AND planning_period_id = ?"
    )
    .bind(person_id)
    .bind(planning_period_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Failed to fetch assignments: {}", e))?;

    let mut total_allocated_hours = 0.0;
    let mut total_effective_hours = 0.0;
    let mut assignment_summaries = Vec::new();

    for assignment in assignments {
        let allocation_pct = if assignment.is_pinned {
            assignment.pinned_allocation_percentage.unwrap_or(0.0)
        } else {
            assignment.calculated_allocation_percentage.unwrap_or(0.0)
        };

        let allocated_hours = available_hours * (allocation_pct / 100.0);
        let effective_hours = assignment.calculated_effective_hours.unwrap_or(0.0);

        total_allocated_hours += allocated_hours;
        total_effective_hours += effective_hours;

        // Get project name
        let project_name = sqlx::query_scalar::<_, String>("SELECT name FROM projects WHERE id = ?")
            .bind(assignment.project_id)
            .fetch_one(pool.inner())
            .await
            .unwrap_or_else(|_| format!("Project {}", assignment.project_id));

        assignment_summaries.push(AssignmentSummary {
            assignment_id: assignment.id,
            project_name,
            allocation_percentage: allocation_pct,
            effective_hours,
            is_pinned: assignment.is_pinned,
        });
    }

    let utilization = if available_hours > 0.0 {
        (total_allocated_hours / available_hours) * 100.0
    } else {
        0.0
    };

    let capacity = PersonCapacity {
        person_id: person.id,
        person_name: person.name,
        total_available_hours: available_hours,
        total_allocated_hours,
        total_effective_hours,
        utilization_percentage: utilization,
        is_over_committed: utilization > 100.0,
        assignments: assignment_summaries,
    };

    info!("Successfully generated person capacity");
    Ok(capacity)
}

#[tauri::command]
pub async fn get_project_staffing(
    pool: tauri::State<'_, DbPool>,
    project_id: i64,
    planning_period_id: i64,
) -> Result<ProjectStaffing, String> {
    debug!("Getting staffing for project ID: {} in period ID: {}", project_id, planning_period_id);

    // Load project
    let project = sqlx::query_as::<_, Project>("SELECT * FROM projects WHERE id = ?")
        .bind(project_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| format!("Failed to fetch project: {}", e))?;

    // Load planning period
    let planning_period = sqlx::query_as::<_, PlanningPeriod>(
        "SELECT * FROM planning_periods WHERE id = ?"
    )
    .bind(planning_period_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Failed to fetch planning period: {}", e))?;

    // Load project requirement
    let requirement = sqlx::query_as::<_, ProjectRequirement>(
        "SELECT * FROM project_requirements WHERE project_id = ? AND planning_period_id = ?"
    )
    .bind(project_id)
    .bind(planning_period_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Failed to fetch project requirement: {}", e))?;

    // Load assignments
    let assignments = sqlx::query_as::<_, Assignment>(
        "SELECT * FROM assignments WHERE project_id = ? AND planning_period_id = ?"
    )
    .bind(project_id)
    .bind(planning_period_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Failed to fetch assignments: {}", e))?;

    let mut total_allocated_hours = 0.0;
    let mut total_effective_hours = 0.0;
    let mut assigned_people_summaries = Vec::new();

    for assignment in assignments {
        // Load person
        let person = sqlx::query_as::<_, Person>("SELECT * FROM people WHERE id = ?")
            .bind(assignment.person_id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| format!("Failed to fetch person: {}", e))?;

        let available_hours = calculate_person_available_hours(&person, &planning_period, pool.inner()).await?;

        let allocation_pct = if assignment.is_pinned {
            assignment.pinned_allocation_percentage.unwrap_or(0.0)
        } else {
            assignment.calculated_allocation_percentage.unwrap_or(0.0)
        };

        let allocated_hours = available_hours * (allocation_pct / 100.0);
        let effective_hours = assignment.calculated_effective_hours.unwrap_or(0.0);

        total_allocated_hours += allocated_hours;
        total_effective_hours += effective_hours;

        assigned_people_summaries.push(PersonAssignmentSummary {
            assignment_id: assignment.id,
            person_name: person.name,
            allocation_percentage: allocation_pct,
            productivity_factor: assignment.productivity_factor,
            effective_hours,
        });
    }

    let staffing_percentage = if requirement.required_hours > 0.0 {
        (total_effective_hours / requirement.required_hours) * 100.0
    } else {
        0.0
    };

    let is_viable = staffing_percentage >= 100.0;
    let shortfall = if !is_viable {
        requirement.required_hours - total_effective_hours
    } else {
        0.0
    };

    let staffing = ProjectStaffing {
        project_id: project.id,
        project_name: project.name,
        required_hours: requirement.required_hours,
        total_allocated_hours,
        total_effective_hours,
        staffing_percentage,
        is_viable,
        shortfall,
        assigned_people: assigned_people_summaries,
    };

    info!("Successfully generated project staffing");
    Ok(staffing)
}
