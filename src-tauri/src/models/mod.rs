use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PlanningPeriod {
    pub id: i64,
    pub name: Option<String>,
    pub start_date: String,
    pub end_date: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Person {
    pub id: i64,
    pub name: String,
    pub email: String,
    pub available_hours_per_week: f64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Project {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub required_hours: f64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Assignment {
    pub id: i64,
    pub person_id: i64,
    pub project_id: i64,
    pub planning_period_id: i64,
    pub productivity_factor: f64,
    pub start_date: String,
    pub end_date: String,
    pub is_pinned: bool,
    pub pinned_allocation_percentage: Option<f64>,
    pub calculated_allocation_percentage: Option<f64>,
    pub calculated_effective_hours: Option<f64>,
    pub last_calculated_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Absence {
    pub id: i64,
    pub person_id: i64,
    pub start_date: String,
    pub end_date: String,
    pub days: i64,
    pub reason: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ProjectRequirement {
    pub id: i64,
    pub project_id: i64,
    pub planning_period_id: i64,
    pub required_hours: f64,
    pub created_at: String,
}

// Input DTOs for creation

#[derive(Debug, Deserialize)]
pub struct CreatePlanningPeriodInput {
    pub name: Option<String>,
    pub start_date: String,
    pub end_date: String,
}

#[derive(Debug, Deserialize)]
pub struct CreatePersonInput {
    pub name: String,
    pub email: String,
    pub available_hours_per_week: f64,
}

#[derive(Debug, Deserialize)]
pub struct CreateProjectInput {
    pub name: String,
    pub description: Option<String>,
    pub required_hours: f64,
}

#[derive(Debug, Deserialize)]
pub struct CreateAssignmentInput {
    pub person_id: i64,
    pub project_id: i64,
    pub planning_period_id: i64,
    pub productivity_factor: f64,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAbsenceInput {
    pub person_id: i64,
    pub start_date: String,
    pub end_date: String,
    pub days: i64,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateProjectRequirementInput {
    pub project_id: i64,
    pub planning_period_id: i64,
    pub required_hours: f64,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)] // Future feature: update individual requirements
pub struct UpdateProjectRequirementInput {
    pub required_hours: f64,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)] // Used in batch operations, not directly exposed
pub struct BatchUpsertProjectRequirementsInput {
    pub planning_period_id: i64,
    pub requirements: Vec<CreateProjectRequirementInput>,
}

// Dependency information for delete operations

#[derive(Debug, Serialize)]
pub struct PersonDependencies {
    pub assignment_count: i64,
    pub absence_count: i64,
}

#[derive(Debug, Serialize)]
pub struct ProjectDependencies {
    pub requirement_count: i64,
    pub assignment_count: i64,
}

#[derive(Debug, Serialize)]
pub struct PlanningPeriodDependencies {
    pub requirement_count: i64,
    pub assignment_count: i64,
}
