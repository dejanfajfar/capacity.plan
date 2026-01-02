import { Stack, Group, Text } from "@mantine/core";

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

  // Calculate percentages
  const absencePercent = (absenceHours / baseHours) * 100;
  const overheadPercent = (overheadHours / baseHours) * 100;
  const availablePercent = (availableHours / baseHours) * 100;

  // SVG configuration
  const strokeWidth = 40;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate segments
  let currentPercent = 0;
  const segments = [];

  // Absence segment (blue)
  if (absencePercent > 0) {
    const offset = (currentPercent / 100) * circumference;
    const dashArray = `${(absencePercent / 100) * circumference} ${circumference}`;
    segments.push({
      color: "#339af0", // blue
      offset,
      dashArray,
      label: "Absence",
      hours: absenceHours,
      percent: absencePercent,
    });
    currentPercent += absencePercent;
  }

  // Overhead segment (orange)
  if (overheadPercent > 0) {
    const offset = (currentPercent / 100) * circumference;
    const dashArray = `${(overheadPercent / 100) * circumference} ${circumference}`;
    segments.push({
      color: "#fd7e14", // orange
      offset,
      dashArray,
      label: "Overhead",
      hours: overheadHours,
      percent: overheadPercent,
    });
    currentPercent += overheadPercent;
  }

  // Available segment (green)
  if (availablePercent > 0) {
    const offset = (currentPercent / 100) * circumference;
    const dashArray = `${(availablePercent / 100) * circumference} ${circumference}`;
    segments.push({
      color: "#51cf66", // green
      offset,
      dashArray,
      label: "Available",
      hours: availableHours,
      percent: availablePercent,
    });
  }

  return (
    <Stack gap="md" align="center">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e9ecef"
          strokeWidth={strokeWidth}
        />
        {segments.map((segment, index) => (
          <circle
            key={index}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={strokeWidth}
            strokeDasharray={segment.dashArray}
            strokeDashoffset={-segment.offset}
            strokeLinecap="butt"
          />
        ))}
      </svg>

      <Stack gap="xs" style={{ width: "100%" }}>
        {segments.map((segment, index) => (
          <Group key={index} justify="space-between">
            <Group gap="xs">
              <div
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: segment.color,
                  borderRadius: 2,
                }}
              />
              <Text size="sm">{segment.label}</Text>
            </Group>
            <Group gap="xs">
              <Text size="sm" fw={500} className="numeric-data">
                {segment.hours.toFixed(0)}h
              </Text>
              <Text size="xs" c="dimmed">
                ({segment.percent.toFixed(1)}%)
              </Text>
            </Group>
          </Group>
        ))}
        <Group
          justify="space-between"
          pt="xs"
          style={{ borderTop: "1px solid #e9ecef" }}
        >
          <Text size="sm" fw={600}>
            Total Base Hours
          </Text>
          <Text size="sm" fw={600} className="numeric-data">
            {baseHours.toFixed(0)}h
          </Text>
        </Group>
      </Stack>
    </Stack>
  );
}
