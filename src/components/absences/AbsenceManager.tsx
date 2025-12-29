import { useEffect, useState } from "react";
import {
  Button,
  Stack,
  Group,
  LoadingOverlay,
  Paper,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { IconPlus } from "@tabler/icons-react";
import { AbsenceList } from "./AbsenceList";
import { AbsenceForm } from "./AbsenceForm";
import {
  listAbsences,
  createAbsence,
  updateAbsence,
  deleteAbsence,
} from "../../lib/tauri";
import type { Absence, CreateAbsenceInput } from "../../types";

interface AbsenceManagerProps {
  personId: number;
}

export function AbsenceManager({ personId }: AbsenceManagerProps) {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpened, setFormOpened] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);

  useEffect(() => {
    loadAbsences();
  }, [personId]);

  const loadAbsences = async () => {
    try {
      setLoading(true);
      const absencesData = await listAbsences(personId);
      setAbsences(absencesData);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to load absences",
        color: "red",
      });
      console.error("Failed to load absences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: CreateAbsenceInput) => {
    try {
      await createAbsence(values);
      await loadAbsences();
      notifications.show({
        title: "Success",
        message: "Absence created successfully",
        color: "green",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create absence";
      notifications.show({
        title: "Error",
        message: errorMessage,
        color: "red",
      });
      throw error;
    }
  };

  const handleUpdate = async (values: CreateAbsenceInput) => {
    if (!selectedAbsence) return;

    try {
      await updateAbsence(selectedAbsence.id, values);
      await loadAbsences();
      notifications.show({
        title: "Success",
        message: "Absence updated successfully",
        color: "green",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update absence";
      notifications.show({
        title: "Error",
        message: errorMessage,
        color: "red",
      });
      throw error;
    }
  };

  const handleDelete = async (id: number) => {
    modals.openConfirmModal({
      title: "Delete Absence",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete this absence? This action cannot be
          undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteAbsence(id);
          await loadAbsences();
          notifications.show({
            title: "Success",
            message: "Absence deleted successfully",
            color: "green",
          });
        } catch (error) {
          notifications.show({
            title: "Error",
            message: "Failed to delete absence",
            color: "red",
          });
          console.error("Failed to delete absence:", error);
        }
      },
    });
  };

  const handleEdit = (absence: Absence) => {
    setSelectedAbsence(absence);
    setFormOpened(true);
  };

  const handleCloseForm = () => {
    setFormOpened(false);
    setSelectedAbsence(null);
  };

  return (
    <Stack gap="md">
      <Paper p="md" withBorder bg="blue.0">
        <Text size="sm" c="blue.9">
          Track time off, vacations, and other absences. Business days (Mon-Fri)
          are automatically calculated based on the date range.
        </Text>
      </Paper>

      <Paper p="md" withBorder pos="relative">
        <LoadingOverlay visible={loading} />

        <Group justify="space-between" mb="md">
          <Text fw={500} size="lg">
            Absences
          </Text>
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => setFormOpened(true)}
          >
            Add Absence
          </Button>
        </Group>

        <AbsenceList
          absences={absences}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </Paper>

      <AbsenceForm
        opened={formOpened}
        onClose={handleCloseForm}
        onSubmit={selectedAbsence ? handleUpdate : handleCreate}
        absence={selectedAbsence}
        personId={personId}
        title={selectedAbsence ? "Edit Absence" : "Create Absence"}
      />
    </Stack>
  );
}
