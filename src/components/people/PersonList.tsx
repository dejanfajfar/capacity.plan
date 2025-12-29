import { ActionIcon, Table, Text } from "@mantine/core";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import type { Person } from "../../types";

interface PersonListProps {
  people: Person[];
  onEdit: (person: Person) => void;
  onDelete: (id: number) => void;
}

export function PersonList({ people, onEdit, onDelete }: PersonListProps) {
  if (people.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No people found. Create your first person to get started.
      </Text>
    );
  }

  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          <Table.Th>Email</Table.Th>
          <Table.Th>Available Hours/Week</Table.Th>
          <Table.Th style={{ width: 100 }}>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {people.map((person) => (
          <Table.Tr key={person.id}>
            <Table.Td>{person.name}</Table.Td>
            <Table.Td>{person.email}</Table.Td>
            <Table.Td className="numeric-data">
              {person.available_hours_per_week} hrs
            </Table.Td>
            <Table.Td>
              <ActionIcon.Group>
                <ActionIcon
                  variant="subtle"
                  color="blue"
                  onClick={() => onEdit(person)}
                  title="Edit person"
                >
                  <IconEdit size={18} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() => onDelete(person.id)}
                  title="Delete person"
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
