import { useEffect, useState } from 'react';
import { 
  Button, 
  Stack, 
  Group, 
  LoadingOverlay, 
  Paper, 
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import { AssignmentList } from './AssignmentList';
import { AssignmentForm } from './AssignmentForm';
import { 
  listAssignments,
  listPeople,
  listProjects,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from '../../lib/tauri';
import type { 
  Assignment, 
  CreateAssignmentInput, 
  PlanningPeriod, 
  Person, 
  Project 
} from '../../types';

interface AssignmentManagerProps {
  periodId: number;
  period: PlanningPeriod;
}

export function AssignmentManager({ periodId, period }: AssignmentManagerProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpened, setFormOpened] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    loadData();
  }, [periodId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [assignmentsData, peopleData, projectsData] = await Promise.all([
        listAssignments(periodId),
        listPeople(),
        listProjects(),
      ]);
      
      setAssignments(assignmentsData);
      setPeople(peopleData);
      setProjects(projectsData);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load assignments data',
        color: 'red',
      });
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: CreateAssignmentInput) => {
    try {
      await createAssignment(values);
      await loadData();
      notifications.show({
        title: 'Success',
        message: 'Assignment created successfully',
        color: 'green',
      });
    } catch (error) {
      // Show the error message from the backend (validation error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create assignment';
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      });
      throw error;
    }
  };

  const handleUpdate = async (values: CreateAssignmentInput) => {
    if (!selectedAssignment) return;
    
    try {
      await updateAssignment(selectedAssignment.id, values);
      await loadData();
      notifications.show({
        title: 'Success',
        message: 'Assignment updated successfully',
        color: 'green',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update assignment';
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      });
      throw error;
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    try {
      await deleteAssignment(id);
      await loadData();
      notifications.show({
        title: 'Success',
        message: 'Assignment deleted successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete assignment',
        color: 'red',
      });
      console.error('Failed to delete assignment:', error);
    }
  };

  const handleEdit = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setFormOpened(true);
  };

  const handleCloseForm = () => {
    setFormOpened(false);
    setSelectedAssignment(null);
  };

  if (people.length === 0 && !loading) {
    return (
      <Paper p="xl" ta="center" withBorder>
        <Text c="dimmed" size="lg">
          No people found. Create people first in the People menu.
        </Text>
      </Paper>
    );
  }

  if (projects.length === 0 && !loading) {
    return (
      <Paper p="xl" ta="center" withBorder>
        <Text c="dimmed" size="lg">
          No projects found. Create projects first in the Projects menu.
        </Text>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      <Paper p="md" withBorder bg="blue.0">
        <Text size="sm" c="blue.9">
          Create assignments to allocate people to projects for this planning period. 
          You must set project requirements before creating assignments.
        </Text>
      </Paper>

      <Paper p="md" withBorder pos="relative">
        <LoadingOverlay visible={loading} />
        
        <Group justify="space-between" mb="md">
          <Text fw={500} size="lg">Assignments</Text>
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => setFormOpened(true)}
          >
            Add Assignment
          </Button>
        </Group>

        <AssignmentList
          assignments={assignments}
          people={people}
          projects={projects}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </Paper>

      <AssignmentForm
        opened={formOpened}
        onClose={handleCloseForm}
        onSubmit={selectedAssignment ? handleUpdate : handleCreate}
        assignment={selectedAssignment}
        planningPeriod={period}
        title={selectedAssignment ? 'Edit Assignment' : 'Create Assignment'}
      />
    </Stack>
  );
}
