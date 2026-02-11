import { Text, useMantineTheme } from "@mantine/core";
import { PieChart } from "@mantine/charts";

interface CapacityPieChartProps {
  absenceHours: number;
  holidayHours: number;
  overheadHours: number;
  optionalOverheadHours: number;
  availableHours: number;
  baseHours: number;
  size?: number;
}

export function CapacityPieChart({
  absenceHours,
  holidayHours,
  overheadHours,
  optionalOverheadHours,
  availableHours,
  baseHours,
  size = 200,
}: CapacityPieChartProps) {
  const theme = useMantineTheme();

  // Handle edge case: no capacity data
  if (baseHours === 0) {
    return (
      <Text size="sm" c="dimmed" ta="center" py="md">
        No capacity data available
      </Text>
    );
  }

  // Transform data into Mantine PieChart format
  // Use theme colors instead of hardcoded hex values
  const data = [
    {
      name: "Absence",
      value: absenceHours + holidayHours,
      color: theme.colors.blue[5],
    },
    {
      name: "Overhead",
      value: overheadHours,
      color: theme.colors.orange[5],
    },
    {
      name: "Optional",
      value: optionalOverheadHours,
      color: theme.colors.yellow[5],
    },
    { name: "Available", value: availableHours, color: theme.colors.green[5] },
  ].filter((item) => item.value > 0);

  // If no data segments, show message
  if (data.length === 0) {
    return (
      <Text size="sm" c="dimmed" ta="center" py="md">
        No capacity data available
      </Text>
    );
  }

  return (
    <PieChart
      data={data}
      size={size}
      withLabels
      withTooltip
      labelsType="percent"
      tooltipDataSource="segment"
    />
  );
}
