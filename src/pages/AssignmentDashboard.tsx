import { useEffect, useState } from "react";
import {
  Container,
  Title,
  Button,
  Stack,
  Group,
  LoadingOverlay,
  Paper,
  Select,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { IconPlus } from "@tabler/icons-react";
import { AssignmentList } from "../components/assignments/AssignmentList";
import { AssignmentForm } from "../components/assignments/AssignmentForm";
import {
  listPlanningPeriods,
  listAssignments,
  listPeople,
  listProjects,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from "../lib/tauri";
import type {
  Assignment,
  CreateAssignmentInput,
  PlanningPeriod,
  Person,
  Project,
} from "../types";

export function AssignmentDashboardPage() {
  const [planningPeriods, setPlanningPeriods] = useState<PlanningPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpened, setFormOpened] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedPeriodId !== null) {
      loadAssignments();
    }
  }, [selectedPeriodId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [periodsData, peopleData, projectsData] = await Promise.all([
        listPlanningPeriods(),
        listPeople(),
        listProjects(),
      ]);

      setPlanningPeriods(periodsData);
      setPeople(peopleData);
      setProjects(projectsData);

      // Auto-select first period if available
      if (periodsData.length > 0) {
        setSelectedPeriodId(periodsData[0].id);
      }
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to load data",
        color: "red",
      });
      console.error("Failed to load initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    if (selectedPeriodId === null) return;

    try {
      setLoading(true);
      const data = await listAssignments(selectedPeriodId);
      setAssignments(data);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to load assignments",
        color: "red",
      });
      console.error("Failed to load assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: CreateAssignmentInput) => {
    try {
      await createAssignment(values);
      await loadAssignments();
      notifications.show({
        title: "Success",
        message: "Assignment created successfully",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to create assignment",
        color: "red",
      });
      throw error;
    }
  };

  const handleUpdate = async (values: CreateAssignmentInput) => {
    if (!selectedAssignment) return;

    try {
      await updateAssignment(selectedAssignment.id, values);
      await loadAssignments();
      notifications.show({
        title: "Success",
        message: "Assignment updated successfully",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to update assignment",
        color: "red",
      });
      throw error;
    }
  };

  const handleDelete = async (id: number) => {
    modals.openConfirmModal({
      title: "Delete Assignment",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete this assignment? This action cannot be
          undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteAssignment(id);
          await loadAssignments();
          notifications.show({
            title: "Success",
            message: "Assignment deleted successfully",
            color: "green",
          });
        } catch (error) {
          notifications.show({
            title: "Error",
            message: "Failed to delete assignment",
            color: "red",
          });
          console.error("Failed to delete assignment:", error);
        }
      },
    });
  };

  const handleEdit = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setFormOpened(true);
  };

  const handleCloseForm = () => {
    setFormOpened(false);
    setSelectedAssignment(null);
  };

  const selectedPeriod = planningPeriods.find((p) => p.id === selectedPeriodId);
  const periodOptions = planningPeriods.map((period) => ({
    value: period.id.toString(),
    label: `${period.name} (${new Date(period.start_date).toLocaleDateString()} - ${new Date(period.end_date).toLocaleDateString()})`,
  }));

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={1}>Assignment Dashboard</Title>
            <Text size="sm" c="dimmed" mt="xs">
              Assign people to projects within planning periods and calculate
              optimal allocations.
            </Text>
          </div>
        </Group>

        <Paper shadow="xs" p="md">
          <Group justify="space-between" mb="md">
            <Select
              label="Planning Period"
              placeholder="Select a planning period"
              data={periodOptions}
              value={selectedPeriodId?.toString() || null}
              onChange={(value) =>
                setSelectedPeriodId(value ? parseInt(value) : null)
              }
              style={{ width: 400 }}
              disabled={planningPeriods.length === 0}
            />

            {selectedPeriod && (
              <Button
                leftSection={<IconPlus size={18} />}
                onClick={() => setFormOpened(true)}
                mt="xl"
              >
                Add Assignment
              </Button>
            )}
          </Group>

          {selectedPeriod ? (
            <Paper pos="relative">
              <LoadingOverlay visible={loading} />
              <AssignmentList
                assignments={assignments}
                people={people}
                projects={projects}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </Paper>
          ) : (
            <Text c="dimmed" ta="center" py="xl">
              {planningPeriods.length === 0
                ? "No planning periods available. Please create a planning period first."
                : "Please select a planning period to view assignments."}
            </Text>
          )}
        </Paper>
      </Stack>

      {selectedPeriod && (
        <AssignmentForm
          opened={formOpened}
          onClose={handleCloseForm}
          onSubmit={selectedAssignment ? handleUpdate : handleCreate}
          assignment={selectedAssignment}
          planningPeriod={selectedPeriod}
          title={selectedAssignment ? "Edit Assignment" : "Create Assignment"}
        />
      )}
    </Container>
  );
}
