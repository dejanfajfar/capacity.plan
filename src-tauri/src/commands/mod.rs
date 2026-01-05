use crate::capacity::{
    calculate_person_available_hours, optimize_assignments_proportional, AssignmentSummary,
    CapacityOverview, OptimizationResult, PersonAssignmentSummary, PersonCapacity, ProjectStaffing,
};
use crate::db::DbPool;
use crate::models::{
    Absence, Assignment, Country, CountryDependencies, CreateAbsenceInput, CreateAssignmentInput,
    CreateCountryInput, CreateHolidayInput, CreatePersonInput, CreatePlanningPeriodInput,
    CreateProjectInput, CreateProjectRequirementInput, Holiday, HolidayWithCountry, Person,
    PersonDependencies, PlanningPeriod, PlanningPeriodDependencies, Project, ProjectDependencies,
    ProjectRequirement,
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
    let result = sqlx::query(
        "INSERT INTO people (name, email, available_hours_per_week, country_id) VALUES (?, ?, ?, ?)",
    )
    .bind(&input.name)
    .bind(&input.email)
    .bind(input.available_hours_per_week)
    .bind(input.country_id)
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
        "UPDATE people SET name = ?, email = ?, available_hours_per_week = ?, country_id = ? WHERE id = ?",
    )
    .bind(&input.name)
    .bind(&input.email)
    .bind(input.available_hours_per_week)
    .bind(input.country_id)
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
         WHERE person_id = ?",
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

    info!(
        "Successfully deleted person ID: {} and invalidated allocations",
        id
    );
    Ok(())
}

#[tauri::command]
pub async fn check_person_dependencies(
    pool: tauri::State<'_, DbPool>,
    id: i64,
) -> Result<PersonDependencies, String> {
    debug!("Checking dependencies for person ID: {}", id);

    let assignment_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM assignments WHERE person_id = ?")
            .bind(id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| {
                error!("Failed to count assignments: {}", e);
                e.to_string()
            })?;

    let absence_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM absences WHERE person_id = ?")
            .bind(id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| {
                error!("Failed to count absences: {}", e);
                e.to_string()
            })?;

    info!(
        "Person ID {} has {} assignments and {} absences",
        id, assignment_count, absence_count
    );

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
        "SELECT * FROM absences WHERE person_id = ? ORDER BY start_date DESC",
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
         VALUES (?, ?, ?, ?, ?)",
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
pub async fn update_absence(
    pool: tauri::State<'_, DbPool>,
    id: i64,
    input: CreateAbsenceInput,
) -> Result<Absence, String> {
    debug!("Updating absence ID: {}", id);

    sqlx::query(
        "UPDATE absences 
         SET start_date = ?, end_date = ?, days = ?, reason = ?
         WHERE id = ?",
    )
    .bind(&input.start_date)
    .bind(&input.end_date)
    .bind(input.days)
    .bind(&input.reason)
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to update absence: {}", e);
        e.to_string()
    })?;

    let absence = sqlx::query_as::<_, Absence>("SELECT * FROM absences WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch updated absence: {}", e);
            e.to_string()
        })?;

    info!("Successfully updated absence ID: {}", id);
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
// Overhead Commands
// ============================================================================

#[tauri::command]
pub async fn list_overheads(
    pool: tauri::State<'_, DbPool>,
    planning_period_id: i64,
) -> Result<Vec<crate::models::Overhead>, String> {
    debug!(
        "Fetching overheads for planning period ID: {}",
        planning_period_id
    );

    let overheads = sqlx::query_as::<_, crate::models::Overhead>(
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
    input: crate::models::CreateOverheadInput,
) -> Result<crate::models::Overhead, String> {
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

    let overhead =
        sqlx::query_as::<_, crate::models::Overhead>("SELECT * FROM overheads WHERE id = ?")
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
    input: crate::models::CreateOverheadInput,
) -> Result<crate::models::Overhead, String> {
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

    let overhead =
        sqlx::query_as::<_, crate::models::Overhead>("SELECT * FROM overheads WHERE id = ?")
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

// ============================================================================
// Overhead Assignment Commands
// ============================================================================

#[tauri::command]
pub async fn list_overhead_assignments(
    pool: tauri::State<'_, DbPool>,
    overhead_id: i64,
) -> Result<Vec<crate::models::OverheadAssignment>, String> {
    debug!(
        "Fetching overhead assignments for overhead ID: {}",
        overhead_id
    );

    let assignments = sqlx::query_as::<_, crate::models::OverheadAssignment>(
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

#[derive(Debug, serde::Serialize, sqlx::FromRow)]
pub struct OverheadAssignmentWithDetails {
    pub id: i64,
    pub overhead_id: i64,
    pub overhead_name: String,
    pub overhead_description: Option<String>,
    pub person_id: i64,
    pub effort_hours: f64,
    pub effort_period: String,
    pub created_at: String,
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
    input: crate::models::CreateOverheadAssignmentInput,
) -> Result<crate::models::OverheadAssignment, String> {
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

    let assignment = sqlx::query_as::<_, crate::models::OverheadAssignment>(
        "SELECT * FROM overhead_assignments WHERE id = ?",
    )
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
    input: crate::models::CreateOverheadAssignmentInput,
) -> Result<crate::models::OverheadAssignment, String> {
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

    let assignment = sqlx::query_as::<_, crate::models::OverheadAssignment>(
        "SELECT * FROM overhead_assignments WHERE id = ?",
    )
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

// ============================================================================
// Country Commands
// ============================================================================

#[tauri::command]
pub async fn list_countries(pool: tauri::State<'_, DbPool>) -> Result<Vec<Country>, String> {
    debug!("Fetching all countries");

    let countries = sqlx::query_as::<_, Country>("SELECT * FROM countries ORDER BY name")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch countries: {}", e);
            e.to_string()
        })?;

    info!("Successfully fetched {} countries", countries.len());
    Ok(countries)
}

#[tauri::command]
pub async fn create_country(
    pool: tauri::State<'_, DbPool>,
    input: CreateCountryInput,
) -> Result<Country, String> {
    debug!("Creating country: {}", input.name);

    // Validate ISO code format: exactly 3 uppercase letters
    let iso_code = input.iso_code.trim().to_uppercase();
    if iso_code.len() != 3 || !iso_code.chars().all(|c| c.is_ascii_alphabetic()) {
        warn!("Invalid ISO code format: {}", iso_code);
        return Err(
            "ISO code must be exactly 3 uppercase letters (e.g., USA, GBR, DEU)".to_string(),
        );
    }

    let result = sqlx::query("INSERT INTO countries (iso_code, name) VALUES (?, ?)")
        .bind(&iso_code)
        .bind(&input.name)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to insert country: {}", e);
            if e.to_string().contains("UNIQUE constraint failed") {
                format!("Country with ISO code '{}' already exists", iso_code)
            } else {
                e.to_string()
            }
        })?;

    let id = result.last_insert_rowid();
    debug!("Inserted country with ID: {}", id);

    let country = sqlx::query_as::<_, Country>("SELECT * FROM countries WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch created country: {}", e);
            e.to_string()
        })?;

    info!("Successfully created country: {}", country.name);
    Ok(country)
}

#[tauri::command]
pub async fn update_country(
    pool: tauri::State<'_, DbPool>,
    id: i64,
    input: CreateCountryInput,
) -> Result<Country, String> {
    debug!("Updating country ID: {}", id);

    // Validate ISO code format: exactly 3 uppercase letters
    let iso_code = input.iso_code.trim().to_uppercase();
    if iso_code.len() != 3 || !iso_code.chars().all(|c| c.is_ascii_alphabetic()) {
        warn!("Invalid ISO code format: {}", iso_code);
        return Err(
            "ISO code must be exactly 3 uppercase letters (e.g., USA, GBR, DEU)".to_string(),
        );
    }

    sqlx::query("UPDATE countries SET iso_code = ?, name = ? WHERE id = ?")
        .bind(&iso_code)
        .bind(&input.name)
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to update country: {}", e);
            if e.to_string().contains("UNIQUE constraint failed") {
                format!("Country with ISO code '{}' already exists", iso_code)
            } else {
                e.to_string()
            }
        })?;

    let country = sqlx::query_as::<_, Country>("SELECT * FROM countries WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch updated country: {}", e);
            e.to_string()
        })?;

    info!("Successfully updated country: {}", country.name);
    Ok(country)
}

#[tauri::command]
pub async fn delete_country(pool: tauri::State<'_, DbPool>, id: i64) -> Result<(), String> {
    debug!("Deleting country ID: {}", id);

    // Delete country (CASCADE will delete holidays, SET NULL will update people)
    sqlx::query("DELETE FROM countries WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to delete country: {}", e);
            e.to_string()
        })?;

    info!("Successfully deleted country ID: {}", id);
    Ok(())
}

#[tauri::command]
pub async fn check_country_dependencies(
    pool: tauri::State<'_, DbPool>,
    id: i64,
) -> Result<CountryDependencies, String> {
    debug!("Checking dependencies for country ID: {}", id);

    let holiday_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM holidays WHERE country_id = ?")
            .bind(id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| {
                error!("Failed to count holidays: {}", e);
                e.to_string()
            })?;

    let people_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM people WHERE country_id = ?")
            .bind(id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| {
                error!("Failed to count people: {}", e);
                e.to_string()
            })?;

    info!(
        "Country ID {} has {} holidays and {} people",
        id, holiday_count, people_count
    );

    Ok(CountryDependencies {
        holiday_count,
        people_count,
    })
}

// ============================================================================
// Holiday Commands
// ============================================================================

#[tauri::command]
pub async fn list_holidays(
    pool: tauri::State<'_, DbPool>,
    country_id: Option<i64>,
) -> Result<Vec<HolidayWithCountry>, String> {
    debug!("Fetching holidays");

    let holidays = if let Some(cid) = country_id {
        debug!("Filtering by country ID: {}", cid);
        sqlx::query_as::<_, HolidayWithCountry>(
            "SELECT h.id, h.country_id, c.iso_code as country_iso_code, c.name as country_name,
                    h.name, h.start_date, h.end_date, h.created_at
             FROM holidays h
             JOIN countries c ON h.country_id = c.id
             WHERE h.country_id = ?
             ORDER BY h.start_date, c.name",
        )
        .bind(cid)
        .fetch_all(pool.inner())
        .await
    } else {
        sqlx::query_as::<_, HolidayWithCountry>(
            "SELECT h.id, h.country_id, c.iso_code as country_iso_code, c.name as country_name,
                    h.name, h.start_date, h.end_date, h.created_at
             FROM holidays h
             JOIN countries c ON h.country_id = c.id
             ORDER BY c.name, h.start_date",
        )
        .fetch_all(pool.inner())
        .await
    }
    .map_err(|e| {
        error!("Failed to fetch holidays: {}", e);
        e.to_string()
    })?;

    info!("Successfully fetched {} holidays", holidays.len());
    Ok(holidays)
}

#[tauri::command]
pub async fn list_holidays_for_person(
    pool: tauri::State<'_, DbPool>,
    person_id: i64,
    start_date: String,
    end_date: String,
) -> Result<Vec<Holiday>, String> {
    debug!(
        "Fetching holidays for person ID: {} between {} and {}",
        person_id, start_date, end_date
    );

    // First get the person's country
    let person = sqlx::query_as::<_, Person>("SELECT * FROM people WHERE id = ?")
        .bind(person_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch person: {}", e);
            e.to_string()
        })?;

    // If person has no country, return empty list
    let country_id = match person.country_id {
        Some(cid) => cid,
        None => {
            debug!("Person has no country assigned, returning empty holidays list");
            return Ok(vec![]);
        }
    };

    // Query holidays for the person's country within the date range
    // A holiday overlaps if: holiday_start <= range_end AND holiday_end >= range_start
    let holidays = sqlx::query_as::<_, Holiday>(
        "SELECT * FROM holidays 
         WHERE country_id = ? 
         AND start_date <= ? 
         AND end_date >= ?
         ORDER BY start_date",
    )
    .bind(country_id)
    .bind(&end_date)
    .bind(&start_date)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to fetch holidays for person: {}", e);
        e.to_string()
    })?;

    info!(
        "Successfully fetched {} holidays for person ID: {}",
        holidays.len(),
        person_id
    );
    Ok(holidays)
}

#[tauri::command]
pub async fn create_holiday(
    pool: tauri::State<'_, DbPool>,
    input: CreateHolidayInput,
) -> Result<Holiday, String> {
    debug!("Creating holiday for country ID: {}", input.country_id);

    // Validate dates: start_date <= end_date
    if input.start_date > input.end_date {
        warn!("Invalid date range: start date after end date");
        return Err("Start date must be on or before end date".to_string());
    }

    // Check for overlapping holidays in the same country
    let overlapping_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM holidays 
         WHERE country_id = ? 
         AND start_date <= ? 
         AND end_date >= ?",
    )
    .bind(input.country_id)
    .bind(&input.end_date)
    .bind(&input.start_date)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to check for overlapping holidays: {}", e);
        e.to_string()
    })?;

    if overlapping_count > 0 {
        warn!(
            "Overlapping holiday detected for country ID: {}",
            input.country_id
        );
        return Err("A holiday already exists for this country during this period. Overlapping holidays are not allowed.".to_string());
    }

    let result = sqlx::query(
        "INSERT INTO holidays (country_id, name, start_date, end_date) VALUES (?, ?, ?, ?)",
    )
    .bind(input.country_id)
    .bind(&input.name)
    .bind(&input.start_date)
    .bind(&input.end_date)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to insert holiday: {}", e);
        e.to_string()
    })?;

    let id = result.last_insert_rowid();
    debug!("Inserted holiday with ID: {}", id);

    let holiday = sqlx::query_as::<_, Holiday>("SELECT * FROM holidays WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch created holiday: {}", e);
            e.to_string()
        })?;

    info!("Successfully created holiday");
    Ok(holiday)
}

#[tauri::command]
pub async fn update_holiday(
    pool: tauri::State<'_, DbPool>,
    id: i64,
    input: CreateHolidayInput,
) -> Result<Holiday, String> {
    debug!("Updating holiday ID: {}", id);

    // Validate dates: start_date <= end_date
    if input.start_date > input.end_date {
        warn!("Invalid date range: start date after end date");
        return Err("Start date must be on or before end date".to_string());
    }

    // Check for overlapping holidays in the same country (excluding current holiday)
    let overlapping_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM holidays 
         WHERE country_id = ? 
         AND id != ?
         AND start_date <= ? 
         AND end_date >= ?",
    )
    .bind(input.country_id)
    .bind(id)
    .bind(&input.end_date)
    .bind(&input.start_date)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to check for overlapping holidays: {}", e);
        e.to_string()
    })?;

    if overlapping_count > 0 {
        warn!(
            "Overlapping holiday detected for country ID: {}",
            input.country_id
        );
        return Err("A holiday already exists for this country during this period. Overlapping holidays are not allowed.".to_string());
    }

    sqlx::query(
        "UPDATE holidays SET country_id = ?, name = ?, start_date = ?, end_date = ? WHERE id = ?",
    )
    .bind(input.country_id)
    .bind(&input.name)
    .bind(&input.start_date)
    .bind(&input.end_date)
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to update holiday: {}", e);
        e.to_string()
    })?;

    let holiday = sqlx::query_as::<_, Holiday>("SELECT * FROM holidays WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch updated holiday: {}", e);
            e.to_string()
        })?;

    info!("Successfully updated holiday ID: {}", id);
    Ok(holiday)
}

#[tauri::command]
pub async fn delete_holiday(pool: tauri::State<'_, DbPool>, id: i64) -> Result<(), String> {
    debug!("Deleting holiday ID: {}", id);

    sqlx::query("DELETE FROM holidays WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to delete holiday: {}", e);
            e.to_string()
        })?;

    info!("Successfully deleted holiday ID: {}", id);
    Ok(())
}

#[tauri::command]
pub async fn batch_create_holidays(
    pool: tauri::State<'_, DbPool>,
    holidays: Vec<CreateHolidayInput>,
) -> Result<(), String> {
    debug!("Batch creating {} holidays", holidays.len());

    // Start a transaction
    let mut tx = pool.begin().await.map_err(|e| {
        error!("Failed to start transaction: {}", e);
        e.to_string()
    })?;

    for holiday in holidays {
        // Validate dates
        if holiday.start_date > holiday.end_date {
            return Err("Start date must be on or before end date for all holidays".to_string());
        }

        sqlx::query(
            "INSERT INTO holidays (country_id, name, start_date, end_date) VALUES (?, ?, ?, ?)",
        )
        .bind(holiday.country_id)
        .bind(&holiday.name)
        .bind(&holiday.start_date)
        .bind(&holiday.end_date)
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            error!("Failed to insert holiday in batch: {}", e);
            e.to_string()
        })?;
    }

    tx.commit().await.map_err(|e| {
        error!("Failed to commit transaction: {}", e);
        e.to_string()
    })?;

    info!("Successfully batch created holidays");
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
    info!(
        "Running optimization for planning period ID: {}",
        planning_period_id
    );

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
    debug!(
        "Getting capacity overview for planning period ID: {}",
        planning_period_id
    );

    // Load planning period
    let planning_period =
        sqlx::query_as::<_, PlanningPeriod>("SELECT * FROM planning_periods WHERE id = ?")
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
        "SELECT * FROM project_requirements WHERE planning_period_id = ?",
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
    let assignments =
        sqlx::query_as::<_, Assignment>("SELECT * FROM assignments WHERE planning_period_id = ?")
            .bind(planning_period_id)
            .fetch_all(pool.inner())
            .await
            .map_err(|e| format!("Failed to fetch assignments: {}", e))?;

    // Build people capacity
    let mut people_capacity = Vec::new();
    let mut over_committed_count = 0;

    for person in &people {
        let breakdown =
            calculate_person_available_hours(person, &planning_period, pool.inner()).await?;

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

            let allocated_hours = breakdown.available_hours * (allocation_pct / 100.0);
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

        let utilization = if breakdown.available_hours > 0.0 {
            (total_allocated_hours / breakdown.available_hours) * 100.0
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
            person_email: person.email.clone(),
            total_available_hours: breakdown.available_hours,
            total_allocated_hours,
            total_effective_hours,
            utilization_percentage: utilization,
            is_over_committed,
            assignments: assignment_summaries,
            absence_days: breakdown.absence_days,
            absence_hours: breakdown.absence_hours,
            holiday_days: breakdown.holiday_days,
            holiday_hours: breakdown.holiday_hours,
            base_available_hours: breakdown.base_hours,
            overhead_hours: breakdown.overhead_hours,
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
                    let breakdown =
                        calculate_person_available_hours(person, &planning_period, pool.inner())
                            .await?;

                    let allocation_pct = if assignment.is_pinned {
                        assignment.pinned_allocation_percentage.unwrap_or(0.0)
                    } else {
                        assignment.calculated_allocation_percentage.unwrap_or(0.0)
                    };

                    let allocated_hours = breakdown.available_hours * (allocation_pct / 100.0);
                    let effective_hours = assignment.calculated_effective_hours.unwrap_or(0.0);

                    total_allocated_hours += allocated_hours;
                    total_effective_hours += effective_hours;

                    assigned_people_summaries.push(PersonAssignmentSummary {
                        assignment_id: assignment.id,
                        person_name: person.name.clone(),
                        allocation_percentage: allocation_pct,
                        productivity_factor: assignment.productivity_factor,
                        effective_hours,
                        absence_days: breakdown.absence_days,
                        absence_hours: breakdown.absence_hours,
                        holiday_days: breakdown.holiday_days,
                        holiday_hours: breakdown.holiday_hours,
                        overhead_hours: breakdown.overhead_hours,
                    });
                }
            }

            let staffing_percentage = if requirement.required_hours > 0.0 {
                (total_effective_hours / requirement.required_hours) * 100.0
            } else {
                0.0
            };

            // Use tolerance for floating-point comparison (99.95% rounds to 100.0%)
            let is_viable = staffing_percentage >= 99.95;
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
    debug!(
        "Getting capacity for person ID: {} in period ID: {}",
        person_id, planning_period_id
    );

    // Load person
    let person = sqlx::query_as::<_, Person>("SELECT * FROM people WHERE id = ?")
        .bind(person_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| format!("Failed to fetch person: {}", e))?;

    // Load planning period
    let planning_period =
        sqlx::query_as::<_, PlanningPeriod>("SELECT * FROM planning_periods WHERE id = ?")
            .bind(planning_period_id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| format!("Failed to fetch planning period: {}", e))?;

    // Calculate available hours
    let breakdown =
        calculate_person_available_hours(&person, &planning_period, pool.inner()).await?;

    // Load assignments
    let assignments = sqlx::query_as::<_, Assignment>(
        "SELECT * FROM assignments WHERE person_id = ? AND planning_period_id = ?",
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

        let allocated_hours = breakdown.available_hours * (allocation_pct / 100.0);
        let effective_hours = assignment.calculated_effective_hours.unwrap_or(0.0);

        total_allocated_hours += allocated_hours;
        total_effective_hours += effective_hours;

        // Get project name
        let project_name =
            sqlx::query_scalar::<_, String>("SELECT name FROM projects WHERE id = ?")
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

    let utilization = if breakdown.available_hours > 0.0 {
        (total_allocated_hours / breakdown.available_hours) * 100.0
    } else {
        0.0
    };

    let capacity = PersonCapacity {
        person_id: person.id,
        person_name: person.name.clone(),
        person_email: person.email,
        total_available_hours: breakdown.available_hours,
        total_allocated_hours,
        total_effective_hours,
        utilization_percentage: utilization,
        is_over_committed: utilization > 100.0,
        assignments: assignment_summaries,
        absence_days: breakdown.absence_days,
        absence_hours: breakdown.absence_hours,
        holiday_days: breakdown.holiday_days,
        holiday_hours: breakdown.holiday_hours,
        base_available_hours: breakdown.base_hours,
        overhead_hours: breakdown.overhead_hours,
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
    debug!(
        "Getting staffing for project ID: {} in period ID: {}",
        project_id, planning_period_id
    );

    // Load project
    let project = sqlx::query_as::<_, Project>("SELECT * FROM projects WHERE id = ?")
        .bind(project_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| format!("Failed to fetch project: {}", e))?;

    // Load planning period
    let planning_period =
        sqlx::query_as::<_, PlanningPeriod>("SELECT * FROM planning_periods WHERE id = ?")
            .bind(planning_period_id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| format!("Failed to fetch planning period: {}", e))?;

    // Load project requirement
    let requirement = sqlx::query_as::<_, ProjectRequirement>(
        "SELECT * FROM project_requirements WHERE project_id = ? AND planning_period_id = ?",
    )
    .bind(project_id)
    .bind(planning_period_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Failed to fetch project requirement: {}", e))?;

    // Load assignments
    let assignments = sqlx::query_as::<_, Assignment>(
        "SELECT * FROM assignments WHERE project_id = ? AND planning_period_id = ?",
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

        let breakdown =
            calculate_person_available_hours(&person, &planning_period, pool.inner()).await?;

        let allocation_pct = if assignment.is_pinned {
            assignment.pinned_allocation_percentage.unwrap_or(0.0)
        } else {
            assignment.calculated_allocation_percentage.unwrap_or(0.0)
        };

        let allocated_hours = breakdown.available_hours * (allocation_pct / 100.0);
        let effective_hours = assignment.calculated_effective_hours.unwrap_or(0.0);

        total_allocated_hours += allocated_hours;
        total_effective_hours += effective_hours;

        assigned_people_summaries.push(PersonAssignmentSummary {
            assignment_id: assignment.id,
            person_name: person.name,
            allocation_percentage: allocation_pct,
            productivity_factor: assignment.productivity_factor,
            effective_hours,
            absence_days: breakdown.absence_days,
            absence_hours: breakdown.absence_hours,
            holiday_days: breakdown.holiday_days,
            holiday_hours: breakdown.holiday_hours,
            overhead_hours: breakdown.overhead_hours,
        });
    }

    let staffing_percentage = if requirement.required_hours > 0.0 {
        (total_effective_hours / requirement.required_hours) * 100.0
    } else {
        0.0
    };

    // Use tolerance for floating-point comparison (99.95% rounds to 100.0%)
    let is_viable = staffing_percentage >= 99.95;
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
