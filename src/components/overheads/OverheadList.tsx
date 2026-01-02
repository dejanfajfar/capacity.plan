import { ActionIcon, Table, Text } from "@mantine/core";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import type { Overhead } from "../../types";

interface OverheadListProps {
  overheads: Overhead[];
  onEdit: (overhead: Overhead) => void;
  onDelete: (id: number) => void;
  onSelect: (overhead: Overhead) => void;
  selectedOverheadId?: number;
}

export function OverheadList({
  overheads,
  onEdit,
  onDelete,
  onSelect,
  selectedOverheadId,
}: OverheadListProps) {
  if (overheads.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No overheads defined. Add an overhead to track recurring tasks.
      </Text>
    );
  }

  // Sort by name
  const sortedOverheads = [...overheads].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          <Table.Th>Description</Table.Th>
          <Table.Th style={{ width: 100 }}>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {sortedOverheads.map((overhead) => (
          <Table.Tr
            key={overhead.id}
            onClick={() => onSelect(overhead)}
            style={{
              cursor: "pointer",
              backgroundColor:
                selectedOverheadId === overhead.id
                  ? "var(--mantine-color-blue-light)"
                  : undefined,
            }}
          >
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
        ))}
      </Table.Tbody>
    </Table>
  );
}
