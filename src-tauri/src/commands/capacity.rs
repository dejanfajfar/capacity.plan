use crate::capacity::{
    calculate_person_available_hours, AssignmentSummary, CapacityOverview, PersonAssignmentSummary,
    PersonCapacity, ProjectStaffing,
};
use crate::db::DbPool;
use crate::models::{Assignment, Person, PlanningPeriod, Project, ProjectRequirement};
use log::{debug, info};
use std::collections::HashMap;

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
            let allocation_pct = assignment.calculated_allocation_percentage.unwrap_or(0.0);

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
            optional_overhead_hours: breakdown.optional_overhead_hours,
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

                    let allocation_pct = assignment.calculated_allocation_percentage.unwrap_or(0.0);

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
                        optional_overhead_hours: breakdown.optional_overhead_hours,
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
        let allocation_pct = assignment.calculated_allocation_percentage.unwrap_or(0.0);

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
        optional_overhead_hours: breakdown.optional_overhead_hours,
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

        let allocation_pct = assignment.calculated_allocation_percentage.unwrap_or(0.0);

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
            optional_overhead_hours: breakdown.optional_overhead_hours,
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
