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
    pub start_date: String,
    pub end_date: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Assignment {
    pub id: i64,
    pub person_id: i64,
    pub project_id: i64,
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
    pub start_date: String,
    pub end_date: String,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAssignmentInput {
    pub person_id: i64,
    pub project_id: i64,
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
