import { useEffect, useState } from 'react';
import { Container, Title, Button, Stack, Group, LoadingOverlay, Paper, Text, Alert } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { IconPlus, IconAlertTriangle } from '@tabler/icons-react';
import { ProjectList } from '../components/projects/ProjectList';
import { ProjectForm } from '../components/projects/ProjectForm';
import { listProjects, createProject, updateProject, deleteProject, checkProjectDependencies } from '../lib/tauri';
import type { Project, CreateProjectInput } from '../types';

export function ProjectsManagementPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpened, setFormOpened] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await listProjects();
      setProjects(data);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load projects',
        color: 'red',
      });
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: CreateProjectInput) => {
    try {
      await createProject(values);
      await loadProjects();
      notifications.show({
        title: 'Success',
        message: 'Project created successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to create project',
        color: 'red',
      });
      throw error;
    }
  };

  const handleUpdate = async (values: CreateProjectInput) => {
    if (!selectedProject) return;
    
    try {
      await updateProject(selectedProject.id, values);
      await loadProjects();
      notifications.show({
        title: 'Success',
        message: 'Project updated successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update project',
        color: 'red',
      });
      throw error;
    }
  };

  const handleDelete = async (id: number) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;

    try {
      const deps = await checkProjectDependencies(id);
      
      modals.openConfirmModal({
        title: 'Delete Project',
        centered: true,
        children: (
          <Stack gap="sm">
            <Text size="sm">
              Are you sure you want to delete <strong>{project.name}</strong>?
            </Text>
            {deps.requirement_count > 0 && (
              <Alert color="orange" icon={<IconAlertTriangle size={16} />}>
                This project has {deps.requirement_count} requirement(s) across planning periods which will also be deleted.
              </Alert>
            )}
            {deps.assignment_count > 0 && (
              <Alert color="orange" icon={<IconAlertTriangle size={16} />}>
                This project has {deps.assignment_count} active assignment(s) which will also be deleted.
              </Alert>
            )}
            {(deps.requirement_count > 0 || deps.assignment_count > 0) && (
              <Alert color="blue">
                Capacity calculations will be invalidated and need to be recalculated.
              </Alert>
            )}
            <Text size="sm" c="dimmed">
              This action cannot be undone.
            </Text>
          </Stack>
        ),
        labels: { confirm: 'Delete', cancel: 'Cancel' },
        confirmProps: { color: 'red' },
        onConfirm: async () => {
          try {
            await deleteProject(id);
            await loadProjects();
            notifications.show({
              title: 'Success',
              message: 'Project deleted successfully',
              color: 'green',
            });
            if (deps.assignment_count > 0) {
              notifications.show({
                title: 'Recalculation Needed',
                message: 'Please recalculate capacity allocations in the Analysis tab.',
                color: 'yellow',
                autoClose: 5000,
              });
            }
          } catch (error) {
            notifications.show({
              title: 'Error',
              message: 'Failed to delete project',
              color: 'red',
            });
            console.error('Failed to delete project:', error);
          }
        },
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to check dependencies',
        color: 'red',
      });
      console.error('Failed to check dependencies:', error);
    }
  };

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setFormOpened(true);
  };

  const handleCloseForm = () => {
    setFormOpened(false);
    setSelectedProject(null);
  };

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <div>
            <Title order={1}>Projects Management</Title>
            <Text size="sm" c="dimmed" mt="xs">
              Projects are global work items available in all planning periods. The 'Target Hours/Period' represents the hard requirement for each period.
            </Text>
          </div>
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => setFormOpened(true)}
          >
            Add Project
          </Button>
        </Group>

        <Paper shadow="xs" p="md" pos="relative">
          <LoadingOverlay visible={loading} />
          <ProjectList
            projects={projects}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </Paper>
      </Stack>

      <ProjectForm
        opened={formOpened}
        onClose={handleCloseForm}
        onSubmit={selectedProject ? handleUpdate : handleCreate}
        project={selectedProject}
        title={selectedProject ? 'Edit Project' : 'Create Project'}
      />
    </Container>
  );
}
