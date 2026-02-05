import { useState, useEffect, useCallback } from "react";
import {
  Paper,
  Title,
  Text,
  Button,
  Group,
  Table,
  ActionIcon,
  Badge,
  LoadingOverlay,
  MultiSelect,
  Modal,
  Stack,
  Select,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { IconPlus, IconTrash, IconBriefcase } from "@tabler/icons-react";
import {
  listJobs,
  listJobOverheadTasks,
  listPersonJobAssignments,
  listPeople,
  batchCreatePersonJobAssignments,
  deletePersonJobAssignment,
} from "../../lib/tauri";
import type {
  Job,
  JobOverheadTask,
  Person,
  PersonJobAssignmentWithDetails,
} from "../../types";

interface JobAssignmentManagerProps {
  periodId: number;
}

export function JobAssignmentManager({ periodId }: JobAssignmentManagerProps) {
  const [assignments, setAssignments] = useState<
    PersonJobAssignmentWithDetails[]
  >([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobTasks, setJobTasks] = useState<Map<number, JobOverheadTask[]>>(
    new Map(),
  );
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [assignmentList, jobList, peopleList] = await Promise.all([
        listPersonJobAssignments(periodId),
        listJobs(),
        listPeople(),
      ]);
      setAssignments(assignmentList);
      setJobs(jobList);
      setPeople(peopleList);

      // Load tasks for all jobs
      const tasksMap = new Map<number, JobOverheadTask[]>();
      for (const job of jobList) {
        const tasks = await listJobOverheadTasks(job.id);
        tasksMap.set(job.id, tasks);
      }
      setJobTasks(tasksMap);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to load data",
        color: "red",
      });
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const calculateWeeklyOverhead = (jobId: number) => {
    const tasks = jobTasks.get(jobId) || [];
    let total = 0;
    for (const task of tasks) {
      if (task.effort_period === "weekly") {
        total += task.effort_hours;
      } else if (task.effort_period === "daily") {
        total += task.effort_hours * 5;
      }
    }
    return total;
  };

  const handleAssignJobs = async () => {
    if (!selectedPersonId || selectedJobIds.length === 0) {
      notifications.show({
        title: "Error",
        message: "Please select a person and at least one job",
        color: "red",
      });
      return;
    }

    try {
      await batchCreatePersonJobAssignments(
        parseInt(selectedPersonId),
        selectedJobIds.map((id) => parseInt(id)),
        periodId,
      );
      notifications.show({
        title: "Success",
        message: "Jobs assigned successfully",
        color: "green",
      });
      setModalOpened(false);
      setSelectedPersonId(null);
      setSelectedJobIds([]);
      loadData();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: `Failed to assign jobs: ${error}`,
        color: "red",
      });
    }
  };

  const handleDeleteAssignment = (
    assignment: PersonJobAssignmentWithDetails,
  ) => {
    const person = people.find((p) => p.id === assignment.person_id);
    modals.openConfirmModal({
      title: "Remove Job Assignment",
      children: (
        <Text size="sm">
          Are you sure you want to remove "{assignment.job_name}" from{" "}
          {person?.name || "this person"} for this planning period?
        </Text>
      ),
      labels: { confirm: "Remove", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deletePersonJobAssignment(assignment.id);
          notifications.show({
            title: "Success",
            message: "Job assignment removed",
            color: "green",
          });
          loadData();
        } catch (error) {
          notifications.show({
            title: "Error",
            message: `Failed to remove assignment: ${error}`,
            color: "red",
          });
        }
      },
    });
  };

  // Get jobs already assigned to selected person
  const getAssignedJobIds = (personId: number) => {
    return assignments
      .filter((a) => a.person_id === personId)
      .map((a) => a.job_id.toString());
  };

  // Available jobs for assignment (exclude already assigned)
  const getAvailableJobs = () => {
    if (!selectedPersonId) return [];
    const assignedIds = getAssignedJobIds(parseInt(selectedPersonId));
    return jobs.filter((j) => !assignedIds.includes(j.id.toString()));
  };

  // Group assignments by person
  const assignmentsByPerson = people
    .map((person) => ({
      person,
      jobs: assignments.filter((a) => a.person_id === person.id),
    }))
    .filter((group) => group.jobs.length > 0);

  return (
    <Paper pos="relative" p="md">
      <LoadingOverlay visible={loading} />

      <Group justify="space-between" mb="lg">
        <div>
          <Title order={3}>Job Assignments</Title>
          <Text size="sm" c="dimmed">
            Assign jobs to people for this planning period
          </Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setModalOpened(true)}
          disabled={jobs.length === 0}
        >
          Assign Jobs
        </Button>
      </Group>

      {jobs.length === 0 ? (
        <Paper p="xl" ta="center" c="dimmed" withBorder>
          <IconBriefcase size={48} style={{ opacity: 0.5 }} />
          <Text mt="md">
            No jobs defined yet. Go to the Jobs page to create job templates
            first.
          </Text>
        </Paper>
      ) : assignmentsByPerson.length === 0 ? (
        <Paper p="xl" ta="center" c="dimmed" withBorder>
          <Text>
            No job assignments for this planning period. Click "Assign Jobs" to
            assign jobs to people.
          </Text>
        </Paper>
      ) : (
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Person</Table.Th>
              <Table.Th>Assigned Jobs</Table.Th>
              <Table.Th style={{ width: 150 }}>Total Weekly Overhead</Table.Th>
              <Table.Th style={{ width: 80 }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {assignmentsByPerson.map(({ person, jobs: personJobs }) => {
              const totalOverhead = personJobs.reduce(
                (sum, j) => sum + calculateWeeklyOverhead(j.job_id),
                0,
              );

              return (
                <Table.Tr key={person.id}>
                  <Table.Td>
                    <Text fw={500}>{person.name}</Text>
                    <Text size="xs" c="dimmed">
                      {person.email}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      {personJobs.map((assignment) => (
                        <Badge
                          key={assignment.id}
                          variant="light"
                          rightSection={
                            <ActionIcon
                              size="xs"
                              variant="transparent"
                              c="red"
                              onClick={() => handleDeleteAssignment(assignment)}
                            >
                              <IconTrash size={12} />
                            </ActionIcon>
                          }
                        >
                          {assignment.job_name}
                        </Badge>
                      ))}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge color="blue" variant="light">
                      {totalOverhead}h/week
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Tooltip label="Add more jobs">
                      <ActionIcon
                        variant="subtle"
                        onClick={() => {
                          setSelectedPersonId(person.id.toString());
                          setSelectedJobIds([]);
                          setModalOpened(true);
                        }}
                      >
                        <IconPlus size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}

      {/* Assign Jobs Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setSelectedPersonId(null);
          setSelectedJobIds([]);
        }}
        title="Assign Jobs"
        size="md"
      >
        <Stack gap="md">
          <Select
            label="Person"
            placeholder="Select a person"
            data={people.map((p) => ({
              value: p.id.toString(),
              label: p.name,
            }))}
            value={selectedPersonId}
            onChange={(value) => {
              setSelectedPersonId(value);
              setSelectedJobIds([]);
            }}
            searchable
            required
          />

          <MultiSelect
            label="Jobs to Assign"
            placeholder="Select jobs"
            data={getAvailableJobs().map((j) => ({
              value: j.id.toString(),
              label: `${j.name} (${calculateWeeklyOverhead(j.id)}h/week)`,
            }))}
            value={selectedJobIds}
            onChange={setSelectedJobIds}
            searchable
            disabled={!selectedPersonId}
          />

          {selectedJobIds.length > 0 && (
            <Paper p="sm" withBorder>
              <Text size="sm" fw={500} mb="xs">
                Selected Jobs Preview:
              </Text>
              {selectedJobIds.map((jobId) => {
                const job = jobs.find((j) => j.id === parseInt(jobId));
                const tasks = jobTasks.get(parseInt(jobId)) || [];
                return (
                  <div key={jobId}>
                    <Text size="sm" fw={500}>
                      {job?.name}
                    </Text>
                    {tasks.length > 0 ? (
                      <Text size="xs" c="dimmed" ml="sm">
                        Tasks:{" "}
                        {tasks
                          .map(
                            (t) =>
                              `${t.name} (${t.effort_hours}h/${t.effort_period})`,
                          )
                          .join(", ")}
                      </Text>
                    ) : (
                      <Text size="xs" c="dimmed" ml="sm">
                        No overhead tasks defined
                      </Text>
                    )}
                  </div>
                );
              })}
            </Paper>
          )}

          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setModalOpened(false);
                setSelectedPersonId(null);
                setSelectedJobIds([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignJobs}
              disabled={!selectedPersonId || selectedJobIds.length === 0}
            >
              Assign
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
}
