import { ActionIcon, Avatar, Group, Table, Text } from "@mantine/core";
import { IconEdit, IconTrash, IconEye } from "@tabler/icons-react";
import { useGravatarUrl } from "../../lib/gravatar";
import type { PersonWithCountry } from "../../types";

interface PersonListProps {
  people: PersonWithCountry[];
  onEdit: (person: PersonWithCountry) => void;
  onDelete: (id: number) => void;
  onView: (personId: number) => void;
}

interface PersonRowProps {
  person: PersonWithCountry;
  onEdit: (person: PersonWithCountry) => void;
  onDelete: (id: number) => void;
  onView: (personId: number) => void;
}

function PersonRow({ person, onEdit, onDelete, onView }: PersonRowProps) {
  const avatarUrl = useGravatarUrl(person.email, {
    size: 80,
    default: "initials",
    name: person.name,
  });

  return (
    <Table.Tr
      key={person.id}
      style={{ cursor: "pointer" }}
      onClick={() => onView(person.id)}
    >
      <Table.Td>
        <Group gap="sm">
          <Avatar src={avatarUrl} alt={person.name} size="md" radius="xl" />
          <Text>{person.name}</Text>
        </Group>
      </Table.Td>
      <Table.Td>{person.email}</Table.Td>
      <Table.Td className="numeric-data">
        {person.available_hours_per_week} hrs
      </Table.Td>
      <Table.Td>
        {person.country_name ? (
          <Text>{person.country_name}</Text>
        ) : (
          <Text c="dimmed">—</Text>
        )}
      </Table.Td>
      <Table.Td onClick={(e) => e.stopPropagation()}>
        <ActionIcon.Group>
          <ActionIcon
            variant="subtle"
            color="blue"
            onClick={() => onView(person.id)}
            title="View details"
          >
            <IconEye size={18} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="gray"
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
  );
}

export function PersonList({
  people,
  onEdit,
  onDelete,
  onView,
}: PersonListProps) {
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
          <Table.Th>Country</Table.Th>
          <Table.Th style={{ width: 100 }}>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {people.map((person) => (
          <PersonRow
            key={person.id}
            person={person}
            onEdit={onEdit}
            onDelete={onDelete}
            onView={onView}
          />
        ))}
      </Table.Tbody>
    </Table>
  );
}
