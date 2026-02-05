import { useState } from "react";
import {
  Table,
  ActionIcon,
  Group,
  Text,
  Badge,
  Collapse,
  Button,
  Stack,
  Paper,
  Tooltip,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronRight,
  IconEdit,
  IconTrash,
  IconPlus,
} from "@tabler/icons-react";
import type { Job, JobOverheadTask } from "../../types";

interface JobExpandableTableProps {
  jobs: Job[];
  tasks: Map<number, JobOverheadTask[]>;
  onEditJob: (job: Job) => void;
  onDeleteJob: (job: Job) => void;
  onAddTask: (job: Job) => void;
  onEditTask: (task: JobOverheadTask) => void;
  onDeleteTask: (task: JobOverheadTask) => void;
  onExpandJob: (jobId: number) => void;
}

export function JobExpandableTable({
  jobs,
  tasks,
  onEditJob,
  onDeleteJob,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onExpandJob,
}: JobExpandableTableProps) {
  const [expandedJobs, setExpandedJobs] = useState<Set<number>>(new Set());

  const toggleExpand = (jobId: number) => {
    const newExpanded = new Set(expandedJobs);
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId);
    } else {
      newExpanded.add(jobId);
      onExpandJob(jobId);
    }
    setExpandedJobs(newExpanded);
  };

  const formatEffort = (task: JobOverheadTask) => {
    return `${task.effort_hours}h / ${task.effort_period}`;
  };

  // Calculate total overhead hours per week for a job
  const calculateWeeklyOverhead = (jobTasks: JobOverheadTask[]) => {
    let total = 0;
    for (const task of jobTasks) {
      if (task.effort_period === "weekly") {
        total += task.effort_hours;
      } else if (task.effort_period === "daily") {
        total += task.effort_hours * 5; // Assuming 5-day work week
      }
    }
    return total;
  };

  if (jobs.length === 0) {
    return (
      <Paper p="xl" ta="center" c="dimmed">
        <Text>
          No jobs defined yet. Click "Add Job" to create your first job
          template.
        </Text>
      </Paper>
    );
  }

  return (
    <Table highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th style={{ width: 40 }}></Table.Th>
          <Table.Th>Job Name</Table.Th>
          <Table.Th>Description</Table.Th>
          <Table.Th style={{ width: 120 }}>Weekly Overhead</Table.Th>
          <Table.Th style={{ width: 120 }}>Tasks</Table.Th>
          <Table.Th style={{ width: 100 }}>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {jobs.map((job) => {
          const jobTasks = tasks.get(job.id) || [];
          const isExpanded = expandedJobs.has(job.id);
          const weeklyOverhead = calculateWeeklyOverhead(jobTasks);

          return (
            <>
              <Table.Tr
                key={job.id}
                style={{ cursor: "pointer" }}
                onClick={() => toggleExpand(job.id)}
              >
                <Table.Td>
                  <ActionIcon variant="subtle" size="sm">
                    {isExpanded ? (
                      <IconChevronDown size={16} />
                    ) : (
                      <IconChevronRight size={16} />
                    )}
                  </ActionIcon>
                </Table.Td>
                <Table.Td>
                  <Text fw={500}>{job.name}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed" lineClamp={1}>
                    {job.description || "-"}
                  </Text>
                </Table.Td>
                <Table.Td>
                  {weeklyOverhead > 0 ? (
                    <Badge color="blue" variant="light">
                      {weeklyOverhead}h/week
                    </Badge>
                  ) : (
                    <Text size="sm" c="dimmed">
                      -
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Badge variant="outline">{jobTasks.length} tasks</Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" onClick={(e) => e.stopPropagation()}>
                    <Tooltip label="Edit Job">
                      <ActionIcon
                        variant="subtle"
                        onClick={() => onEditJob(job)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete Job">
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => onDeleteJob(job)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>

              {/* Expanded content - Task list */}
              <Table.Tr key={`${job.id}-tasks`}>
                <Table.Td colSpan={6} p={0}>
                  <Collapse in={isExpanded}>
                    <Paper p="md" ml="xl" mr="md" mb="md" withBorder>
                      <Stack gap="sm">
                        <Group justify="space-between">
                          <Text size="sm" fw={500}>
                            Overhead Tasks
                          </Text>
                          <Button
                            size="xs"
                            variant="light"
                            leftSection={<IconPlus size={14} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddTask(job);
                            }}
                          >
                            Add Task
                          </Button>
                        </Group>

                        {jobTasks.length === 0 ? (
                          <Text size="sm" c="dimmed" ta="center" py="sm">
                            No overhead tasks defined for this job.
                          </Text>
                        ) : (
                          <Table>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>Task Name</Table.Th>
                                <Table.Th>Description</Table.Th>
                                <Table.Th style={{ width: 100 }}>
                                  Effort
                                </Table.Th>
                                <Table.Th style={{ width: 80 }}>
                                  Actions
                                </Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {jobTasks.map((task) => (
                                <Table.Tr key={task.id}>
                                  <Table.Td>{task.name}</Table.Td>
                                  <Table.Td>
                                    <Text size="sm" c="dimmed" lineClamp={1}>
                                      {task.description || "-"}
                                    </Text>
                                  </Table.Td>
                                  <Table.Td>
                                    <Badge size="sm" variant="light">
                                      {formatEffort(task)}
                                    </Badge>
                                  </Table.Td>
                                  <Table.Td>
                                    <Group gap="xs">
                                      <Tooltip label="Edit Task">
                                        <ActionIcon
                                          variant="subtle"
                                          size="sm"
                                          onClick={() => onEditTask(task)}
                                        >
                                          <IconEdit size={14} />
                                        </ActionIcon>
                                      </Tooltip>
                                      <Tooltip label="Delete Task">
                                        <ActionIcon
                                          variant="subtle"
                                          size="sm"
                                          color="red"
                                          onClick={() => onDeleteTask(task)}
                                        >
                                          <IconTrash size={14} />
                                        </ActionIcon>
                                      </Tooltip>
                                    </Group>
                                  </Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        )}
                      </Stack>
                    </Paper>
                  </Collapse>
                </Table.Td>
              </Table.Tr>
            </>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
