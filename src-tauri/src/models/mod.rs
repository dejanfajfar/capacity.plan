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
    pub country_id: Option<i64>, // Optional reference to country
    pub working_days: String,    // Comma-separated day codes (e.g., "Mon,Tue,Wed,Thu,Fri")
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
pub struct Overhead {
    pub id: i64,
    pub planning_period_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct OverheadAssignment {
    pub id: i64,
    pub overhead_id: i64,
    pub person_id: i64,
    pub effort_hours: f64,
    pub effort_period: String, // 'daily' or 'weekly'
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ProjectRequirement {
    pub id: i64,
    pub project_id: i64,
    pub planning_period_id: i64,
    pub required_hours: f64,
    pub priority: i64, // 0=Low, 10=Medium, 20=High, 30=Blocker
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
    pub country_id: Option<i64>, // Optional country assignment
    pub working_days: String,    // Comma-separated day codes (e.g., "Mon,Tue,Wed,Thu,Fri")
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
pub struct CreateOverheadInput {
    pub planning_period_id: i64,
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateOverheadAssignmentInput {
    pub overhead_id: i64,
    pub person_id: i64,
    pub effort_hours: f64,
    pub effort_period: String, // 'daily' or 'weekly'
}

#[derive(Debug, Deserialize)]
pub struct CreateProjectRequirementInput {
    pub project_id: i64,
    pub planning_period_id: i64,
    pub required_hours: f64,
    pub priority: Option<i64>, // Optional, defaults to 10 (Medium)
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

// ============================================================================
// Country Models
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Country {
    pub id: i64,
    pub iso_code: String, // 3-letter ISO 3166-1 alpha-3 code (e.g., "USA", "GBR")
    pub name: String,
    pub created_at: String,
}

// Extended person model with country information for UI display
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct PersonWithCountry {
    pub id: i64,
    pub name: String,
    pub email: String,
    pub available_hours_per_week: f64,
    pub country_id: Option<i64>,
    pub country_iso_code: Option<String>,
    pub country_name: Option<String>,
    pub working_days: String, // Comma-separated day codes (e.g., "Mon,Tue,Wed,Thu,Fri")
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateCountryInput {
    pub iso_code: String,
    pub name: String,
}

// ============================================================================
// Holiday Models
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Holiday {
    pub id: i64,
    pub country_id: i64,
    pub name: Option<String>, // Optional holiday name
    pub start_date: String,   // ISO 8601 date format
    pub end_date: String,     // ISO 8601 date format
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateHolidayInput {
    pub country_id: i64,
    pub name: Option<String>,
    pub start_date: String,
    pub end_date: String,
}

// Extended model with country information for UI display
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct HolidayWithCountry {
    pub id: i64,
    pub country_id: i64,
    pub country_iso_code: String,
    pub country_name: String,
    pub name: Option<String>,
    pub start_date: String,
    pub end_date: String,
    pub created_at: String,
}

// ============================================================================
// Country Dependency Information
// ============================================================================

#[derive(Debug, Serialize)]
pub struct CountryDependencies {
    pub holiday_count: i64,
    pub people_count: i64,
}

// ============================================================================
// Extended Models for Commands
// ============================================================================

// Extended overhead assignment model with overhead details for UI display
#[derive(Debug, Serialize, sqlx::FromRow)]
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

// ============================================================================
// Holiday Import Models
// ============================================================================

#[derive(Debug, Serialize)]
pub struct HolidayPreviewItem {
    pub date: String,
    pub name: String,
    pub local_name: String,
    pub is_duplicate: bool,
}

#[derive(Debug, Serialize)]
pub struct HolidayImportPreview {
    pub country_code: String,
    pub country_name: String,
    pub year: i32,
    pub holidays: Vec<HolidayPreviewItem>,
    pub total_count: usize,
    pub duplicate_count: usize,
    pub new_count: usize,
}

#[derive(Debug, Serialize)]
pub struct ImportHolidaysResult {
    pub country_code: String,
    pub year: i32,
    pub imported_count: usize,
    pub skipped_count: usize,
}
