import { invoke } from '@tauri-apps/api/core';
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
} from '../types';

// ============================================================================
// People Commands
// ============================================================================

export async function listPeople(): Promise<Person[]> {
  return await invoke('list_people');
}

export async function createPerson(input: CreatePersonInput): Promise<Person> {
  return await invoke('create_person', { input });
}

export async function updatePerson(id: number, input: CreatePersonInput): Promise<Person> {
  return await invoke('update_person', { id, input });
}

export async function deletePerson(id: number): Promise<void> {
  return await invoke('delete_person', { id });
}

// ============================================================================
// Planning Period Commands
// ============================================================================

export async function listPlanningPeriods(): Promise<PlanningPeriod[]> {
  return await invoke('list_planning_periods');
}

export async function createPlanningPeriod(input: CreatePlanningPeriodInput): Promise<PlanningPeriod> {
  return await invoke('create_planning_period', { input });
}

export async function updatePlanningPeriod(id: number, input: CreatePlanningPeriodInput): Promise<PlanningPeriod> {
  return await invoke('update_planning_period', { id, input });
}

export async function deletePlanningPeriod(id: number): Promise<void> {
  return await invoke('delete_planning_period', { id });
}

export async function setActivePlanningPeriod(id: number): Promise<void> {
  return await invoke('set_active_planning_period', { id });
}

// ============================================================================
// Project Commands
// ============================================================================

export async function listProjects(planningPeriodId?: number): Promise<Project[]> {
  return await invoke('list_projects', { planningPeriodId });
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  return await invoke('create_project', { input });
}

export async function updateProject(id: number, input: CreateProjectInput): Promise<Project> {
  return await invoke('update_project', { id, input });
}

export async function deleteProject(id: number): Promise<void> {
  return await invoke('delete_project', { id });
}

// ============================================================================
// Assignment Commands
// ============================================================================

export async function listAssignments(planningPeriodId?: number): Promise<Assignment[]> {
  return await invoke('list_assignments', { planningPeriodId });
}

export async function createAssignment(input: CreateAssignmentInput): Promise<Assignment> {
  return await invoke('create_assignment', { input });
}

export async function updateAssignment(id: number, input: CreateAssignmentInput): Promise<Assignment> {
  return await invoke('update_assignment', { id, input });
}

export async function deleteAssignment(id: number): Promise<void> {
  return await invoke('delete_assignment', { id });
}

export async function pinAssignment(id: number, allocationPercent: number): Promise<void> {
  return await invoke('pin_assignment', { id, allocationPercent });
}

export async function unpinAssignment(id: number): Promise<void> {
  return await invoke('unpin_assignment', { id });
}

// ============================================================================
// Absence Commands
// ============================================================================

export async function listAbsences(personId?: number): Promise<Absence[]> {
  return await invoke('list_absences', { personId });
}

export async function createAbsence(input: CreateAbsenceInput): Promise<Absence> {
  return await invoke('create_absence', { input });
}

export async function updateAbsence(id: number, input: CreateAbsenceInput): Promise<Absence> {
  return await invoke('update_absence', { id, input });
}

export async function deleteAbsence(id: number): Promise<void> {
  return await invoke('delete_absence', { id });
}

// ============================================================================
// Optimization Commands (Phase 3+)
// ============================================================================

export async function calculateOptimalAllocations(planningPeriodId: number): Promise<void> {
  return await invoke('calculate_optimal_allocations', { planningPeriodId });
}

export async function getProjectFeasibility(planningPeriodId: number): Promise<any> {
  return await invoke('get_project_feasibility', { planningPeriodId });
}

// ============================================================================
// Capacity Analysis Commands (Phase 4)
// ============================================================================

export async function getPersonCapacity(planningPeriodId: number): Promise<any> {
  return await invoke('get_person_capacity', { planningPeriodId });
}

export async function getProjectStaffing(planningPeriodId: number): Promise<any> {
  return await invoke('get_project_staffing', { planningPeriodId });
}
