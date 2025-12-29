import { Paper, Title, Text } from "@mantine/core";
import { IconChartBar } from "@tabler/icons-react";

interface CapacityAnalysisPlaceholderProps {
  periodId: number;
}

export function CapacityAnalysisPlaceholder({
  periodId,
}: CapacityAnalysisPlaceholderProps) {
  return (
    <Paper p="xl" ta="center" withBorder>
      <IconChartBar size={64} color="gray" style={{ margin: "0 auto" }} />
      <Title order={3} mt="md">
        Capacity Analysis
      </Title>
      <Text c="dimmed" mt="xs">
        Visualization and optimization tools will appear here. This feature is
        planned for future development.
      </Text>
      <Text size="sm" c="dimmed" mt="lg">
        Planning Period ID: {periodId}
      </Text>
    </Paper>
  );
}
