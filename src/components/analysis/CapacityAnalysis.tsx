import { useEffect, useState } from "react";
import {
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Badge,
  LoadingOverlay,
  Grid,
  Card,
  Progress,
  Table,
  Alert,
  Accordion,
  Tooltip,
  Center,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconChartBar,
  IconCalculator,
  IconAlertCircle,
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconCalendarOff,
  IconClock,
  IconInfoCircle,
} from "@tabler/icons-react";
import { optimizeAssignments, getCapacityOverview } from "../../lib/tauri";
import type { CapacityOverview, OptimizationResult } from "../../types";
import { CapacityPieChart } from "./CapacityPieChart";

interface CapacityAnalysisProps {
  periodId: number;
}

export function CapacityAnalysis({ periodId }: CapacityAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [overview, setOverview] = useState<CapacityOverview | null>(null);
  const [lastOptimization, setLastOptimization] =
    useState<OptimizationResult | null>(null);

  useEffect(() => {
    loadOverview();
  }, [periodId]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const data = await getCapacityOverview(periodId);
      setOverview(data);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to load capacity overview",
        color: "red",
      });
      console.error("Failed to load capacity overview:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    try {
      setOptimizing(true);
      const result = await optimizeAssignments(periodId);
      setLastOptimization(result);

      if (result.success) {
        notifications.show({
          title: "Optimization Complete",
          message: `Calculated allocations for ${result.calculations.length} assignments`,
          color: "green",
        });

        // Show warnings if any
        if (result.warnings.length > 0) {
          notifications.show({
            title: "Warnings",
            message: result.warnings.join(", "),
            color: "yellow",
          });
        }

        // Reload overview with new data
        await loadOverview();
      } else {
        notifications.show({
          title: "Optimization Failed",
          message: "Failed to calculate optimal allocations",
          color: "red",
        });
      }
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to run optimization",
        color: "red",
      });
      console.error("Failed to run optimization:", error);
    } finally {
      setOptimizing(false);
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 100) return "red"; // Overcommitted
    if (utilization >= 96) return "red"; // At capacity (96-100%)
    if (utilization >= 50) return "green"; // OK (50-95%)
    return "orange"; // Underutilized (0-49%)
  };

  const getStaffingColor = (percentage: number) => {
    if (percentage >= 100) return "green";
    if (percentage >= 80) return "yellow";
    return "red";
  };

  const getStaffingIcon = (isViable: boolean) => {
    if (isViable) return <IconCheck size={16} />;
    return <IconX size={16} />;
  };

  return (
    <Paper pos="relative" p="xl">
      <LoadingOverlay visible={loading} />

      <Stack gap="lg">
        {/* Header with Optimize Button */}
        <Group justify="space-between">
          <div>
            <Title order={2}>
              <Group gap="sm">
                <IconChartBar size={28} />
                Capacity Analysis
              </Group>
            </Title>
            <Text c="dimmed" size="sm" mt="xs">
              Review resource utilization and project staffing
            </Text>
          </div>
          <Button
            leftSection={<IconCalculator size={16} />}
            onClick={handleOptimize}
            loading={optimizing}
            size="lg"
          >
            Calculate Optimal Allocations
          </Button>
        </Group>

        {/* Optimization Results */}
        {lastOptimization && (
          <Alert
            icon={
              lastOptimization.success ? (
                <IconCheck size={16} />
              ) : (
                <IconX size={16} />
              )
            }
            title={
              lastOptimization.success
                ? "Optimization Successful"
                : "Optimization Failed"
            }
            color={lastOptimization.success ? "green" : "red"}
          >
            <Text size="sm">
              {lastOptimization.success
                ? `Calculated allocations for ${lastOptimization.calculations.length} assignments`
                : "Failed to calculate optimal allocations"}
            </Text>
            {lastOptimization.infeasible_projects.length > 0 && (
              <Text size="sm" mt="xs">
                <strong>Infeasible Projects:</strong>{" "}
                {lastOptimization.infeasible_projects.length}
              </Text>
            )}
            {lastOptimization.warnings.length > 0 && (
              <Text size="sm" mt="xs">
                <strong>Warnings:</strong>{" "}
                {lastOptimization.warnings.join(", ")}
              </Text>
            )}
          </Alert>
        )}

        {overview && (
          <>
            {/* Summary Cards */}
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Card withBorder>
                  <Text size="sm" c="dimmed">
                    Total People
                  </Text>
                  <Title order={2}>{overview.total_people}</Title>
                </Card>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Card withBorder>
                  <Text size="sm" c="dimmed">
                    Total Projects
                  </Text>
                  <Title order={2}>{overview.total_projects}</Title>
                </Card>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Card withBorder>
                  <Text size="sm" c="dimmed">
                    At/Near Capacity People
                  </Text>
                  <Title
                    order={2}
                    c={overview.over_committed_people > 0 ? "yellow" : "green"}
                  >
                    {overview.over_committed_people}
                  </Title>
                </Card>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Card withBorder>
                  <Text size="sm" c="dimmed">
                    Under-Staffed Projects
                  </Text>
                  <Title
                    order={2}
                    c={overview.under_staffed_projects > 0 ? "red" : "green"}
                  >
                    {overview.under_staffed_projects}
                  </Title>
                </Card>
              </Grid.Col>
            </Grid>

            {/* People Capacity */}
            <div>
              <Title order={3} mb="md">
                People Capacity
              </Title>
              <Accordion variant="contained">
                {overview.people_capacity.map((person) => (
                  <Accordion.Item
                    key={person.person_id}
                    value={person.person_id.toString()}
                  >
                    <Accordion.Control>
                      <Group justify="space-between" wrap="nowrap">
                        <div>
                          <Text fw={500}>{person.person_name}</Text>
                          <Text size="sm" c="dimmed" className="numeric-data">
                            {person.total_available_hours.toFixed(0)}h available
                          </Text>
                        </div>
                        <Group gap="md" wrap="nowrap">
                          <div style={{ width: 200 }}>
                            <Progress
                              value={person.utilization_percentage}
                              color={getUtilizationColor(
                                person.utilization_percentage,
                              )}
                              size="lg"
                            />
                            <Text
                              size="xs"
                              ta="center"
                              mt={4}
                              className="numeric-data"
                            >
                              {person.utilization_percentage.toFixed(1)}%
                              utilized
                            </Text>
                          </div>
                          <Badge
                            color={
                              person.utilization_percentage > 100
                                ? "red" // Overcommitted
                                : person.utilization_percentage >= 96
                                  ? "red" // At capacity
                                  : person.utilization_percentage >= 50
                                    ? "green" // OK
                                    : "orange" // Underutilized
                            }
                            variant="filled"
                          >
                            {person.utilization_percentage > 100
                              ? "Overcommitted"
                              : person.utilization_percentage >= 96
                                ? "Capacity"
                                : person.utilization_percentage >= 50
                                  ? "OK"
                                  : "Underutilized"}
                          </Badge>
                        </Group>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="md">
                        {/* Capacity Deductions Summary */}
                        {(person.absence_days > 0 ||
                          person.overhead_hours > 0) && (
                          <Alert
                            icon={<IconInfoCircle size={16} />}
                            color="blue"
                            variant="light"
                          >
                            <Stack gap="xs">
                              {person.absence_days > 0 && (
                                <Text size="sm">
                                  <IconCalendarOff
                                    size={14}
                                    style={{
                                      display: "inline",
                                      verticalAlign: "middle",
                                    }}
                                  />{" "}
                                  <strong>{person.absence_days}</strong>{" "}
                                  {person.absence_days === 1 ? "day" : "days"}{" "}
                                  absent (
                                  <strong className="numeric-data">
                                    {person.absence_hours.toFixed(0)}h
                                  </strong>{" "}
                                  deducted)
                                </Text>
                              )}
                              {person.overhead_hours > 0 && (
                                <Text size="sm">
                                  <IconClock
                                    size={14}
                                    style={{
                                      display: "inline",
                                      verticalAlign: "middle",
                                    }}
                                  />{" "}
                                  Overhead:{" "}
                                  <strong className="numeric-data">
                                    {person.overhead_hours.toFixed(0)}h
                                  </strong>{" "}
                                  deducted
                                </Text>
                              )}
                              <Text size="xs" c="dimmed" mt={4}>
                                Base: {person.base_available_hours.toFixed(0)}h
                                → Available:{" "}
                                {person.total_available_hours.toFixed(0)}h
                              </Text>
                            </Stack>
                          </Alert>
                        )}

                        {/* Capacity Breakdown Pie Chart */}
                        <Paper withBorder p="md" bg="gray.0">
                          <Title order={5} mb="md">
                            Capacity Breakdown
                          </Title>
                          <Center>
                            <CapacityPieChart
                              absenceHours={person.absence_hours}
                              overheadHours={person.overhead_hours}
                              availableHours={person.total_available_hours}
                              baseHours={person.base_available_hours}
                            />
                          </Center>
                        </Paper>

                        <div>
                          <Text size="sm" fw={500}>
                            Assignments:
                          </Text>
                          <Table mt="xs">
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>Project</Table.Th>
                                <Table.Th>Allocation</Table.Th>
                                <Table.Th>Effective Hours</Table.Th>
                                <Table.Th>Status</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {person.assignments.map((assignment) => (
                                <Table.Tr key={assignment.assignment_id}>
                                  <Table.Td>{assignment.project_name}</Table.Td>
                                  <Table.Td className="numeric-data">
                                    {assignment.allocation_percentage.toFixed(
                                      1,
                                    )}
                                    %
                                  </Table.Td>
                                  <Table.Td className="numeric-data">
                                    {assignment.effective_hours.toFixed(1)}h
                                  </Table.Td>
                                  <Table.Td>
                                    {assignment.is_pinned && (
                                      <Badge size="sm" variant="light">
                                        Pinned
                                      </Badge>
                                    )}
                                  </Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        </div>
                        <Group gap="lg">
                          <div>
                            <Text size="sm" c="dimmed">
                              Total Effective Hours
                            </Text>
                            <Text size="lg" fw={500} className="numeric-data">
                              {person.total_effective_hours.toFixed(1)}h
                            </Text>
                          </div>
                          <div>
                            <Text size="sm" c="dimmed">
                              Total Allocated Hours
                            </Text>
                            <Text size="lg" fw={500} className="numeric-data">
                              {person.total_allocated_hours.toFixed(1)}h
                            </Text>
                          </div>
                        </Group>
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            </div>

            {/* Project Staffing */}
            <div>
              <Title order={3} mb="md">
                Project Staffing
              </Title>
              <Accordion variant="contained">
                {overview.project_staffing.map((project) => (
                  <Accordion.Item
                    key={project.project_id}
                    value={project.project_id.toString()}
                  >
                    <Accordion.Control>
                      <Group justify="space-between" wrap="nowrap">
                        <div>
                          <Text fw={500}>{project.project_name}</Text>
                          <Text size="sm" c="dimmed" className="numeric-data">
                            {project.required_hours.toFixed(0)}h required
                          </Text>
                        </div>
                        <Group gap="md" wrap="nowrap">
                          <div style={{ width: 200 }}>
                            <Progress
                              value={Math.min(project.staffing_percentage, 100)}
                              color={getStaffingColor(
                                project.staffing_percentage,
                              )}
                              size="lg"
                            />
                            <Text
                              size="xs"
                              ta="center"
                              mt={4}
                              className="numeric-data"
                            >
                              {project.staffing_percentage.toFixed(1)}% staffed
                            </Text>
                          </div>
                          <Badge
                            color={getStaffingColor(
                              project.staffing_percentage,
                            )}
                            variant="filled"
                            leftSection={getStaffingIcon(project.is_viable)}
                          >
                            {project.is_viable ? "Viable" : "Under-Staffed"}
                          </Badge>
                        </Group>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="md">
                        {!project.is_viable && (
                          <Alert
                            icon={<IconAlertTriangle size={16} />}
                            color="red"
                          >
                            <Text size="sm">
                              <strong>Shortfall:</strong>{" "}
                              <span className="numeric-data">
                                {project.shortfall.toFixed(1)}h
                              </span>{" "}
                              needed (
                              <span className="numeric-data">
                                {(
                                  (project.shortfall / project.required_hours) *
                                  100
                                ).toFixed(1)}
                                %
                              </span>{" "}
                              under capacity)
                            </Text>
                            <Text size="sm" mt="xs">
                              Consider assigning more people, increasing
                              productivity factors, or reducing project scope.
                            </Text>
                          </Alert>
                        )}
                        <div>
                          <Text size="sm" fw={500}>
                            Assigned People:
                          </Text>
                          <Table mt="xs">
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>Person</Table.Th>
                                <Table.Th>Allocation</Table.Th>
                                <Table.Th>Productivity</Table.Th>
                                <Table.Th>Effective Hours</Table.Th>
                                <Table.Th>Deductions</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {project.assigned_people.map((person) => (
                                <Table.Tr key={person.assignment_id}>
                                  <Table.Td>{person.person_name}</Table.Td>
                                  <Table.Td className="numeric-data">
                                    {person.allocation_percentage.toFixed(1)}%
                                  </Table.Td>
                                  <Table.Td className="numeric-data">
                                    {(person.productivity_factor * 100).toFixed(
                                      0,
                                    )}
                                    %
                                  </Table.Td>
                                  <Table.Td className="numeric-data">
                                    {person.effective_hours.toFixed(1)}h
                                  </Table.Td>
                                  <Table.Td>
                                    <Stack gap={4}>
                                      {person.absence_days > 0 && (
                                        <Tooltip
                                          label={`${person.absence_hours.toFixed(0)}h deducted from capacity`}
                                          withArrow
                                        >
                                          <Badge
                                            size="sm"
                                            variant="light"
                                            color="blue"
                                          >
                                            {person.absence_days}d absent
                                          </Badge>
                                        </Tooltip>
                                      )}
                                      {person.overhead_hours > 0 && (
                                        <Badge
                                          size="sm"
                                          variant="light"
                                          color="orange"
                                        >
                                          {person.overhead_hours.toFixed(0)}h
                                          overhead
                                        </Badge>
                                      )}
                                      {person.absence_days === 0 &&
                                        person.overhead_hours === 0 && (
                                          <Text size="sm" c="dimmed">
                                            —
                                          </Text>
                                        )}
                                    </Stack>
                                  </Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        </div>
                        <Group gap="lg">
                          <div>
                            <Text size="sm" c="dimmed">
                              Total Effective Hours
                            </Text>
                            <Text size="lg" fw={500} className="numeric-data">
                              {project.total_effective_hours.toFixed(1)}h /{" "}
                              {project.required_hours.toFixed(0)}h
                            </Text>
                          </div>
                          <div>
                            <Text size="sm" c="dimmed">
                              Total Allocated Hours
                            </Text>
                            <Text size="lg" fw={500} className="numeric-data">
                              {project.total_allocated_hours.toFixed(1)}h
                            </Text>
                          </div>
                        </Group>
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            </div>

            {/* Warnings */}
            {(overview.over_committed_people > 0 ||
              overview.under_staffed_projects > 0) && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                title="Action Required"
                color="orange"
              >
                <Stack gap="xs">
                  {overview.over_committed_people > 0 && (
                    <Text size="sm">
                      • {overview.over_committed_people} people are at or near
                      capacity (≥85% allocation)
                    </Text>
                  )}
                  {overview.under_staffed_projects > 0 && (
                    <Text size="sm">
                      • {overview.under_staffed_projects} projects are
                      under-staffed and may not be viable
                    </Text>
                  )}
                  <Text size="sm" mt="xs" c="dimmed">
                    Run optimization to recalculate allocations, or adjust
                    assignments manually.
                  </Text>
                </Stack>
              </Alert>
            )}
          </>
        )}

        {!overview && !loading && (
          <Alert icon={<IconAlertCircle size={16} />} title="No Data">
            <Text size="sm">
              No assignments found for this planning period. Create assignments
              in the Assignments tab, then run optimization to see capacity
              analysis.
            </Text>
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}
