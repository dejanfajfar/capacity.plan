import { useEffect, useState } from "react";
import {
  Button,
  Stack,
  Group,
  LoadingOverlay,
  Paper,
  Text,
  Grid,
  Title,
  Divider,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { IconPlus } from "@tabler/icons-react";
import { OverheadList } from "./OverheadList";
import { OverheadForm } from "./OverheadForm";
import { OverheadAssignmentList } from "./OverheadAssignmentList";
import { OverheadAssignmentForm } from "./OverheadAssignmentForm";
import {
  listOverheads,
  listOverheadAssignments,
  listPeople,
  createOverhead,
  updateOverhead,
  deleteOverhead,
  createOverheadAssignment,
  updateOverheadAssignment,
  deleteOverheadAssignment,
} from "../../lib/tauri";
import type {
  Overhead,
  CreateOverheadInput,
  OverheadAssignment,
  CreateOverheadAssignmentInput,
  Person,
} from "../../types";

interface OverheadManagerProps {
  periodId: number;
}

export function OverheadManager({ periodId }: OverheadManagerProps) {
  const [overheads, setOverheads] = useState<Overhead[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  // Overhead form state
  const [overheadFormOpened, setOverheadFormOpened] = useState(false);
  const [selectedOverhead, setSelectedOverhead] = useState<Overhead | null>(
    null,
  );

  // Assignment state
  const [assignments, setAssignments] = useState<OverheadAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignmentFormOpened, setAssignmentFormOpened] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<OverheadAssignment | null>(null);

  useEffect(() => {
    loadData();
  }, [periodId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [overheadsData, peopleData] = await Promise.all([
        listOverheads(periodId),
        listPeople(),
      ]);

      setOverheads(overheadsData);
      setPeople(peopleData);

      // Auto-select first overhead if available
      if (overheadsData.length > 0 && !selectedOverhead) {
        handleSelectOverhead(overheadsData[0]);
      }
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to load overheads data",
        color: "red",
      });
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async (overheadId: number) => {
    try {
      setLoadingAssignments(true);
      const assignmentsData = await listOverheadAssignments(overheadId);
      setAssignments(assignmentsData);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to load assignments",
        color: "red",
      });
      console.error("Failed to load assignments:", error);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleSelectOverhead = (overhead: Overhead) => {
    setSelectedOverhead(overhead);
    loadAssignments(overhead.id);
  };

  // Overhead CRUD handlers
  const handleCreateOverhead = async (values: CreateOverheadInput) => {
    try {
      const newOverhead = await createOverhead(values);
      await loadData();
      setSelectedOverhead(newOverhead);
      await loadAssignments(newOverhead.id);
      notifications.show({
        title: "Success",
        message: "Overhead created successfully",
        color: "green",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create overhead";
      notifications.show({
        title: "Error",
        message: errorMessage,
        color: "red",
      });
      throw error;
    }
  };

  const handleUpdateOverhead = async (values: CreateOverheadInput) => {
    if (!selectedOverhead) return;

    try {
      await updateOverhead(selectedOverhead.id, values);
      await loadData();
      notifications.show({
        title: "Success",
        message: "Overhead updated successfully",
        color: "green",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update overhead";
      notifications.show({
        title: "Error",
        message: errorMessage,
        color: "red",
      });
      throw error;
    }
  };

  const handleDeleteOverhead = async (id: number) => {
    modals.openConfirmModal({
      title: "Delete Overhead",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete this overhead? This will also delete
          all person assignments. This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteOverhead(id);
          await loadData();
          setSelectedOverhead(null);
          setAssignments([]);
          notifications.show({
            title: "Success",
            message: "Overhead deleted successfully",
            color: "green",
          });
        } catch (error) {
          notifications.show({
            title: "Error",
            message: "Failed to delete overhead",
            color: "red",
          });
          console.error("Failed to delete overhead:", error);
        }
      },
    });
  };

  const handleEditOverhead = (overhead: Overhead) => {
    setSelectedOverhead(overhead);
    setOverheadFormOpened(true);
  };

  const handleCloseOverheadForm = () => {
    setOverheadFormOpened(false);
    // Don't clear selectedOverhead here, keep it for viewing assignments
  };

  // Assignment CRUD handlers
  const handleCreateAssignment = async (
    values: CreateOverheadAssignmentInput & { person_ids?: number[] },
  ) => {
    try {
      // Check if this is a multi-person assignment
      const personIds = values.person_ids || [values.person_id];

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Create assignment for each person
      for (const personId of personIds) {
        try {
          await createOverheadAssignment({
            overhead_id: values.overhead_id,
            person_id: personId,
            effort_hours: values.effort_hours,
            effort_period: values.effort_period,
          });
          successCount++;
        } catch (error) {
          failedCount++;
          const personName =
            people.find((p) => p.id === personId)?.name ||
            `Person #${personId}`;
          errors.push(personName);
          console.error(`Failed to assign ${personName}:`, error);
        }
      }

      // Reload assignments
      if (selectedOverhead) {
        await loadAssignments(selectedOverhead.id);
      }

      // Show success notification
      if (successCount > 0) {
        const message =
          successCount === 1
            ? "Person assigned successfully"
            : `Assigned ${successCount} ${successCount === 1 ? "person" : "people"} successfully`;

        notifications.show({
          title: "Success",
          message:
            failedCount > 0
              ? `${message}. Failed to assign: ${errors.join(", ")}`
              : message,
          color: failedCount > 0 ? "yellow" : "green",
        });
      }

      // If all failed, show error and throw
      if (failedCount === personIds.length) {
        throw new Error("Failed to assign any people to overhead");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to assign people to overhead";
      notifications.show({
        title: "Error",
        message: errorMessage,
        color: "red",
      });
      throw error;
    }
  };

  const handleUpdateAssignment = async (
    values: CreateOverheadAssignmentInput,
  ) => {
    if (!selectedAssignment) return;

    try {
      await updateOverheadAssignment(selectedAssignment.id, values);
      if (selectedOverhead) {
        await loadAssignments(selectedOverhead.id);
      }
      notifications.show({
        title: "Success",
        message: "Assignment updated successfully",
        color: "green",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update assignment";
      notifications.show({
        title: "Error",
        message: errorMessage,
        color: "red",
      });
      throw error;
    }
  };

  const handleDeleteAssignment = async (id: number) => {
    modals.openConfirmModal({
      title: "Remove Assignment",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to remove this person from the overhead? This
          action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Remove", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteOverheadAssignment(id);
          if (selectedOverhead) {
            await loadAssignments(selectedOverhead.id);
          }
          notifications.show({
            title: "Success",
            message: "Assignment removed successfully",
            color: "green",
          });
        } catch (error) {
          notifications.show({
            title: "Error",
            message: "Failed to remove assignment",
            color: "red",
          });
          console.error("Failed to delete assignment:", error);
        }
      },
    });
  };

  const handleEditAssignment = (assignment: OverheadAssignment) => {
    setSelectedAssignment(assignment);
    setAssignmentFormOpened(true);
  };

  const handleCloseAssignmentForm = () => {
    setAssignmentFormOpened(false);
    setSelectedAssignment(null);
  };

  if (people.length === 0 && !loading) {
    return (
      <Paper p="xl" ta="center" withBorder>
        <Text c="dimmed" size="lg">
          No people found. Create people first in the People menu.
        </Text>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      <Paper p="md" withBorder bg="orange.0">
        <Text size="sm" c="orange.9">
          Overheads are recurring tasks that reduce available capacity (e.g.,
          meetings, admin work). Define overheads, then assign people with their
          time commitment (daily or weekly).
        </Text>
      </Paper>

      <Grid gutter="md">
        {/* Left column: Overhead definitions */}
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Paper p="md" withBorder pos="relative">
            <LoadingOverlay visible={loading} />

            <Group justify="space-between" mb="md">
              <Title order={4}>Overhead Definitions</Title>
              <Button
                leftSection={<IconPlus size={18} />}
                onClick={() => {
                  setSelectedOverhead(null);
                  setOverheadFormOpened(true);
                }}
                size="sm"
              >
                Add Overhead
              </Button>
            </Group>

            <OverheadList
              overheads={overheads}
              onEdit={handleEditOverhead}
              onDelete={handleDeleteOverhead}
              onSelect={handleSelectOverhead}
              selectedOverheadId={selectedOverhead?.id}
            />
          </Paper>
        </Grid.Col>

        {/* Right column: Assignments for selected overhead */}
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Paper p="md" withBorder pos="relative">
            <LoadingOverlay visible={loadingAssignments} />

            {selectedOverhead ? (
              <>
                <Group justify="space-between" mb="md">
                  <div>
                    <Title order={4}>{selectedOverhead.name}</Title>
                    {selectedOverhead.description && (
                      <Text size="sm" c="dimmed" mt={4}>
                        {selectedOverhead.description}
                      </Text>
                    )}
                  </div>
                  <Button
                    leftSection={<IconPlus size={18} />}
                    onClick={() => setAssignmentFormOpened(true)}
                    size="sm"
                  >
                    Assign Person
                  </Button>
                </Group>

                <Divider mb="md" />

                <OverheadAssignmentList
                  assignments={assignments}
                  people={people}
                  onEdit={handleEditAssignment}
                  onDelete={handleDeleteAssignment}
                />
              </>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                Select an overhead from the left to manage assignments
              </Text>
            )}
          </Paper>
        </Grid.Col>
      </Grid>

      <OverheadForm
        opened={overheadFormOpened}
        onClose={handleCloseOverheadForm}
        onSubmit={
          overheadFormOpened && selectedOverhead
            ? handleUpdateOverhead
            : handleCreateOverhead
        }
        overhead={overheadFormOpened ? selectedOverhead : null}
        planningPeriodId={periodId}
        title={
          overheadFormOpened && selectedOverhead
            ? "Edit Overhead"
            : "Create Overhead"
        }
      />

      {selectedOverhead && (
        <OverheadAssignmentForm
          opened={assignmentFormOpened}
          onClose={handleCloseAssignmentForm}
          onSubmit={
            selectedAssignment ? handleUpdateAssignment : handleCreateAssignment
          }
          assignment={selectedAssignment}
          overheadId={selectedOverhead.id}
          existingAssignments={assignments}
          title={selectedAssignment ? "Edit Assignment" : "Assign Person"}
        />
      )}
    </Stack>
  );
}
