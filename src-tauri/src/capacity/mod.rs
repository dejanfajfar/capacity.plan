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

    // ========================================================================
    // PASS 1: Calculate per-person remaining capacity
    // ========================================================================
    
    #[derive(Debug)]
    struct PersonState {
        person_id: i64,
        available_hours: f64,
        pinned_total_percentage: f64,      // Sum across ALL projects
        remaining_capacity_percentage: f64, // 100.0 - pinned_total
    }

    let mut person_states: HashMap<i64, PersonState> = HashMap::new();

    // Initialize person states
    for (person_id, available_hours) in &person_available_hours {
        person_states.insert(*person_id, PersonState {
            person_id: *person_id,
            available_hours: *available_hours,
            pinned_total_percentage: 0.0,
            remaining_capacity_percentage: 100.0,
        });
    }

    // Calculate total pinned allocations per person (across ALL projects)
    for assignment in &assignments {
        if assignment.is_pinned {
            if let Some(pinned_pct) = assignment.pinned_allocation_percentage {
                let state = person_states.get_mut(&assignment.person_id).unwrap();
                state.pinned_total_percentage += pinned_pct;
            }
        }
    }

    // Calculate remaining capacity and warn if over-pinned
    for state in person_states.values_mut() {
        state.remaining_capacity_percentage = (100.0 - state.pinned_total_percentage).max(0.0);
        
        if state.pinned_total_percentage > 100.0 {
            let person_name = people_map.get(&state.person_id)
                .map(|p| p.name.clone())
                .unwrap_or_else(|| format!("Person {}", state.person_id));
            warnings.push(format!(
                "{} has {:.1}% pinned allocations (exceeds 100%). No additional capacity available.",
                person_name, state.pinned_total_percentage
            ));
        }
    }

    debug!("Pass 1 complete: Calculated per-person remaining capacity");

    // ========================================================================
    // PASS 2: Allocate projects by priority (high to low)
    // ========================================================================

    // Group assignments by project and priority
    let mut projects_by_priority: Vec<(i64, i64)> = Vec::new(); // (priority, project_id)
    
    for (project_id, _) in &assignments_by_project {
        let requirement = match requirements_map.get(project_id) {
            Some(req) => req,
            None => {
                warnings.push(format!(
                    "Project ID {} has assignments but no requirement defined",
                    project_id
                ));
                continue;
            }
        };
        projects_by_priority.push((requirement.priority, *project_id));
    }

    // Sort by priority DESC (blocker=30, high=20, medium=10, low=0)
    projects_by_priority.sort_by(|a, b| b.0.cmp(&a.0));

    // Group projects by priority level for proportional allocation within same priority
    let mut priority_groups: Vec<Vec<i64>> = Vec::new();
    let mut current_priority: Option<i64> = None;
    let mut current_group = Vec::new();

    for (priority, project_id) in projects_by_priority {
        if current_priority.is_none() || current_priority.unwrap() == priority {
            current_priority = Some(priority);
            current_group.push(project_id);
        } else {
            priority_groups.push(current_group);
            current_group = vec![project_id];
            current_priority = Some(priority);
        }
    }
    if !current_group.is_empty() {
        priority_groups.push(current_group);
    }

    // Process each priority group
    for priority_group in priority_groups {
        debug!("Processing priority group with {} projects", priority_group.len());

        // For each project in this priority group, calculate needs
        for project_id in priority_group {
            let project_assignments = assignments_by_project.get(&project_id).unwrap();
            let requirement = requirements_map.get(&project_id).unwrap();

            debug!("Processing project {} (required: {}h)", project_id, requirement.required_hours);

            // Separate pinned and unpinned assignments FOR THIS PROJECT
            let mut pinned_hours_this_project = 0.0;
            let mut unpinned_assignments = Vec::new();

            for assignment in project_assignments {
                if assignment.is_pinned {
                    let available = person_available_hours.get(&assignment.person_id).unwrap_or(&0.0);
                    let pinned_pct = assignment.pinned_allocation_percentage.unwrap_or(0.0);
                    let effective = calculate_assignment_effective_hours(
                        *available,
                        pinned_pct,
                        assignment.productivity_factor,
                    );
                    pinned_hours_this_project += effective;

                    // Store pinned calculation
                    calculations.push(AssignmentCalculation {
                        assignment_id: assignment.id,
                        calculated_allocation_percentage: pinned_pct,
                        calculated_effective_hours: effective,
                    });
                } else {
                    unpinned_assignments.push(assignment);
                }
            }

            let remaining_hours_needed = (requirement.required_hours - pinned_hours_this_project).max(0.0);
            debug!("  Pinned: {:.1}h, Remaining needed: {:.1}h", pinned_hours_this_project, remaining_hours_needed);

            // Calculate available capacity from unpinned assignments
            #[derive(Debug)]
            struct AssignmentCapacity<'a> {
                assignment: &'a Assignment,
                available_hours: f64,
                remaining_capacity_pct: f64,
                productivity_factor: f64,
                max_contribution_hours: f64,
            }

            let mut assignment_capacities = Vec::new();
            let mut total_available_hours = 0.0;

            for assignment in &unpinned_assignments {
                let state = person_states.get(&assignment.person_id).unwrap();
                let available = state.available_hours;
                let remaining_pct = state.remaining_capacity_percentage;
                
                // Max this person can contribute to THIS project
                let max_hours = available * (remaining_pct / 100.0) * assignment.productivity_factor;
                
                total_available_hours += max_hours;
                assignment_capacities.push(AssignmentCapacity {
                    assignment,
                    available_hours: available,
                    remaining_capacity_pct: remaining_pct,
                    productivity_factor: assignment.productivity_factor,
                    max_contribution_hours: max_hours,
                });
            }

            debug!("  Total available capacity: {:.1}h", total_available_hours);

            // Distribute proportionally, capped by available capacity
            let hours_to_distribute = remaining_hours_needed.min(total_available_hours);
            let mut project_total_effective = pinned_hours_this_project;

            if total_available_hours > 0.0 {
                for cap in assignment_capacities {
                    // Proportional share based on max contribution
                    let proportion = cap.max_contribution_hours / total_available_hours;
                    let allocated_hours = proportion * hours_to_distribute;
                    
                    // Convert back to allocation percentage
                    let allocation_pct = if cap.available_hours > 0.0 {
                        ((allocated_hours / cap.productivity_factor) / cap.available_hours * 100.0)
                            .min(cap.remaining_capacity_pct) // Cap at remaining capacity
                    } else {
                        0.0
                    };

                    let effective_hours = calculate_assignment_effective_hours(
                        cap.available_hours,
                        allocation_pct,
                        cap.productivity_factor,
                    );

                    project_total_effective += effective_hours;

                    // Update person's remaining capacity
                    let state = person_states.get_mut(&cap.assignment.person_id).unwrap();
                    state.remaining_capacity_percentage -= allocation_pct;
                    state.remaining_capacity_percentage = state.remaining_capacity_percentage.max(0.0);

                    calculations.push(AssignmentCalculation {
                        assignment_id: cap.assignment.id,
                        calculated_allocation_percentage: allocation_pct,
                        calculated_effective_hours: effective_hours,
                    });

                    debug!("    Assignment {}: {:.1}% allocation, {:.1}h effective, {:.1}% remaining capacity",
                           cap.assignment.id, allocation_pct, effective_hours, 
                           state.remaining_capacity_percentage);
                }
            }

            // Check if project is under-staffed
            if project_total_effective < requirement.required_hours {
                let shortfall = requirement.required_hours - project_total_effective;
                let shortfall_pct = (shortfall / requirement.required_hours) * 100.0;

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

                warn!("Project {} is under-staffed by {:.1}h ({:.1}%)", 
                      project_id, shortfall, shortfall_pct);
            }
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
