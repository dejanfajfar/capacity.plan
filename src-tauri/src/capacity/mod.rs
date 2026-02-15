use crate::db::DbPool;
use crate::models::{
    Absence as ModelAbsence, Assignment, Holiday, JobOverheadTask, Person, PersonJobAssignment,
    PlanningPeriod, ProjectRequirement,
};
use chrono::{Datelike, NaiveDate, Weekday};
use log::{debug, info, warn};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Helper functions for working days

/// Parse working_days string (e.g., "Mon,Tue,Wed,Thu,Fri") and return count of working days
fn parse_working_days_count(working_days: &str) -> usize {
    working_days
        .split(',')
        .filter(|s| !s.trim().is_empty())
        .count()
}

/// Parse working_days string and return a set of Weekday values
fn parse_working_days_set(working_days: &str) -> Vec<Weekday> {
    working_days
        .split(',')
        .filter_map(|day| match day.trim() {
            "Mon" => Some(Weekday::Mon),
            "Tue" => Some(Weekday::Tue),
            "Wed" => Some(Weekday::Wed),
            "Thu" => Some(Weekday::Thu),
            "Fri" => Some(Weekday::Fri),
            "Sat" => Some(Weekday::Sat),
            "Sun" => Some(Weekday::Sun),
            _ => None,
        })
        .collect()
}

/// Check if a given date falls on one of the person's working days
fn is_working_day(date: &NaiveDate, working_days_set: &[Weekday]) -> bool {
    let weekday = date.weekday();
    working_days_set.contains(&weekday)
}

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
    pub person_email: String,
    pub total_available_hours: f64,
    pub total_allocated_hours: f64,
    pub total_effective_hours: f64,
    pub utilization_percentage: f64,
    pub is_over_committed: bool,
    pub assignments: Vec<AssignmentSummary>,
    pub absence_days: i64,
    pub absence_hours: f64,
    pub holiday_days: i64,
    pub holiday_hours: f64,
    pub base_available_hours: f64,
    pub overhead_hours: f64,          // Required overhead tasks only
    pub optional_overhead_hours: f64, // Optional overhead tasks (weighted at 50%)
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
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PersonAssignmentSummary {
    pub assignment_id: i64,
    pub person_name: String,
    pub allocation_percentage: f64,
    pub productivity_factor: f64,
    pub effective_hours: f64,
    pub absence_days: i64,
    pub absence_hours: f64,
    pub holiday_days: i64,
    pub holiday_hours: f64,
    pub overhead_hours: f64,          // Required overhead tasks only
    pub optional_overhead_hours: f64, // Optional overhead tasks (weighted at 50%)
}

#[derive(Debug)]
pub struct PersonAvailableHoursBreakdown {
    pub available_hours: f64,
    pub base_hours: f64,
    pub absence_days: i64,
    pub absence_hours: f64,
    pub holiday_days: i64,
    pub holiday_hours: f64,
    pub overhead_hours: f64,          // Required overhead tasks only
    pub optional_overhead_hours: f64, // Optional overhead tasks (weighted at 50%)
}

// Core calculation functions

/// Calculate available hours for a person in a planning period, accounting for absences
pub async fn calculate_person_available_hours(
    person: &Person,
    planning_period: &PlanningPeriod,
    pool: &DbPool,
) -> Result<PersonAvailableHoursBreakdown, String> {
    // Parse dates
    let start = NaiveDate::parse_from_str(&planning_period.start_date, "%Y-%m-%d")
        .map_err(|e| format!("Invalid start date: {}", e))?;
    let end = NaiveDate::parse_from_str(&planning_period.end_date, "%Y-%m-%d")
        .map_err(|e| format!("Invalid end date: {}", e))?;

    // Calculate total days in period
    let total_days = (end - start).num_days() + 1;

    // Parse person's working days configuration
    let working_days_count = parse_working_days_count(&person.working_days) as f64;
    let working_days_set = parse_working_days_set(&person.working_days);

    // Calculate working days based on person's schedule
    let total_weeks = total_days as f64 / 7.0;
    let working_days = total_weeks * working_days_count;

    // Calculate hours per day based on person's working days
    let hours_per_day = if working_days_count > 0.0 {
        person.available_hours_per_week / working_days_count
    } else {
        0.0
    };

    // Calculate base hours (before absences)
    let base_hours = working_days * hours_per_day;

    // Get absences for this person within the planning period
    let absences = sqlx::query_as::<_, ModelAbsence>(
        "SELECT * FROM absences 
             WHERE person_id = ? 
             AND (
                (start_date >= ? AND start_date <= ?) OR
                (end_date >= ? AND end_date <= ?) OR
                (start_date <= ? AND end_date >= ?)
             )",
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
    let absence_hours = total_absence_days as f64 * hours_per_day;

    // Get holidays for this person's country within the planning period
    let (total_holiday_days, holiday_hours) = if let Some(country_id) = person.country_id {
        let holidays = sqlx::query_as::<_, Holiday>(
            "SELECT * FROM holidays 
             WHERE country_id = ? 
             AND start_date <= ? 
             AND end_date >= ?",
        )
        .bind(country_id)
        .bind(&planning_period.end_date)
        .bind(&planning_period.start_date)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch holidays: {}", e))?;

        // Calculate total holiday days, accounting for partial overlaps
        let mut total_holiday_days = 0i64;
        for holiday in holidays {
            let holiday_start = NaiveDate::parse_from_str(&holiday.start_date, "%Y-%m-%d")
                .map_err(|e| format!("Invalid holiday start date: {}", e))?;
            let holiday_end = NaiveDate::parse_from_str(&holiday.end_date, "%Y-%m-%d")
                .map_err(|e| format!("Invalid holiday end date: {}", e))?;

            // Calculate the overlap between holiday and planning period
            let overlap_start = holiday_start.max(start);
            let overlap_end = holiday_end.min(end);

            if overlap_start <= overlap_end {
                // Count only holiday days that fall on person's working days
                let mut working_holiday_days = 0i64;
                let mut current_date = overlap_start;

                while current_date <= overlap_end {
                    // Check if this date is a working day for this person
                    if is_working_day(&current_date, &working_days_set) {
                        // Check if this date overlaps with any absence
                        let mut is_absent = false;
                        for absence in &absences {
                            let absence_start =
                                NaiveDate::parse_from_str(&absence.start_date, "%Y-%m-%d")
                                    .map_err(|e| format!("Invalid absence start date: {}", e))?;
                            let absence_end =
                                NaiveDate::parse_from_str(&absence.end_date, "%Y-%m-%d")
                                    .map_err(|e| format!("Invalid absence end date: {}", e))?;

                            if current_date >= absence_start && current_date <= absence_end {
                                is_absent = true;
                                break;
                            }
                        }

                        // Only count if not already covered by absence
                        if !is_absent {
                            working_holiday_days += 1;
                        }
                    }
                    current_date = current_date.succ_opt().unwrap();
                }

                total_holiday_days += working_holiday_days;
            }
        }

        let holiday_hours = total_holiday_days as f64 * hours_per_day;
        (total_holiday_days, holiday_hours)
    } else {
        // Person has no country assigned, so no holidays
        (0, 0.0)
    };

    // Get job assignments for this person within the planning period
    let job_assignments = sqlx::query_as::<_, PersonJobAssignment>(
        "SELECT * FROM person_job_assignments 
         WHERE person_id = ? AND planning_period_id = ?",
    )
    .bind(person.id)
    .bind(planning_period.id)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch job assignments: {}", e))?;

    // Calculate overhead hours from all assigned jobs' overhead tasks
    // Split into required (is_optional = false) and optional (is_optional = true)
    // For optional tasks, we apply the per-task weight and track both raw and weighted hours
    let mut overhead_hours = 0.0;
    let mut optional_overhead_hours = 0.0; // Raw optional hours (unweighted, for display)
    let mut weighted_optional_overhead = 0.0; // Weighted optional hours (for calculation)
    for job_assignment in job_assignments {
        // Get all overhead tasks for this job
        let overhead_tasks = sqlx::query_as::<_, JobOverheadTask>(
            "SELECT * FROM job_overhead_tasks WHERE job_id = ?",
        )
        .bind(job_assignment.job_id)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch job overhead tasks: {}", e))?;

        for task in overhead_tasks {
            let task_hours = if task.effort_period == "weekly" {
                task.effort_hours * total_weeks
            } else if task.effort_period == "daily" {
                task.effort_hours * working_days
            } else {
                0.0
            };

            if task.is_optional {
                optional_overhead_hours += task_hours;
                // Apply per-task weight (each task can have its own probability)
                weighted_optional_overhead += task_hours * task.optional_weight;
            } else {
                overhead_hours += task_hours;
            }
        }
    }

    // Calculate available working days and hours after absences, holidays, and overhead
    // Note: We use pre-calculated weighted_optional_overhead instead of applying a global weight
    let available_hours =
        (base_hours - absence_hours - holiday_hours - overhead_hours - weighted_optional_overhead)
            .max(0.0);

    debug!(
        "Person {} available hours: {} (base: {}, working days: {}, absence days: {}, absence hours: {}, holiday days: {}, holiday hours: {}, overhead hours: {}, optional overhead hours: {} (weighted: {}), hours/day: {})",
        person.name, available_hours, base_hours, working_days, total_absence_days, absence_hours, total_holiday_days, holiday_hours, overhead_hours, optional_overhead_hours, weighted_optional_overhead, hours_per_day
    );

    Ok(PersonAvailableHoursBreakdown {
        available_hours,
        base_hours,
        absence_days: total_absence_days,
        absence_hours,
        holiday_days: total_holiday_days,
        holiday_hours,
        overhead_hours,
        optional_overhead_hours,
    })
}

/// Calculate effective hours for an assignment
pub fn calculate_assignment_effective_hours(
    available_hours: f64,
    allocation_percentage: f64,
    productivity_factor: f64,
) -> f64 {
    available_hours * (allocation_percentage / 100.0) * productivity_factor
}

/// Default weighting factor for optional overhead tasks (50% = 0.5)
pub const DEFAULT_OPTIONAL_WEIGHT: f64 = 0.5;

/// Calculate available hours from base hours and deductions
/// This is the core capacity formula extracted for testability
///
/// Arguments:
/// - base_hours: Total potential working hours in the period
/// - absence_hours: Hours lost to absences (vacation, sick leave, etc.)
/// - holiday_hours: Hours lost to public holidays
/// - required_overhead_hours: Hours for required overhead tasks (always deducted 100%)
/// - optional_overhead_hours: Hours for optional overhead tasks (weighted by optional_weight)
/// - optional_weight: Weight factor for optional hours (0.0 to 1.0, default 0.5)
///
/// Returns: Available hours after all deductions (minimum 0.0)
pub fn calculate_available_hours(
    base_hours: f64,
    absence_hours: f64,
    holiday_hours: f64,
    required_overhead_hours: f64,
    optional_overhead_hours: f64,
    optional_weight: f64,
) -> f64 {
    let weighted_optional = optional_overhead_hours * optional_weight;
    (base_hours - absence_hours - holiday_hours - required_overhead_hours - weighted_optional)
        .max(0.0)
}

/// Proportional optimization algorithm
pub async fn optimize_assignments_proportional(
    planning_period_id: i64,
    pool: &DbPool,
) -> Result<OptimizationResult, String> {
    info!(
        "Starting optimization for planning period {}",
        planning_period_id
    );

    // Load planning period
    let planning_period =
        sqlx::query_as::<_, PlanningPeriod>("SELECT * FROM planning_periods WHERE id = ?")
            .bind(planning_period_id)
            .fetch_one(pool)
            .await
            .map_err(|e| format!("Failed to fetch planning period: {}", e))?;

    // Load all assignments for this planning period
    let assignments =
        sqlx::query_as::<_, Assignment>("SELECT * FROM assignments WHERE planning_period_id = ?")
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
        let breakdown = calculate_person_available_hours(person, &planning_period, pool).await?;
        person_available_hours.insert(*person_id, breakdown.available_hours);
    }

    // Load project requirements
    let requirements = sqlx::query_as::<_, ProjectRequirement>(
        "SELECT * FROM project_requirements WHERE planning_period_id = ?",
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
            .or_default()
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
        available_hours: f64,
        remaining_percentage: f64, // Starts at 100.0, decreases as we allocate
    }

    let mut person_states: HashMap<i64, PersonState> = HashMap::new();

    // Initialize person states
    for (person_id, available_hours) in &person_available_hours {
        person_states.insert(
            *person_id,
            PersonState {
                available_hours: *available_hours,
                remaining_percentage: 100.0,
            },
        );
    }

    debug!("Pass 1 complete: Initialized person capacity states");

    // ========================================================================
    // PASS 2: Allocate projects by priority (high to low)
    // ========================================================================

    // Group assignments by project and priority
    let mut projects_by_priority: Vec<(i64, i64)> = Vec::new(); // (priority, project_id)

    for project_id in assignments_by_project.keys() {
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
        debug!(
            "Processing priority group with {} projects",
            priority_group.len()
        );

        // For each project in this priority group, calculate needs
        for project_id in priority_group {
            let project_assignments = assignments_by_project.get(&project_id).unwrap();
            let requirement = requirements_map.get(&project_id).unwrap();

            debug!(
                "Processing project {} (required: {}h)",
                project_id, requirement.required_hours
            );

            // Calculate available capacity from all assignments for this project
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

            for assignment in project_assignments {
                let state = person_states.get(&assignment.person_id).unwrap();
                let available = state.available_hours;
                let remaining_pct = state.remaining_percentage;

                // Max this person can contribute to THIS project
                let max_hours =
                    available * (remaining_pct / 100.0) * assignment.productivity_factor;

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
            let hours_to_distribute = requirement.required_hours.min(total_available_hours);
            let mut project_total_effective = 0.0;

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
                    state.remaining_percentage -= allocation_pct;
                    state.remaining_percentage = state.remaining_percentage.max(0.0);

                    calculations.push(AssignmentCalculation {
                        assignment_id: cap.assignment.id,
                        calculated_allocation_percentage: allocation_pct,
                        calculated_effective_hours: effective_hours,
                    });

                    debug!("    Assignment {}: {:.1}% allocation, {:.1}h effective, {:.1}% remaining capacity",
                           cap.assignment.id, allocation_pct, effective_hours,
                           state.remaining_percentage);
                }
            }

            // Check if project is under-staffed
            if project_total_effective < requirement.required_hours {
                let shortfall = requirement.required_hours - project_total_effective;
                let shortfall_pct = (shortfall / requirement.required_hours) * 100.0;

                let project_name =
                    sqlx::query_scalar::<_, String>("SELECT name FROM projects WHERE id = ?")
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

                warn!(
                    "Project {} is under-staffed by {:.1}h ({:.1}%)",
                    project_id, shortfall, shortfall_pct
                );
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
             WHERE id = ?",
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

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDate;

    // Tests for parse_working_days_count
    #[test]
    fn test_parse_working_days_count_standard_weekdays() {
        assert_eq!(parse_working_days_count("Mon,Tue,Wed,Thu,Fri"), 5);
    }

    #[test]
    fn test_parse_working_days_count_full_week() {
        assert_eq!(parse_working_days_count("Mon,Tue,Wed,Thu,Fri,Sat,Sun"), 7);
    }

    #[test]
    fn test_parse_working_days_count_partial_week() {
        assert_eq!(parse_working_days_count("Mon,Wed,Fri"), 3);
    }

    #[test]
    fn test_parse_working_days_count_single_day() {
        assert_eq!(parse_working_days_count("Mon"), 1);
    }

    #[test]
    fn test_parse_working_days_count_empty_string() {
        assert_eq!(parse_working_days_count(""), 0);
    }

    #[test]
    fn test_parse_working_days_count_with_whitespace() {
        assert_eq!(parse_working_days_count("Mon, Tue, Wed"), 3);
    }

    // Tests for parse_working_days_set
    #[test]
    fn test_parse_working_days_set_standard_weekdays() {
        let days = parse_working_days_set("Mon,Tue,Wed,Thu,Fri");
        assert_eq!(days.len(), 5);
        assert!(days.contains(&Weekday::Mon));
        assert!(days.contains(&Weekday::Tue));
        assert!(days.contains(&Weekday::Wed));
        assert!(days.contains(&Weekday::Thu));
        assert!(days.contains(&Weekday::Fri));
        assert!(!days.contains(&Weekday::Sat));
        assert!(!days.contains(&Weekday::Sun));
    }

    #[test]
    fn test_parse_working_days_set_weekend_only() {
        let days = parse_working_days_set("Sat,Sun");
        assert_eq!(days.len(), 2);
        assert!(days.contains(&Weekday::Sat));
        assert!(days.contains(&Weekday::Sun));
    }

    #[test]
    fn test_parse_working_days_set_with_invalid_day() {
        // Invalid days should be skipped
        let days = parse_working_days_set("Mon,InvalidDay,Wed");
        assert_eq!(days.len(), 2);
        assert!(days.contains(&Weekday::Mon));
        assert!(days.contains(&Weekday::Wed));
    }

    #[test]
    fn test_parse_working_days_set_empty_string() {
        let days = parse_working_days_set("");
        assert!(days.is_empty());
    }

    // Tests for is_working_day
    #[test]
    fn test_is_working_day_monday_on_weekday_schedule() {
        let date = NaiveDate::from_ymd_opt(2024, 1, 8).unwrap(); // Monday
        let working_days = vec![
            Weekday::Mon,
            Weekday::Tue,
            Weekday::Wed,
            Weekday::Thu,
            Weekday::Fri,
        ];
        assert!(is_working_day(&date, &working_days));
    }

    #[test]
    fn test_is_working_day_saturday_on_weekday_schedule() {
        let date = NaiveDate::from_ymd_opt(2024, 1, 6).unwrap(); // Saturday
        let working_days = vec![
            Weekday::Mon,
            Weekday::Tue,
            Weekday::Wed,
            Weekday::Thu,
            Weekday::Fri,
        ];
        assert!(!is_working_day(&date, &working_days));
    }

    #[test]
    fn test_is_working_day_saturday_on_weekend_schedule() {
        let date = NaiveDate::from_ymd_opt(2024, 1, 6).unwrap(); // Saturday
        let working_days = vec![Weekday::Sat, Weekday::Sun];
        assert!(is_working_day(&date, &working_days));
    }

    #[test]
    fn test_is_working_day_empty_schedule() {
        let date = NaiveDate::from_ymd_opt(2024, 1, 8).unwrap(); // Monday
        let working_days: Vec<Weekday> = vec![];
        assert!(!is_working_day(&date, &working_days));
    }

    // Tests for calculate_assignment_effective_hours
    #[test]
    fn test_effective_hours_full_allocation_expert() {
        // 40h available, 100% allocation, 0.8 productivity (expert)
        let effective = calculate_assignment_effective_hours(40.0, 100.0, 0.8);
        assert!((effective - 32.0).abs() < 0.001);
    }

    #[test]
    fn test_effective_hours_half_allocation_proficient() {
        // 40h available, 50% allocation, 0.5 productivity (proficient)
        let effective = calculate_assignment_effective_hours(40.0, 50.0, 0.5);
        assert!((effective - 10.0).abs() < 0.001);
    }

    #[test]
    fn test_effective_hours_zero_allocation() {
        let effective = calculate_assignment_effective_hours(40.0, 0.0, 0.8);
        assert!((effective - 0.0).abs() < 0.001);
    }

    #[test]
    fn test_effective_hours_zero_productivity() {
        let effective = calculate_assignment_effective_hours(40.0, 100.0, 0.0);
        assert!((effective - 0.0).abs() < 0.001);
    }

    #[test]
    fn test_effective_hours_zero_available() {
        let effective = calculate_assignment_effective_hours(0.0, 100.0, 0.8);
        assert!((effective - 0.0).abs() < 0.001);
    }

    #[test]
    fn test_effective_hours_real_scenario() {
        // Realistic scenario: 35h/week available, 25% allocation, 0.65 productivity (advanced)
        // Expected: 35 * 0.25 * 0.65 = 5.6875
        let effective = calculate_assignment_effective_hours(35.0, 25.0, 0.65);
        assert!((effective - 5.6875).abs() < 0.001);
    }

    #[test]
    fn test_effective_hours_master_level() {
        // Master level: 40h available, 100% allocation, 0.9 productivity
        let effective = calculate_assignment_effective_hours(40.0, 100.0, 0.9);
        assert!((effective - 36.0).abs() < 0.001);
    }

    #[test]
    fn test_effective_hours_trainee_level() {
        // Trainee level: 40h available, 100% allocation, 0.1 productivity
        let effective = calculate_assignment_effective_hours(40.0, 100.0, 0.1);
        assert!((effective - 4.0).abs() < 0.001);
    }

    // Tests for calculate_available_hours and optional overhead weighting
    #[test]
    fn test_available_hours_no_deductions() {
        // Base case: no absences, holidays, or overhead
        let available = calculate_available_hours(160.0, 0.0, 0.0, 0.0, 0.0, 0.5);
        assert!((available - 160.0).abs() < 0.001);
    }

    #[test]
    fn test_available_hours_with_absences_only() {
        // 160h base, 16h absence (2 days at 8h/day)
        let available = calculate_available_hours(160.0, 16.0, 0.0, 0.0, 0.0, 0.5);
        assert!((available - 144.0).abs() < 0.001);
    }

    #[test]
    fn test_available_hours_with_holidays_only() {
        // 160h base, 8h holiday (1 day)
        let available = calculate_available_hours(160.0, 0.0, 8.0, 0.0, 0.0, 0.5);
        assert!((available - 152.0).abs() < 0.001);
    }

    #[test]
    fn test_available_hours_with_required_overhead_only() {
        // 160h base, 10h required overhead
        let available = calculate_available_hours(160.0, 0.0, 0.0, 10.0, 0.0, 0.5);
        assert!((available - 150.0).abs() < 0.001);
    }

    #[test]
    fn test_available_hours_with_optional_overhead_50_percent_weight() {
        // 160h base, 20h optional overhead at 50% weight = 10h deduction
        let available = calculate_available_hours(160.0, 0.0, 0.0, 0.0, 20.0, 0.5);
        assert!((available - 150.0).abs() < 0.001);
    }

    #[test]
    fn test_available_hours_with_optional_overhead_zero_weight() {
        // 160h base, 20h optional overhead at 0% weight = 0h deduction
        let available = calculate_available_hours(160.0, 0.0, 0.0, 0.0, 20.0, 0.0);
        assert!((available - 160.0).abs() < 0.001);
    }

    #[test]
    fn test_available_hours_with_optional_overhead_full_weight() {
        // 160h base, 20h optional overhead at 100% weight = 20h deduction
        let available = calculate_available_hours(160.0, 0.0, 0.0, 0.0, 20.0, 1.0);
        assert!((available - 140.0).abs() < 0.001);
    }

    #[test]
    fn test_available_hours_combined_all_deductions() {
        // Realistic scenario:
        // - 160h base (4 weeks at 40h/week)
        // - 16h absence (2 vacation days)
        // - 8h holidays (1 public holiday)
        // - 8h required overhead (team meetings)
        // - 4h optional overhead at 50% = 2h deduction (optional training)
        // Expected: 160 - 16 - 8 - 8 - 2 = 126h
        let available = calculate_available_hours(160.0, 16.0, 8.0, 8.0, 4.0, 0.5);
        assert!((available - 126.0).abs() < 0.001);
    }

    #[test]
    fn test_available_hours_mixed_overhead_types() {
        // Test with both required and optional overhead
        // 160h base, 20h required, 10h optional at 50% = 5h
        // Expected: 160 - 20 - 5 = 135h
        let available = calculate_available_hours(160.0, 0.0, 0.0, 20.0, 10.0, 0.5);
        assert!((available - 135.0).abs() < 0.001);
    }

    #[test]
    fn test_available_hours_floor_at_zero() {
        // Deductions exceed base hours - should floor at 0
        let available = calculate_available_hours(100.0, 50.0, 30.0, 30.0, 0.0, 0.5);
        assert!((available - 0.0).abs() < 0.001);
    }

    #[test]
    fn test_available_hours_optional_weight_boundary_values() {
        // Test weight at edge values
        let base = 100.0;
        let optional = 40.0;

        // Weight 0.0: no deduction from optional
        assert!(
            (calculate_available_hours(base, 0.0, 0.0, 0.0, optional, 0.0) - 100.0).abs() < 0.001
        );

        // Weight 0.25: 10h deduction
        assert!(
            (calculate_available_hours(base, 0.0, 0.0, 0.0, optional, 0.25) - 90.0).abs() < 0.001
        );

        // Weight 0.5 (default): 20h deduction
        assert!(
            (calculate_available_hours(base, 0.0, 0.0, 0.0, optional, 0.5) - 80.0).abs() < 0.001
        );

        // Weight 0.75: 30h deduction
        assert!(
            (calculate_available_hours(base, 0.0, 0.0, 0.0, optional, 0.75) - 70.0).abs() < 0.001
        );

        // Weight 1.0: full 40h deduction
        assert!(
            (calculate_available_hours(base, 0.0, 0.0, 0.0, optional, 1.0) - 60.0).abs() < 0.001
        );
    }

    #[test]
    fn test_default_optional_weight_constant() {
        // Verify the default constant is 0.5 (50%)
        assert!((DEFAULT_OPTIONAL_WEIGHT - 0.5).abs() < 0.001);
    }
}
