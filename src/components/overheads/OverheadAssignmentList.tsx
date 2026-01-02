import { ActionIcon, Badge, Table, Text } from "@mantine/core";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import type { OverheadAssignment, Person } from "../../types";

interface OverheadAssignmentListProps {
  assignments: OverheadAssignment[];
  people: Person[];
  onEdit: (assignment: OverheadAssignment) => void;
  onDelete: (id: number) => void;
}

export function OverheadAssignmentList({
  assignments,
  people,
  onEdit,
  onDelete,
}: OverheadAssignmentListProps) {
  if (assignments.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No people assigned to this overhead. Click "Assign Person" to add.
      </Text>
    );
  }

  // Create a map for quick person lookup
  const peopleMap = new Map(people.map((p) => [p.id, p]));

  // Sort by person name
  const sortedAssignments = [...assignments].sort((a, b) => {
    const personA = peopleMap.get(a.person_id);
    const personB = peopleMap.get(b.person_id);
    const nameA = personA?.name || "";
    const nameB = personB?.name || "";
    return nameA.localeCompare(nameB);
  });

  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Person</Table.Th>
          <Table.Th>Effort</Table.Th>
          <Table.Th>Period</Table.Th>
          <Table.Th style={{ width: 100 }}>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {sortedAssignments.map((assignment) => {
          const person = peopleMap.get(assignment.person_id);
          return (
            <Table.Tr key={assignment.id}>
              <Table.Td>
                <Text size="sm" fw={500}>
                  {person?.name || `Person #${assignment.person_id}`}
                </Text>
                {person?.email && (
                  <Text size="xs" c="dimmed">
                    {person.email}
                  </Text>
                )}
              </Table.Td>
              <Table.Td>
                <Text size="sm">{assignment.effort_hours}h</Text>
              </Table.Td>
              <Table.Td>
                <Badge
                  size="sm"
                  variant="light"
                  color={
                    assignment.effort_period === "daily" ? "blue" : "green"
                  }
                >
                  {assignment.effort_period === "daily"
                    ? "Per Day"
                    : "Per Week"}
                </Badge>
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
        })}
      </Table.Tbody>
    </Table>
  );
}
