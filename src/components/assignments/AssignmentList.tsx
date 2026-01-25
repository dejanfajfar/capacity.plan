import { ActionIcon, Avatar, Group, Table, Text, Tooltip } from "@mantine/core";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { useGravatarUrl } from "../../lib/gravatar";
import type { Assignment, Person, Project } from "../../types";
import { getProficiencyLabelWithPercentage } from "../../constants/proficiency";

interface AssignmentListProps {
  assignments: Assignment[];
  people: Person[];
  projects: Project[];
  onEdit: (assignment: Assignment) => void;
  onDelete: (id: number) => void;
}

interface AssignmentRowProps {
  assignment: Assignment;
  person: Person | undefined;
  project: Project | undefined;
  onEdit: (assignment: Assignment) => void;
  onDelete: (id: number) => void;
}

function AssignmentRow({
  assignment,
  person,
  project,
  onEdit,
  onDelete,
}: AssignmentRowProps) {
  const avatarUrl = useGravatarUrl(person?.email || "", {
    size: 80,
    default: "initials",
    name: person?.name,
  });

  return (
    <Table.Tr key={assignment.id}>
      <Table.Td>
        <Group gap="sm">
          <Avatar src={avatarUrl} alt={person?.name} size="sm" radius="xl" />
          <Text>{person?.name || "Unknown"}</Text>
        </Group>
      </Table.Td>
      <Table.Td>{project?.name || "Unknown"}</Table.Td>
      <Table.Td>
        <Tooltip
          label={`Productivity factor: ${getProficiencyLabelWithPercentage(assignment.productivity_factor)}`}
          withArrow
        >
          <Text size="sm">
            {getProficiencyLabelWithPercentage(assignment.productivity_factor)}
          </Text>
        </Tooltip>
      </Table.Td>
      <Table.Td>
        <Text size="sm">
          {new Date(assignment.start_date).toLocaleDateString()} -{" "}
          {new Date(assignment.end_date).toLocaleDateString()}
        </Text>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          {assignment.calculated_allocation_percentage !== null ? (
            <Tooltip label="Calculated by optimization" withArrow>
              <Text className="numeric-data">
                {assignment.calculated_allocation_percentage.toFixed(1)}%
              </Text>
            </Tooltip>
          ) : (
            <Text c="dimmed">Not calculated</Text>
          )}
        </Group>
      </Table.Td>
      <Table.Td>
        {assignment.calculated_effective_hours !== null ? (
          <Text className="numeric-data">
            {assignment.calculated_effective_hours.toFixed(1)}h
          </Text>
        ) : (
          <Text c="dimmed">-</Text>
        )}
      </Table.Td>
      <Table.Td>
        <ActionIcon.Group>
          <ActionIcon
            variant="subtle"
            color="blue"
            onClick={() => onEdit(assignment)}
            title="Edit assignment"
          >
            <IconEdit size={18} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => onDelete(assignment.id)}
            title="Delete assignment"
          >
            <IconTrash size={18} />
          </ActionIcon>
        </ActionIcon.Group>
      </Table.Td>
    </Table.Tr>
  );
}

export function AssignmentList({
  assignments,
  people,
  projects,
  onEdit,
  onDelete,
}: AssignmentListProps) {
  if (assignments.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No assignments found. Create your first assignment to get started.
      </Text>
    );
  }

  // Create lookup maps for person and project
  const personMap = new Map(people.map((p) => [p.id, p]));
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Person</Table.Th>
          <Table.Th>Project</Table.Th>
          <Table.Th>Proficiency</Table.Th>
          <Table.Th>Date Range</Table.Th>
          <Table.Th>Allocation %</Table.Th>
          <Table.Th>Effective Hours</Table.Th>
          <Table.Th style={{ width: 100 }}>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {assignments.map((assignment) => (
          <AssignmentRow
            key={assignment.id}
            assignment={assignment}
            person={personMap.get(assignment.person_id)}
            project={projectMap.get(assignment.project_id)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </Table.Tbody>
    </Table>
  );
}
