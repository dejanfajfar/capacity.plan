import { useEffect, useState } from "react";
import {
  Container,
  Title,
  Button,
  Stack,
  Group,
  LoadingOverlay,
  Paper,
  Text,
  Alert,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { IconPlus, IconAlertTriangle } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { PlanningPeriodList } from "../components/planning/PlanningPeriodList";
import { PlanningPeriodForm } from "../components/planning/PlanningPeriodForm";
import {
  listPlanningPeriods,
  createPlanningPeriod,
  updatePlanningPeriod,
  deletePlanningPeriod,
  checkPlanningPeriodDependencies,
} from "../lib/tauri";
import type { PlanningPeriod, CreatePlanningPeriodInput } from "../types";

export function PlanningSetupPage() {
  const navigate = useNavigate();
  const [periods, setPeriods] = useState<PlanningPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpened, setFormOpened] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PlanningPeriod | null>(
    null,
  );

  useEffect(() => {
    loadPeriods();
  }, []);

  const loadPeriods = async () => {
    try {
      setLoading(true);
      const data = await listPlanningPeriods();
      setPeriods(data);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to load planning periods",
        color: "red",
      });
      console.error("Failed to load planning periods:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: CreatePlanningPeriodInput) => {
    try {
      await createPlanningPeriod(values);
      await loadPeriods();
      notifications.show({
        title: "Success",
        message: "Planning period created successfully",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to create planning period",
        color: "red",
      });
      throw error;
    }
  };

  const handleUpdate = async (values: CreatePlanningPeriodInput) => {
    if (!selectedPeriod) return;

    try {
      await updatePlanningPeriod(selectedPeriod.id, values);
      await loadPeriods();
      notifications.show({
        title: "Success",
        message: "Planning period updated successfully",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to update planning period",
        color: "red",
      });
      throw error;
    }
  };

  const handleDelete = async (id: number) => {
    const period = periods.find((p) => p.id === id);
    if (!period) return;

    try {
      const deps = await checkPlanningPeriodDependencies(id);

      modals.openConfirmModal({
        title: "Delete Planning Period",
        centered: true,
        children: (
          <Stack gap="sm">
            <Text size="sm">
              Are you sure you want to delete{" "}
              <strong>{period.name || "this planning period"}</strong>?
            </Text>
            {deps.requirement_count > 0 && (
              <Alert color="orange" icon={<IconAlertTriangle size={16} />}>
                This will delete {deps.requirement_count} project requirement(s)
                defined for this period.
              </Alert>
            )}
            {deps.assignment_count > 0 && (
              <Alert color="orange" icon={<IconAlertTriangle size={16} />}>
                This will delete {deps.assignment_count} assignment(s) for this
                period.
              </Alert>
            )}
            {(deps.requirement_count > 0 || deps.assignment_count > 0) && (
              <Alert color="blue">
                All associated data will be permanently removed.
              </Alert>
            )}
            <Text size="sm" c="dimmed">
              This action cannot be undone.
            </Text>
          </Stack>
        ),
        labels: { confirm: "Delete", cancel: "Cancel" },
        confirmProps: { color: "red" },
        onConfirm: async () => {
          try {
            await deletePlanningPeriod(id);
            await loadPeriods();
            notifications.show({
              title: "Success",
              message: "Planning period deleted successfully",
              color: "green",
            });
          } catch (error) {
            notifications.show({
              title: "Error",
              message: "Failed to delete planning period",
              color: "red",
            });
            console.error("Failed to delete planning period:", error);
          }
        },
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to check dependencies",
        color: "red",
      });
      console.error("Failed to check dependencies:", error);
    }
  };

  const handleEdit = (period: PlanningPeriod) => {
    setSelectedPeriod(period);
    setFormOpened(true);
  };

  const handleView = (periodId: number) => {
    navigate(`/planning/${periodId}`);
  };

  const handleCloseForm = () => {
    setFormOpened(false);
    setSelectedPeriod(null);
  };

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <div>
          <Group justify="space-between" align="center" mb="xs">
            <Title order={1}>Planning Period Setup</Title>
            <Button
              leftSection={<IconPlus size={18} />}
              onClick={() => setFormOpened(true)}
            >
              Add Planning Period
            </Button>
          </Group>
          <Text c="dimmed" size="sm">
            Planning periods define the timeframes for capacity planning. Create
            periods like quarters, sprints, or custom date ranges.
          </Text>
        </div>

        <Paper shadow="xs" p="md" pos="relative">
          <LoadingOverlay visible={loading} />
          <PlanningPeriodList
            periods={periods}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
          />
        </Paper>
      </Stack>

      <PlanningPeriodForm
        opened={formOpened}
        onClose={handleCloseForm}
        onSubmit={selectedPeriod ? handleUpdate : handleCreate}
        period={selectedPeriod}
        title={
          selectedPeriod ? "Edit Planning Period" : "Create Planning Period"
        }
      />
    </Container>
  );
}
