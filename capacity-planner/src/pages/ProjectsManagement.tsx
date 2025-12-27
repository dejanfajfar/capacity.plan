import { useEffect, useState } from 'react';
import { Container, Title, Button, Stack, Group, LoadingOverlay, Paper } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import { ProjectList } from '../components/projects/ProjectList';
import { ProjectForm } from '../components/projects/ProjectForm';
import { listProjects, createProject, updateProject, deleteProject } from '../lib/tauri';
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
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await deleteProject(id);
      await loadProjects();
      notifications.show({
        title: 'Success',
        message: 'Project deleted successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete project',
        color: 'red',
      });
      console.error('Failed to delete project:', error);
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
          <Title order={1}>Projects Management</Title>
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
