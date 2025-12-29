import { ActionIcon, Table, Text } from '@mantine/core';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import type { Project } from '../../types';

interface ProjectListProps {
  projects: Project[];
  onEdit: (project: Project) => void;
  onDelete: (id: number) => void;
}

export function ProjectList({ projects, onEdit, onDelete }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No projects found. Create your first project to get started.
      </Text>
    );
  }

  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          <Table.Th>Description</Table.Th>
          <Table.Th>Target Hours/Period</Table.Th>
          <Table.Th style={{ width: 100 }}>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {projects.map((project) => (
          <Table.Tr key={project.id}>
            <Table.Td>{project.name}</Table.Td>
            <Table.Td>
              <Text size="sm" lineClamp={1}>
                {project.description || '-'}
              </Text>
            </Table.Td>
            <Table.Td className="numeric-data">{project.required_hours} hrs/period</Table.Td>
            <Table.Td>
              <ActionIcon.Group>
                <ActionIcon
                  variant="subtle"
                  color="blue"
                  onClick={() => onEdit(project)}
                  title="Edit project"
                >
                  <IconEdit size={18} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() => onDelete(project.id)}
                  title="Delete project"
                >
                  <IconTrash size={18} />
                </ActionIcon>
              </ActionIcon.Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
