import { Table, ActionIcon, Group, Badge, Text, Stack } from "@mantine/core";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import type { Country } from "../../types";

interface CountryListProps {
  countries: Country[];
  onEdit: (country: Country) => void;
  onDelete: (id: number) => void;
  holidayCounts: Map<number, number>;
  peopleCounts: Map<number, number>;
}

export function CountryList({
  countries,
  onEdit,
  onDelete,
  holidayCounts,
  peopleCounts,
}: CountryListProps) {
  if (countries.length === 0) {
    return (
      <Stack align="center" py="xl">
        <Text c="dimmed">No countries defined yet</Text>
        <Text size="sm" c="dimmed">
          Create a country to start managing holidays
        </Text>
      </Stack>
    );
  }

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>ISO Code</Table.Th>
          <Table.Th>Name</Table.Th>
          <Table.Th>Holidays</Table.Th>
          <Table.Th>People</Table.Th>
          <Table.Th>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {countries.map((country) => (
          <Table.Tr key={country.id}>
            <Table.Td>
              <Text fw={500}>{country.iso_code}</Text>
            </Table.Td>
            <Table.Td>{country.name}</Table.Td>
            <Table.Td>
              <Badge color="blue" variant="light">
                {holidayCounts.get(country.id) || 0}
              </Badge>
            </Table.Td>
            <Table.Td>
              <Badge color="green" variant="light">
                {peopleCounts.get(country.id) || 0}
              </Badge>
            </Table.Td>
            <Table.Td>
              <Group gap="xs">
                <ActionIcon
                  variant="subtle"
                  color="blue"
                  onClick={() => onEdit(country)}
                >
                  <IconEdit size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() => onDelete(country.id)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
