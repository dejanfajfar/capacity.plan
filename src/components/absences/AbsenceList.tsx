import { ActionIcon, Badge, Table, Text } from "@mantine/core";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import type { Absence } from "../../types";

interface AbsenceListProps {
  absences: Absence[];
  onEdit: (absence: Absence) => void;
  onDelete: (id: number) => void;
}

export function AbsenceList({ absences, onEdit, onDelete }: AbsenceListProps) {
  if (absences.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No absences found. Add an absence to track time off.
      </Text>
    );
  }

  // Sort by start_date DESC (most recent first)
  const sortedAbsences = [...absences].sort(
    (a, b) =>
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );

  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Date Range</Table.Th>
          <Table.Th>Days</Table.Th>
          <Table.Th>Reason</Table.Th>
          <Table.Th style={{ width: 100 }}>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {sortedAbsences.map((absence) => (
          <Table.Tr key={absence.id}>
            <Table.Td>
              <Text size="sm">
                {new Date(absence.start_date).toLocaleDateString()} -{" "}
                {new Date(absence.end_date).toLocaleDateString()}
              </Text>
            </Table.Td>
            <Table.Td>
              <Badge size="md" variant="light" color="blue">
                {absence.days} {absence.days === 1 ? "day" : "days"}
              </Badge>
            </Table.Td>
            <Table.Td>
              <Text size="sm" c={absence.reason ? undefined : "dimmed"}>
                {absence.reason || "No reason provided"}
              </Text>
            </Table.Td>
            <Table.Td>
              <ActionIcon.Group>
                <ActionIcon
                  variant="subtle"
                  color="blue"
                  onClick={() => onEdit(absence)}
                  title="Edit absence"
                >
                  <IconEdit size={18} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() => onDelete(absence.id)}
                  title="Delete absence"
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
