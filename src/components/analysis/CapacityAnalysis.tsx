import { useEffect, useState } from 'react';
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
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { 
  IconChartBar, 
  IconCalculator, 
  IconAlertCircle, 
  IconCheck,
  IconAlertTriangle,
  IconX,
} from '@tabler/icons-react';
import { optimizeAssignments, getCapacityOverview } from '../../lib/tauri';
import type { CapacityOverview, OptimizationResult } from '../../types';

interface CapacityAnalysisProps {
  periodId: number;
}

export function CapacityAnalysis({ periodId }: CapacityAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [overview, setOverview] = useState<CapacityOverview | null>(null);
  const [lastOptimization, setLastOptimization] = useState<OptimizationResult | null>(null);

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
        title: 'Error',
        message: 'Failed to load capacity overview',
        color: 'red',
      });
      console.error('Failed to load capacity overview:', error);
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
          title: 'Optimization Complete',
          message: `Calculated allocations for ${result.calculations.length} assignments`,
          color: 'green',
        });
        
        // Show warnings if any
        if (result.warnings.length > 0) {
          notifications.show({
            title: 'Warnings',
            message: result.warnings.join(', '),
            color: 'yellow',
          });
        }
        
        // Reload overview with new data
        await loadOverview();
      } else {
        notifications.show({
          title: 'Optimization Failed',
          message: 'Failed to calculate optimal allocations',
          color: 'red',
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to run optimization',
        color: 'red',
      });
      console.error('Failed to run optimization:', error);
    } finally {
      setOptimizing(false);
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 100) return 'red';    // Should rarely happen with new algorithm
    if (utilization >= 85) return 'yellow'; // At/near capacity
    return 'green';                          // OK
  };

  const getStaffingColor = (percentage: number) => {
    if (percentage >= 100) return 'green';
    if (percentage >= 80) return 'yellow';
    return 'red';
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
            icon={lastOptimization.success ? <IconCheck size={16} /> : <IconX size={16} />}
            title={lastOptimization.success ? "Optimization Successful" : "Optimization Failed"}
            color={lastOptimization.success ? "green" : "red"}
          >
            <Text size="sm">
              {lastOptimization.success 
                ? `Calculated allocations for ${lastOptimization.calculations.length} assignments`
                : "Failed to calculate optimal allocations"
              }
            </Text>
            {lastOptimization.infeasible_projects.length > 0 && (
              <Text size="sm" mt="xs">
                <strong>Infeasible Projects:</strong> {lastOptimization.infeasible_projects.length}
              </Text>
            )}
            {lastOptimization.warnings.length > 0 && (
              <Text size="sm" mt="xs">
                <strong>Warnings:</strong> {lastOptimization.warnings.join(', ')}
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
                  <Text size="sm" c="dimmed">Total People</Text>
                  <Title order={2}>{overview.total_people}</Title>
                </Card>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Card withBorder>
                  <Text size="sm" c="dimmed">Total Projects</Text>
                  <Title order={2}>{overview.total_projects}</Title>
                </Card>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Card withBorder>
                  <Text size="sm" c="dimmed">At/Near Capacity People</Text>
                  <Title order={2} c={overview.over_committed_people > 0 ? 'yellow' : 'green'}>
                    {overview.over_committed_people}
                  </Title>
                </Card>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Card withBorder>
                  <Text size="sm" c="dimmed">Under-Staffed Projects</Text>
                  <Title order={2} c={overview.under_staffed_projects > 0 ? 'red' : 'green'}>
                    {overview.under_staffed_projects}
                  </Title>
                </Card>
              </Grid.Col>
            </Grid>

            {/* People Capacity */}
            <div>
              <Title order={3} mb="md">People Capacity</Title>
              <Accordion variant="contained">
                {overview.people_capacity.map((person) => (
                  <Accordion.Item key={person.person_id} value={person.person_id.toString()}>
                    <Accordion.Control>
                      <Group justify="space-between" wrap="nowrap">
                        <div>
                          <Text fw={500}>{person.person_name}</Text>
                          <Text size="sm" c="dimmed">
                            {person.total_available_hours.toFixed(0)}h available
                          </Text>
                        </div>
                        <Group gap="md" wrap="nowrap">
                          <div style={{ width: 200 }}>
                            <Progress 
                              value={person.utilization_percentage} 
                              color={getUtilizationColor(person.utilization_percentage)}
                              size="lg"
                            />
                            <Text size="xs" ta="center" mt={4}>
                              {person.utilization_percentage.toFixed(1)}% utilized
                            </Text>
                          </div>
                          <Badge 
                            color={
                              person.utilization_percentage > 100 ? 'red' :    // Over-committed (rare)
                              person.utilization_percentage >= 85 ? 'yellow' : // At capacity
                              'green'                                           // OK
                            }
                            variant="filled"
                          >
                            {person.utilization_percentage > 100 ? 'Over-Committed' :
                             person.utilization_percentage >= 85 ? 'At Capacity' : 
                             'OK'}
                          </Badge>
                        </Group>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="md">
                        <div>
                          <Text size="sm" fw={500}>Assignments:</Text>
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
                                   <Table.Td>{assignment.allocation_percentage.toFixed(1)}%</Table.Td>
                                   <Table.Td>{assignment.effective_hours.toFixed(1)}h</Table.Td>
                                  <Table.Td>
                                    {assignment.is_pinned && (
                                      <Badge size="sm" variant="light">Pinned</Badge>
                                    )}
                                  </Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        </div>
                        <Group gap="lg">
                          <div>
                            <Text size="sm" c="dimmed">Total Effective Hours</Text>
                            <Text size="lg" fw={500}>
                              {person.total_effective_hours.toFixed(1)}h
                            </Text>
                          </div>
                          <div>
                            <Text size="sm" c="dimmed">Total Allocated Hours</Text>
                            <Text size="lg" fw={500}>
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
              <Title order={3} mb="md">Project Staffing</Title>
              <Accordion variant="contained">
                {overview.project_staffing.map((project) => (
                  <Accordion.Item key={project.project_id} value={project.project_id.toString()}>
                    <Accordion.Control>
                      <Group justify="space-between" wrap="nowrap">
                        <div>
                          <Text fw={500}>{project.project_name}</Text>
                          <Text size="sm" c="dimmed">
                            {project.required_hours.toFixed(0)}h required
                          </Text>
                        </div>
                        <Group gap="md" wrap="nowrap">
                          <div style={{ width: 200 }}>
                            <Progress 
                              value={Math.min(project.staffing_percentage, 100)} 
                              color={getStaffingColor(project.staffing_percentage)}
                              size="lg"
                            />
                            <Text size="xs" ta="center" mt={4}>
                              {project.staffing_percentage.toFixed(1)}% staffed
                            </Text>
                          </div>
                          <Badge 
                            color={getStaffingColor(project.staffing_percentage)}
                            variant="filled"
                            leftSection={getStaffingIcon(project.is_viable)}
                          >
                            {project.is_viable ? 'Viable' : 'Under-Staffed'}
                          </Badge>
                        </Group>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="md">
                        {!project.is_viable && (
                          <Alert icon={<IconAlertTriangle size={16} />} color="red">
                            <Text size="sm">
                              <strong>Shortfall:</strong> {project.shortfall.toFixed(1)}h needed
                              ({((project.shortfall / project.required_hours) * 100).toFixed(1)}% under capacity)
                            </Text>
                            <Text size="sm" mt="xs">
                              Consider assigning more people, increasing productivity factors, or reducing project scope.
                            </Text>
                          </Alert>
                        )}
                        <div>
                          <Text size="sm" fw={500}>Assigned People:</Text>
                          <Table mt="xs">
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>Person</Table.Th>
                                <Table.Th>Allocation</Table.Th>
                                <Table.Th>Productivity</Table.Th>
                                <Table.Th>Effective Hours</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {project.assigned_people.map((person) => (
                                <Table.Tr key={person.assignment_id}>
                                   <Table.Td>{person.person_name}</Table.Td>
                                   <Table.Td>{person.allocation_percentage.toFixed(1)}%</Table.Td>
                                   <Table.Td>{(person.productivity_factor * 100).toFixed(0)}%</Table.Td>
                                  <Table.Td>{person.effective_hours.toFixed(1)}h</Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        </div>
                        <Group gap="lg">
                          <div>
                            <Text size="sm" c="dimmed">Total Effective Hours</Text>
                            <Text size="lg" fw={500}>
                              {project.total_effective_hours.toFixed(1)}h / {project.required_hours.toFixed(0)}h
                            </Text>
                          </div>
                          <div>
                            <Text size="sm" c="dimmed">Total Allocated Hours</Text>
                            <Text size="lg" fw={500}>
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
            {(overview.over_committed_people > 0 || overview.under_staffed_projects > 0) && (
              <Alert 
                icon={<IconAlertCircle size={16} />} 
                title="Action Required" 
                color="orange"
              >
                <Stack gap="xs">
                  {overview.over_committed_people > 0 && (
                    <Text size="sm">
                      • {overview.over_committed_people} people are at or near capacity (≥85% allocation)
                    </Text>
                  )}
                  {overview.under_staffed_projects > 0 && (
                    <Text size="sm">
                      • {overview.under_staffed_projects} projects are under-staffed and may not be viable
                    </Text>
                  )}
                  <Text size="sm" mt="xs" c="dimmed">
                    Run optimization to recalculate allocations, or adjust assignments manually.
                  </Text>
                </Stack>
              </Alert>
            )}
          </>
        )}

        {!overview && !loading && (
          <Alert icon={<IconAlertCircle size={16} />} title="No Data">
            <Text size="sm">
              No assignments found for this planning period. 
              Create assignments in the Assignments tab, then run optimization to see capacity analysis.
            </Text>
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}
