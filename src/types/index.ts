// Core entity types matching the backend Rust structs

export interface PlanningPeriod {
  id: number;
  name: string | null;
  start_date: string; // ISO 8601
  end_date: string;
  created_at: string;
}

export interface Person {
  id: number;
  name: string;
  email: string;
  available_hours_per_week: number;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  required_hours: number;
  created_at: string;
}

export interface Assignment {
  id: number;
  person_id: number;
  project_id: number;
  planning_period_id: number;
  productivity_factor: number; // 0.0 to 1.0
  start_date: string;
  end_date: string;
  is_pinned: boolean;
  pinned_allocation_percentage: number | null;
  calculated_allocation_percentage: number | null;
  calculated_effective_hours: number | null;
  last_calculated_at: string | null;
  created_at: string;
}

export interface Absence {
  id: number;
  person_id: number;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  created_at: string;
}

export interface ProjectRequirement {
  id: number;
  project_id: number;
  planning_period_id: number;
  required_hours: number;
  priority: number; // 0=Low, 10=Medium, 20=High, 30=Blocker
  created_at: string;
}

// Calculated/derived types for analytics

export interface PersonCapacity {
  person_id: number;
  person_name: string;
  total_available_hours: number;
  total_allocated_hours: number;
  total_effective_hours: number;
  utilization_percentage: number;
  is_over_committed: boolean;
  assignments: AssignmentSummary[];
}

export interface ProjectStaffing {
  project_id: number;
  project_name: string;
  required_hours: number;
  total_allocated_hours: number;
  total_effective_hours: number;
  staffing_percentage: number;
  is_viable: boolean;
  shortfall: number;
  assigned_people: PersonAssignmentSummary[];
}

export interface AssignmentSummary {
  assignment_id: number;
  project_name: string;
  allocation_percentage: number;
  effective_hours: number;
  is_pinned: boolean;
}

export interface PersonAssignmentSummary {
  assignment_id: number;
  person_name: string;
  allocation_percentage: number;
  productivity_factor: number;
  effective_hours: number;
}

export interface OptimizationResult {
  success: boolean;
  calculations: AssignmentCalculation[];
  infeasible_projects: ProjectShortfall[];
  warnings: string[];
}

export interface AssignmentCalculation {
  assignment_id: number;
  calculated_allocation_percentage: number;
  calculated_effective_hours: number;
}

export interface ProjectShortfall {
  project_id: number;
  project_name: string;
  required_hours: number;
  available_effective_hours: number;
  shortfall: number;
  shortfall_percentage: number;
}

export interface ProjectFeasibility {
  project_id: number;
  required_hours: number;
  available_capacity: number;
  calculated_effective_hours: number;
  is_viable: boolean;
  shortfall: number;
  utilization_percentage: number;
}

export interface CapacityOverview {
  total_people: number;
  total_projects: number;
  over_committed_people: number;
  under_staffed_projects: number;
  people_capacity: PersonCapacity[];
  project_staffing: ProjectStaffing[];
}

// Form input types

export interface CreatePlanningPeriodInput {
  name?: string;
  start_date: string;
  end_date: string;
}

export interface CreatePersonInput {
  name: string;
  email: string;
  available_hours_per_week: number;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  required_hours: number;
}

export interface CreateAssignmentInput {
  person_id: number;
  project_id: number;
  planning_period_id: number;
  productivity_factor: number;
  start_date?: string; // Defaults to period start
  end_date?: string; // Defaults to period end
}

export interface CreateAbsenceInput {
  person_id: number;
  start_date: string;
  end_date: string;
  days: number;
  reason?: string;
}

export interface CreateProjectRequirementInput {
  project_id: number;
  planning_period_id: number;
  required_hours: number;
  priority?: number; // Optional, defaults to 10 (Medium)
}

// Dependency check types

export interface PersonDependencies {
  assignment_count: number;
  absence_count: number;
}

export interface ProjectDependencies {
  requirement_count: number;
  assignment_count: number;
}

export interface PlanningPeriodDependencies {
  requirement_count: number;
  assignment_count: number;
}

// UI-specific types

export interface ProjectWithStaffing extends Project {
  staffing?: ProjectStaffing;
}

export interface PersonWithCapacity extends Person {
  capacity?: PersonCapacity;
}

export interface AssignmentWithDetails extends Assignment {
  person?: Person;
  project?: Project;
}
