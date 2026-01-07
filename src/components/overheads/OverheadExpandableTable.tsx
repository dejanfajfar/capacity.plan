import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Group,
  LoadingOverlay,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronRight,
  IconEdit,
  IconTrash,
  IconUserPlus,
} from "@tabler/icons-react";
import { useGravatarUrl } from "../../lib/gravatar";
import type { Overhead, OverheadAssignment, Person } from "../../types";

interface OverheadExpandableTableProps {
  overheads: Overhead[];
  people: Person[];
  expandedOverheadIds: Set<number>;
  assignmentsByOverheadId: Map<number, OverheadAssignment[]>;
  loadingAssignmentIds: Set<number>;
  onToggleExpand: (overheadId: number) => void;
  onEditOverhead: (overhead: Overhead) => void;
  onDeleteOverhead: (id: number) => void;
  onAddAssignment: (overheadId: number) => void;
  onEditAssignment: (assignment: OverheadAssignment) => void;
  onDeleteAssignment: (id: number) => void;
}

interface AssignmentRowProps {
  assignment: OverheadAssignment;
  person: Person | undefined;
  onEdit: (assignment: OverheadAssignment) => void;
  onDelete: (id: number) => void;
}

function AssignmentRow({
  assignment,
  person,
  onEdit,
  onDelete,
}: AssignmentRowProps) {
  const avatarUrl = useGravatarUrl(person?.email || "", {
    size: 80,
    default: "initials",
    name: person?.name,
  });

  return (
    <Table.Tr>
      <Table.Td>
        <Group gap="sm">
          <Avatar src={avatarUrl} alt={person?.name} size="sm" radius="xl" />
          <div>
            <Text size="sm" fw={500}>
              {person?.name || `Person #${assignment.person_id}`}
            </Text>
            {person?.email && (
              <Text size="xs" c="dimmed">
                {person.email}
              </Text>
            )}
          </div>
        </Group>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{assignment.effort_hours}h</Text>
      </Table.Td>
      <Table.Td>
        <Badge
          size="sm"
          variant="light"
          color={assignment.effort_period === "daily" ? "blue" : "green"}
        >
          {assignment.effort_period === "daily" ? "Per Day" : "Per Week"}
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
}

interface OverheadRowProps {
  overhead: Overhead;
  isExpanded: boolean;
  assignments: OverheadAssignment[] | undefined;
  isLoadingAssignments: boolean;
  people: Person[];
  onToggleExpand: (overheadId: number) => void;
  onEdit: (overhead: Overhead) => void;
  onDelete: (id: number) => void;
  onAddAssignment: (overheadId: number) => void;
  onEditAssignment: (assignment: OverheadAssignment) => void;
  onDeleteAssignment: (id: number) => void;
}

function OverheadRow({
  overhead,
  isExpanded,
  assignments,
  isLoadingAssignments,
  people,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddAssignment,
  onEditAssignment,
  onDeleteAssignment,
}: OverheadRowProps) {
  const assignmentCount = assignments?.length || 0;
  const peopleMap = new Map(people.map((p) => [p.id, p]));

  // Sort assignments by person name
  const sortedAssignments = assignments
    ? [...assignments].sort((a, b) => {
        const personA = peopleMap.get(a.person_id);
        const personB = peopleMap.get(b.person_id);
        const nameA = personA?.name || "";
        const nameB = personB?.name || "";
        return nameA.localeCompare(nameB);
      })
    : [];

  return (
    <>
      {/* Main overhead row */}
      <Table.Tr
        style={{
          cursor: "pointer",
        }}
        bg={isExpanded ? "dark.5" : undefined}
        onClick={() => onToggleExpand(overhead.id)}
      >
        <Table.Td style={{ width: 40 }}>
          {isExpanded ? (
            <IconChevronDown size={18} />
          ) : (
            <IconChevronRight size={18} />
          )}
        </Table.Td>
        <Table.Td>
          <Text size="sm" fw={500}>
            {overhead.name}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm" c={overhead.description ? undefined : "dimmed"}>
            {overhead.description || "No description"}
          </Text>
        </Table.Td>
        <Table.Td>
          <Badge
            size="sm"
            variant={assignmentCount > 0 ? "filled" : "light"}
            color={assignmentCount > 0 ? "blue" : "gray"}
          >
            {assignmentCount} {assignmentCount === 1 ? "person" : "people"}
          </Badge>
        </Table.Td>
        <Table.Td onClick={(e) => e.stopPropagation()}>
          <ActionIcon.Group>
            <ActionIcon
              variant="subtle"
              color="blue"
              onClick={() => onEdit(overhead)}
              title="Edit overhead"
            >
              <IconEdit size={18} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={() => onDelete(overhead.id)}
              title="Delete overhead"
            >
              <IconTrash size={18} />
            </ActionIcon>
          </ActionIcon.Group>
        </Table.Td>
      </Table.Tr>

      {/* Expanded section with assignments */}
      {isExpanded && (
        <Table.Tr>
          <Table.Td colSpan={5} p={0} bg="dark.7">
            <Stack gap="md" p="md" pl="xl">
              {isLoadingAssignments ? (
                <div style={{ position: "relative", minHeight: 100 }}>
                  <LoadingOverlay visible={true} />
                </div>
              ) : sortedAssignments.length === 0 ? (
                <Stack gap="sm" align="center" py="md">
                  <Text c="dimmed" size="sm">
                    No people assigned yet.
                  </Text>
                  <Button
                    leftSection={<IconUserPlus size={18} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddAssignment(overhead.id);
                    }}
                    size="sm"
                  >
                    Assign Person
                  </Button>
                </Stack>
              ) : (
                <div>
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
                      {sortedAssignments.map((assignment) => (
                        <AssignmentRow
                          key={assignment.id}
                          assignment={assignment}
                          person={peopleMap.get(assignment.person_id)}
                          onEdit={onEditAssignment}
                          onDelete={onDeleteAssignment}
                        />
                      ))}
                    </Table.Tbody>
                  </Table>
                  <Group justify="center" mt="md">
                    <Button
                      leftSection={<IconUserPlus size={18} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddAssignment(overhead.id);
                      }}
                      size="sm"
                      variant="light"
                    >
                      Assign Person
                    </Button>
                  </Group>
                </div>
              )}
            </Stack>
          </Table.Td>
        </Table.Tr>
      )}
    </>
  );
}

export function OverheadExpandableTable({
  overheads,
  people,
  expandedOverheadIds,
  assignmentsByOverheadId,
  loadingAssignmentIds,
  onToggleExpand,
  onEditOverhead,
  onDeleteOverhead,
  onAddAssignment,
  onEditAssignment,
  onDeleteAssignment,
}: OverheadExpandableTableProps) {
  if (overheads.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No overheads defined. Add an overhead to track recurring tasks that
        reduce available capacity.
      </Text>
    );
  }

  // Sort overheads by name
  const sortedOverheads = [...overheads].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th style={{ width: 40 }}></Table.Th>
          <Table.Th>Name</Table.Th>
          <Table.Th>Description</Table.Th>
          <Table.Th style={{ width: 120 }}>Assigned</Table.Th>
          <Table.Th style={{ width: 100 }}>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {sortedOverheads.map((overhead) => (
          <OverheadRow
            key={overhead.id}
            overhead={overhead}
            isExpanded={expandedOverheadIds.has(overhead.id)}
            assignments={assignmentsByOverheadId.get(overhead.id)}
            isLoadingAssignments={loadingAssignmentIds.has(overhead.id)}
            people={people}
            onToggleExpand={onToggleExpand}
            onEdit={onEditOverhead}
            onDelete={onDeleteOverhead}
            onAddAssignment={onAddAssignment}
            onEditAssignment={onEditAssignment}
            onDeleteAssignment={onDeleteAssignment}
          />
        ))}
      </Table.Tbody>
    </Table>
  );
}
