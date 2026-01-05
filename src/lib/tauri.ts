import { invoke } from "@tauri-apps/api/core";
import type {
  Person,
  CreatePersonInput,
  PlanningPeriod,
  CreatePlanningPeriodInput,
  Project,
  CreateProjectInput,
  Assignment,
  CreateAssignmentInput,
  Absence,
  CreateAbsenceInput,
  Overhead,
  CreateOverheadInput,
  OverheadAssignment,
  OverheadAssignmentWithDetails,
  CreateOverheadAssignmentInput,
  ProjectRequirement,
  CreateProjectRequirementInput,
  Country,
  CreateCountryInput,
  CountryDependencies,
  Holiday,
  HolidayWithCountry,
  CreateHolidayInput,
  OptimizationResult,
  CapacityOverview,
  PersonCapacity,
  ProjectStaffing,
  PersonDependencies,
  ProjectDependencies,
  PlanningPeriodDependencies,
} from "../types";

// ============================================================================
// People Commands
// ============================================================================

export async function listPeople(): Promise<Person[]> {
  return await invoke("list_people");
}

export async function createPerson(input: CreatePersonInput): Promise<Person> {
  return await invoke("create_person", { input });
}

export async function updatePerson(
  id: number,
  input: CreatePersonInput,
): Promise<Person> {
  return await invoke("update_person", { id, input });
}

export async function deletePerson(id: number): Promise<void> {
  return await invoke("delete_person", { id });
}

export async function checkPersonDependencies(
  id: number,
): Promise<PersonDependencies> {
  return await invoke("check_person_dependencies", { id });
}

// ============================================================================
// Planning Period Commands
// ============================================================================

export async function listPlanningPeriods(): Promise<PlanningPeriod[]> {
  return await invoke("list_planning_periods");
}

export async function createPlanningPeriod(
  input: CreatePlanningPeriodInput,
): Promise<PlanningPeriod> {
  return await invoke("create_planning_period", { input });
}

export async function updatePlanningPeriod(
  id: number,
  input: CreatePlanningPeriodInput,
): Promise<PlanningPeriod> {
  return await invoke("update_planning_period", { id, input });
}

export async function deletePlanningPeriod(id: number): Promise<void> {
  return await invoke("delete_planning_period", { id });
}

export async function checkPlanningPeriodDependencies(
  id: number,
): Promise<PlanningPeriodDependencies> {
  return await invoke("check_planning_period_dependencies", { id });
}

export async function setActivePlanningPeriod(id: number): Promise<void> {
  // This will be implemented when we add active period functionality
  return await invoke("set_active_planning_period", { id });
}

// ============================================================================
// Project Commands
// ============================================================================

export async function listProjects(): Promise<Project[]> {
  return await invoke("list_projects");
}

export async function createProject(
  input: CreateProjectInput,
): Promise<Project> {
  return await invoke("create_project", { input });
}

export async function updateProject(
  id: number,
  input: CreateProjectInput,
): Promise<Project> {
  return await invoke("update_project", { id, input });
}

export async function deleteProject(id: number): Promise<void> {
  return await invoke("delete_project", { id });
}

export async function checkProjectDependencies(
  id: number,
): Promise<ProjectDependencies> {
  return await invoke("check_project_dependencies", { id });
}

// ============================================================================
// Project Requirement Commands
// ============================================================================

export async function listProjectRequirements(
  planningPeriodId: number,
): Promise<ProjectRequirement[]> {
  return await invoke("list_project_requirements", { planningPeriodId });
}

export async function getProjectRequirement(
  projectId: number,
  planningPeriodId: number,
): Promise<ProjectRequirement | null> {
  return await invoke("get_project_requirement", {
    projectId,
    planningPeriodId,
  });
}

export async function upsertProjectRequirement(
  input: CreateProjectRequirementInput,
): Promise<ProjectRequirement> {
  return await invoke("upsert_project_requirement", { input });
}

export async function batchUpsertProjectRequirements(
  planningPeriodId: number,
  requirements: CreateProjectRequirementInput[],
): Promise<void> {
  return await invoke("batch_upsert_project_requirements", {
    planningPeriodId,
    requirements,
  });
}

export async function deleteProjectRequirement(id: number): Promise<void> {
  return await invoke("delete_project_requirement", { id });
}

// ============================================================================
// Assignment Commands
// ============================================================================

export async function listAssignments(
  planningPeriodId?: number,
): Promise<Assignment[]> {
  return await invoke("list_assignments", { planningPeriodId });
}

export async function createAssignment(
  input: CreateAssignmentInput,
): Promise<Assignment> {
  return await invoke("create_assignment", { input });
}

export async function updateAssignment(
  id: number,
  input: CreateAssignmentInput,
): Promise<Assignment> {
  return await invoke("update_assignment", { id, input });
}

export async function deleteAssignment(id: number): Promise<void> {
  return await invoke("delete_assignment", { id });
}

export async function pinAssignment(
  id: number,
  allocationPercent: number,
): Promise<void> {
  // This will be implemented when we add pin/unpin functionality
  return await invoke("pin_assignment", { id, allocationPercent });
}

export async function unpinAssignment(id: number): Promise<void> {
  // This will be implemented when we add pin/unpin functionality
  return await invoke("unpin_assignment", { id });
}

// ============================================================================
// Absence Commands
// ============================================================================

export async function listAbsences(personId: number): Promise<Absence[]> {
  return await invoke("list_absences", { personId });
}

export async function createAbsence(
  input: CreateAbsenceInput,
): Promise<Absence> {
  return await invoke("create_absence", { input });
}

export async function updateAbsence(
  id: number,
  input: CreateAbsenceInput,
): Promise<Absence> {
  return await invoke("update_absence", { id, input });
}

export async function deleteAbsence(id: number): Promise<void> {
  return await invoke("delete_absence", { id });
}

// ============================================================================
// Overhead Commands
// ============================================================================

export async function listOverheads(
  planningPeriodId: number,
): Promise<Overhead[]> {
  return await invoke("list_overheads", { planningPeriodId });
}

export async function createOverhead(
  input: CreateOverheadInput,
): Promise<Overhead> {
  return await invoke("create_overhead", { input });
}

export async function updateOverhead(
  id: number,
  input: CreateOverheadInput,
): Promise<Overhead> {
  return await invoke("update_overhead", { id, input });
}

export async function deleteOverhead(id: number): Promise<void> {
  return await invoke("delete_overhead", { id });
}

// ============================================================================
// Overhead Assignment Commands
// ============================================================================

export async function listOverheadAssignments(
  overheadId: number,
): Promise<OverheadAssignment[]> {
  return await invoke("list_overhead_assignments", { overheadId });
}

export async function listPersonOverheadAssignments(
  personId: number,
  planningPeriodId: number,
): Promise<OverheadAssignmentWithDetails[]> {
  return await invoke("list_person_overhead_assignments", {
    personId,
    planningPeriodId,
  });
}

export async function createOverheadAssignment(
  input: CreateOverheadAssignmentInput,
): Promise<OverheadAssignment> {
  return await invoke("create_overhead_assignment", { input });
}

export async function updateOverheadAssignment(
  id: number,
  input: CreateOverheadAssignmentInput,
): Promise<OverheadAssignment> {
  return await invoke("update_overhead_assignment", { id, input });
}

export async function deleteOverheadAssignment(id: number): Promise<void> {
  return await invoke("delete_overhead_assignment", { id });
}

// ============================================================================
// Optimization Commands
// ============================================================================

export async function optimizeAssignments(
  planningPeriodId: number,
): Promise<OptimizationResult> {
  return await invoke("optimize_assignments", { planningPeriodId });
}

// ============================================================================
// Capacity Analysis Commands
// ============================================================================

export async function getCapacityOverview(
  planningPeriodId: number,
): Promise<CapacityOverview> {
  return await invoke("get_capacity_overview", { planningPeriodId });
}

export async function getPersonCapacity(
  personId: number,
  planningPeriodId: number,
): Promise<PersonCapacity> {
  return await invoke("get_person_capacity", { personId, planningPeriodId });
}

export async function getProjectStaffing(
  projectId: number,
  planningPeriodId: number,
): Promise<ProjectStaffing> {
  return await invoke("get_project_staffing", { projectId, planningPeriodId });
}

// ============================================================================
// Country Commands
// ============================================================================

export async function listCountries(): Promise<Country[]> {
  return await invoke("list_countries");
}

export async function createCountry(
  input: CreateCountryInput,
): Promise<Country> {
  return await invoke("create_country", { input });
}

export async function updateCountry(
  id: number,
  input: CreateCountryInput,
): Promise<Country> {
  return await invoke("update_country", { id, input });
}

export async function deleteCountry(id: number): Promise<void> {
  return await invoke("delete_country", { id });
}

export async function checkCountryDependencies(
  id: number,
): Promise<CountryDependencies> {
  return await invoke("check_country_dependencies", { id });
}

// ============================================================================
// Holiday Commands
// ============================================================================

export async function listHolidays(
  countryId?: number,
): Promise<HolidayWithCountry[]> {
  return await invoke("list_holidays", { countryId });
}

export async function listHolidaysForPerson(
  personId: number,
  startDate: string,
  endDate: string,
): Promise<Holiday[]> {
  return await invoke("list_holidays_for_person", {
    personId,
    startDate,
    endDate,
  });
}

export async function createHoliday(
  input: CreateHolidayInput,
): Promise<Holiday> {
  return await invoke("create_holiday", { input });
}

export async function updateHoliday(
  id: number,
  input: CreateHolidayInput,
): Promise<Holiday> {
  return await invoke("update_holiday", { id, input });
}

export async function deleteHoliday(id: number): Promise<void> {
  return await invoke("delete_holiday", { id });
}

export async function batchCreateHolidays(
  holidays: CreateHolidayInput[],
): Promise<void> {
  return await invoke("batch_create_holidays", { holidays });
}

// ============================================================================
// App Commands
// ============================================================================

export async function getAppVersion(): Promise<string> {
  const { getVersion } = await import("@tauri-apps/api/app");
  return await getVersion();
}
