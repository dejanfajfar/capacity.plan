import { ActionIcon, Badge, Group, Table, Text, Tooltip } from "@mantine/core";
import { IconEdit, IconTrash, IconPin } from "@tabler/icons-react";
import type { Assignment, Person, Project } from "../../types";

interface AssignmentListProps {
  assignments: Assignment[];
  people: Person[];
  projects: Project[];
  onEdit: (assignment: Assignment) => void;
  onDelete: (id: number) => void;
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

  // Create lookup maps for person and project names
  const personMap = new Map(people.map((p) => [p.id, p.name]));
  const projectMap = new Map(projects.map((p) => [p.id, p.name]));

  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Person</Table.Th>
          <Table.Th>Project</Table.Th>
          <Table.Th>Productivity</Table.Th>
          <Table.Th>Date Range</Table.Th>
          <Table.Th>Allocation %</Table.Th>
          <Table.Th>Effective Hours</Table.Th>
          <Table.Th style={{ width: 100 }}>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {assignments.map((assignment) => (
          <Table.Tr key={assignment.id}>
            <Table.Td>
              {personMap.get(assignment.person_id) || "Unknown"}
            </Table.Td>
            <Table.Td>
              {projectMap.get(assignment.project_id) || "Unknown"}
            </Table.Td>
            <Table.Td className="numeric-data">
              {(assignment.productivity_factor * 100).toFixed(0)}%
            </Table.Td>
            <Table.Td>
              <Text size="sm">
                {new Date(assignment.start_date).toLocaleDateString()} -{" "}
                {new Date(assignment.end_date).toLocaleDateString()}
              </Text>
            </Table.Td>
            <Table.Td>
              <Group gap="xs">
                {assignment.is_pinned &&
                assignment.pinned_allocation_percentage !== null ? (
                  <>
                    <Text className="numeric-data">
                      {assignment.pinned_allocation_percentage.toFixed(1)}%
                    </Text>
                    <Badge
                      size="xs"
                      color="blue"
                      leftSection={<IconPin size={12} />}
                    >
                      Pinned
                    </Badge>
                  </>
                ) : assignment.calculated_allocation_percentage !== null ? (
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
        ))}
      </Table.Tbody>
    </Table>
  );
}
