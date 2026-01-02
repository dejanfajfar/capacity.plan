import { Text } from "@mantine/core";
import { PieChart } from "@mantine/charts";

interface CapacityPieChartProps {
  absenceHours: number;
  overheadHours: number;
  availableHours: number;
  baseHours: number;
  size?: number;
}

export function CapacityPieChart({
  absenceHours,
  overheadHours,
  availableHours,
  baseHours,
  size = 200,
}: CapacityPieChartProps) {
  // Handle edge case: no capacity data
  if (baseHours === 0) {
    return (
      <Text size="sm" c="dimmed" ta="center" py="md">
        No capacity data available
      </Text>
    );
  }

  // Transform data into Mantine PieChart format
  // Only include segments with non-zero values
  const data = [
    { name: "Absence", value: absenceHours, color: "#339af0" },
    { name: "Overhead", value: overheadHours, color: "#fd7e14" },
    { name: "Available", value: availableHours, color: "#51cf66" },
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
