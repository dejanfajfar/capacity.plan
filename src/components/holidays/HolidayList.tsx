import { Table, ActionIcon, Group, Text, Stack, Select } from "@mantine/core";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import type { HolidayWithCountry, Country } from "../../types";

interface HolidayListProps {
  holidays: HolidayWithCountry[];
  onEdit: (holiday: HolidayWithCountry) => void;
  onDelete: (id: number) => void;
  countries: Country[];
  selectedCountryId: string | null;
  onCountryFilterChange: (value: string | null) => void;
}

export function HolidayList({
  holidays,
  onEdit,
  onDelete,
  countries,
  selectedCountryId,
  onCountryFilterChange,
}: HolidayListProps) {
  // Format date as human-readable (e.g., "Jan 1, 2024")
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  // Calculate number of days in holiday
  const calculateDays = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // +1 to include both start and end dates
  };

  // Format country options for filter: "USA - United States" with "All countries" option
  const countryFilterOptions = [
    { value: "", label: "All countries" },
    ...countries.map((country) => ({
      value: country.id.toString(),
      label: `${country.iso_code} - ${country.name}`,
    })),
  ];

  return (
    <Stack gap="md">
      <Select
        label="Filter by Country"
        placeholder="All countries"
        data={countryFilterOptions}
        value={selectedCountryId || ""}
        onChange={onCountryFilterChange}
        clearable
        searchable
      />

      {holidays.length === 0 ? (
        <Stack align="center" py="xl">
          <Text c="dimmed">
            {selectedCountryId
              ? "No holidays for selected country"
              : "No holidays defined yet"}
          </Text>
          <Text size="sm" c="dimmed">
            Create a holiday to track non-working days
          </Text>
        </Stack>
      ) : (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Country</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Start Date</Table.Th>
              <Table.Th>End Date</Table.Th>
              <Table.Th>Days</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {holidays.map((holiday) => (
              <Table.Tr key={holiday.id}>
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {holiday.country_iso_code} - {holiday.country_name}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c={holiday.name ? undefined : "dimmed"}>
                    {holiday.name || "(Unnamed)"}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{formatDate(holiday.start_date)}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{formatDate(holiday.end_date)}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">
                    {calculateDays(holiday.start_date, holiday.end_date)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      onClick={() => onEdit(holiday)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => onDelete(holiday.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
}
