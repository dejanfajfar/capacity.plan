import { Stack, Title, Text, Paper } from "@mantine/core";
import { IconCalendar } from "@tabler/icons-react";

interface AbsenceManagerProps {
  personId: number;
}

export function AbsenceManager({ personId: _personId }: AbsenceManagerProps) {
  return (
    <Stack gap="md">
      <div>
        <Title order={3}>Absences</Title>
        <Text size="sm" c="dimmed">
          Track vacation days, holidays, and other absences that affect
          capacity.
        </Text>
      </div>

      <Paper p="xl" withBorder>
        <Stack align="center" gap="md">
          <IconCalendar size={48} stroke={1.5} style={{ color: "gray" }} />
          <Text size="lg" fw={500}>
            Absence Management
          </Text>
          <Text c="dimmed" ta="center" maw={500}>
            Absence tracking for this person will be implemented here. This will
            include creating, viewing, and managing time off periods that reduce
            available capacity during planning periods.
          </Text>
          <Text c="dimmed" ta="center" size="sm" fs="italic">
            Coming soon: Add absences, view absence history, calculate capacity
            impact
          </Text>
        </Stack>
      </Paper>
    </Stack>
  );
}
