use crate::db::DbPool;
use crate::models::{Assignment, Person, PlanningPeriod, ProjectRequirement, Absence as ModelAbsence};
use chrono::NaiveDate;
use log::{debug, info, warn};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Analytics types
#[derive(Debug, Serialize, Deserialize)]
pub struct OptimizationResult {
    pub success: bool,
    pub calculations: Vec<AssignmentCalculation>,
    pub infeasible_projects: Vec<ProjectShortfall>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AssignmentCalculation {
    pub assignment_id: i64,
    pub calculated_allocation_percentage: f64,
    pub calculated_effective_hours: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectShortfall {
    pub project_id: i64,
    pub project_name: String,
    pub required_hours: f64,
    pub available_effective_hours: f64,
    pub shortfall: f64,
    pub shortfall_percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CapacityOverview {
    pub total_people: usize,
    pub total_projects: usize,
    pub over_committed_people: usize,
    pub under_staffed_projects: usize,
    pub people_capacity: Vec<PersonCapacity>,
    pub project_staffing: Vec<ProjectStaffing>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PersonCapacity {
    pub person_id: i64,
    pub person_name: String,
    pub total_available_hours: f64,
    pub total_allocated_hours: f64,
    pub total_effective_hours: f64,
    pub utilization_percentage: f64,
    pub is_over_committed: bool,
    pub assignments: Vec<AssignmentSummary>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectStaffing {
    pub project_id: i64,
    pub project_name: String,
    pub required_hours: f64,
    pub total_allocated_hours: f64,
    pub total_effective_hours: f64,
    pub staffing_percentage: f64,
    pub is_viable: bool,
    pub shortfall: f64,
    pub assigned_people: Vec<PersonAssignmentSummary>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AssignmentSummary {
    pub assignment_id: i64,
    pub project_name: String,
    pub allocation_percentage: f64,
    pub effective_hours: f64,
    pub is_pinned: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PersonAssignmentSummary {
    pub assignment_id: i64,
    pub person_name: String,
    pub allocation_percentage: f64,
    pub productivity_factor: f64,
    pub effective_hours: f64,
}

// Core calculation functions

/// Calculate available hours for a person in a planning period, accounting for absences
pub async fn calculate_person_available_hours(
    person: &Person,
    planning_period: &PlanningPeriod,
    pool: &DbPool,
) -> Result<f64, String> {
    // Parse dates
    let start = NaiveDate::parse_from_str(&planning_period.start_date, "%Y-%m-%d")
        .map_err(|e| format!("Invalid start date: {}", e))?;
    let end = NaiveDate::parse_from_str(&planning_period.end_date, "%Y-%m-%d")
        .map_err(|e| format!("Invalid end date: {}", e))?;

    // Calculate total days in period
    let total_days = (end - start).num_days() + 1;
    
    // Calculate working days (assume 5-day work week)
    let total_weeks = total_days as f64 / 7.0;
    let working_days = total_weeks * 5.0;

    // Get absences for this person within the planning period
    let absences = sqlx::query_as::<_, ModelAbsence>(
        "SELECT * FROM absences 
         WHERE person_id = ? 
         AND (
            (start_date >= ? AND start_date <= ?) OR
            (end_date >= ? AND end_date <= ?) OR
            (start_date <= ? AND end_date >= ?)
         )"
    )
    .bind(person.id)
    .bind(&planning_period.start_date)
    .bind(&planning_period.end_date)
    .bind(&planning_period.start_date)
    .bind(&planning_period.end_date)
    .bind(&planning_period.start_date)
    .bind(&planning_period.end_date)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch absences: {}", e))?;

    let total_absence_days: i64 = absences.iter().map(|a| a.days).sum();

    // Calculate available working days
    let available_working_days = working_days - total_absence_days as f64;
    
    // Calculate hours per day
    let hours_per_day = person.available_hours_per_week / 5.0;
    
    // Calculate total available hours
    let available_hours = available_working_days * hours_per_day;

    debug!(
        "Person {} available hours: {} (working days: {}, absence days: {}, hours/day: {})",
        person.name, available_hours, working_days, total_absence_days, hours_per_day
    );

    Ok(available_hours.max(0.0))
}

/// Calculate effective hours for an assignment
pub fn calculate_assignment_effective_hours(
    available_hours: f64,
    allocation_percentage: f64,
    productivity_factor: f64,
) -> f64 {
    available_hours * (allocation_percentage / 100.0) * productivity_factor
}

/// Proportional optimization algorithm
pub async fn optimize_assignments_proportional(
    planning_period_id: i64,
    pool: &DbPool,
) -> Result<OptimizationResult, String> {
    info!("Starting optimization for planning period {}", planning_period_id);

    // Load planning period
    let planning_period = sqlx::query_as::<_, PlanningPeriod>(
        "SELECT * FROM planning_periods WHERE id = ?"
    )
    .bind(planning_period_id)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch planning period: {}", e))?;

    // Load all assignments for this planning period
    let assignments = sqlx::query_as::<_, Assignment>(
        "SELECT * FROM assignments WHERE planning_period_id = ?"
    )
    .bind(planning_period_id)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch assignments: {}", e))?;

    if assignments.is_empty() {
        return Ok(OptimizationResult {
            success: true,
            calculations: vec![],
            infeasible_projects: vec![],
            warnings: vec!["No assignments found for this planning period".to_string()],
        });
    }

    // Load all people
    let people = sqlx::query_as::<_, Person>("SELECT * FROM people")
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch people: {}", e))?;

    let people_map: HashMap<i64, Person> = people.into_iter().map(|p| (p.id, p)).collect();

    // Calculate available hours for each person
    let mut person_available_hours: HashMap<i64, f64> = HashMap::new();
    for (person_id, person) in &people_map {
        let available = calculate_person_available_hours(person, &planning_period, pool).await?;
        person_available_hours.insert(*person_id, available);
    }

    // Load project requirements
    let requirements = sqlx::query_as::<_, ProjectRequirement>(
        "SELECT * FROM project_requirements WHERE planning_period_id = ?"
    )
    .bind(planning_period_id)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch project requirements: {}", e))?;

    let requirements_map: HashMap<i64, ProjectRequirement> = requirements
        .into_iter()
        .map(|r| (r.project_id, r))
        .collect();

    // Group assignments by project
    let mut assignments_by_project: HashMap<i64, Vec<&Assignment>> = HashMap::new();
    for assignment in &assignments {
        assignments_by_project
            .entry(assignment.project_id)
            .or_insert_with(Vec::new)
            .push(assignment);
    }

    let mut calculations = Vec::new();
    let mut infeasible_projects = Vec::new();
    let mut warnings = Vec::new();

    // Process each project
    for (project_id, project_assignments) in assignments_by_project {
        // Get project requirement
        let requirement = match requirements_map.get(&project_id) {
            Some(req) => req,
            None => {
                warnings.push(format!(
                    "Project ID {} has assignments but no requirement defined",
                    project_id
                ));
                continue;
            }
        };

        debug!("Processing project {} (required: {}h)", project_id, requirement.required_hours);

        // Separate pinned and unpinned assignments
        let mut pinned_assignments = Vec::new();
        let mut unpinned_assignments = Vec::new();
        let mut pinned_total_hours = 0.0;

        for assignment in &project_assignments {
            if assignment.is_pinned {
                pinned_assignments.push(*assignment);
                let available = person_available_hours.get(&assignment.person_id).unwrap_or(&0.0);
                let pinned_alloc = assignment.pinned_allocation_percentage.unwrap_or(0.0);
                let effective = calculate_assignment_effective_hours(
                    *available,
                    pinned_alloc,
                    assignment.productivity_factor,
                );
                pinned_total_hours += effective;
            } else {
                unpinned_assignments.push(*assignment);
            }
        }

        // Calculate remaining hours needed
        let remaining_hours = requirement.required_hours - pinned_total_hours;

        debug!("  Pinned hours: {}, Remaining needed: {}", pinned_total_hours, remaining_hours);

        // Calculate total capacity available for unpinned assignments
        let mut total_unpinned_capacity = 0.0;
        let mut unpinned_capacities = Vec::new();

        for assignment in &unpinned_assignments {
            let available = person_available_hours.get(&assignment.person_id).unwrap_or(&0.0);
            let max_contribution = available * assignment.productivity_factor;
            total_unpinned_capacity += max_contribution;
            unpinned_capacities.push((assignment.id, available, max_contribution, assignment.productivity_factor));
        }

        debug!("  Total unpinned capacity: {}", total_unpinned_capacity);

        // Calculate allocations for unpinned assignments
        let mut project_total_effective = pinned_total_hours;

        if total_unpinned_capacity > 0.0 {
            // Distribute proportionally
            for (assignment_id, available, max_contribution, productivity_factor) in unpinned_capacities {
                let proportion = max_contribution / total_unpinned_capacity;
                let allocated_hours = proportion * remaining_hours.max(0.0);
                
                // Calculate allocation percentage
                let allocation_percentage = if *available > 0.0 {
                    ((allocated_hours / productivity_factor) / available * 100.0).min(100.0)
                } else {
                    0.0
                };

                let effective_hours = calculate_assignment_effective_hours(
                    *available,
                    allocation_percentage,
                    productivity_factor,
                );

                project_total_effective += effective_hours;

                calculations.push(AssignmentCalculation {
                    assignment_id,
                    calculated_allocation_percentage: allocation_percentage,
                    calculated_effective_hours: effective_hours,
                });

                debug!("    Assignment {}: {}% allocation, {}h effective", 
                       assignment_id, allocation_percentage, effective_hours);
            }
        }

        // Store pinned assignments in calculations too
        for assignment in pinned_assignments {
            let available = person_available_hours.get(&assignment.person_id).unwrap_or(&0.0);
            let pinned_alloc = assignment.pinned_allocation_percentage.unwrap_or(0.0);
            let effective = calculate_assignment_effective_hours(
                *available,
                pinned_alloc,
                assignment.productivity_factor,
            );

            calculations.push(AssignmentCalculation {
                assignment_id: assignment.id,
                calculated_allocation_percentage: pinned_alloc,
                calculated_effective_hours: effective,
            });
        }

        // Check if project is viable
        if project_total_effective < requirement.required_hours {
            let shortfall = requirement.required_hours - project_total_effective;
            let shortfall_pct = (shortfall / requirement.required_hours) * 100.0;

            // Get project name
            let project_name = sqlx::query_scalar::<_, String>("SELECT name FROM projects WHERE id = ?")
                .bind(project_id)
                .fetch_one(pool)
                .await
                .unwrap_or_else(|_| format!("Project {}", project_id));

            infeasible_projects.push(ProjectShortfall {
                project_id,
                project_name,
                required_hours: requirement.required_hours,
                available_effective_hours: project_total_effective,
                shortfall,
                shortfall_percentage: shortfall_pct,
            });

            warn!("Project {} is under-staffed by {}h ({}%)", project_id, shortfall, shortfall_pct);
        }
    }

    // Update database with calculations
    let now = chrono::Utc::now().to_rfc3339();
    for calc in &calculations {
        sqlx::query(
            "UPDATE assignments 
             SET calculated_allocation_percentage = ?,
                 calculated_effective_hours = ?,
                 last_calculated_at = ?
             WHERE id = ?"
        )
        .bind(calc.calculated_allocation_percentage)
        .bind(calc.calculated_effective_hours)
        .bind(&now)
        .bind(calc.assignment_id)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to update assignment {}: {}", calc.assignment_id, e))?;
    }

    // Check for over-committed people
    let mut person_allocations: HashMap<i64, f64> = HashMap::new();
    for calc in &calculations {
        let assignment = assignments.iter().find(|a| a.id == calc.assignment_id).unwrap();
        *person_allocations.entry(assignment.person_id).or_insert(0.0) += calc.calculated_allocation_percentage;
    }

    for (person_id, total_allocation) in person_allocations {
        if total_allocation > 100.0 {
            let person_name = people_map.get(&person_id)
                .map(|p| p.name.clone())
                .unwrap_or_else(|| format!("Person {}", person_id));
            warnings.push(format!(
                "{} is over-allocated at {:.1}%",
                person_name, total_allocation
            ));
        }
    }

    info!(
        "Optimization complete: {} calculations, {} infeasible projects, {} warnings",
        calculations.len(),
        infeasible_projects.len(),
        warnings.len()
    );

    Ok(OptimizationResult {
        success: true,
        calculations,
        infeasible_projects,
        warnings,
    })
}
