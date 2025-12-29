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
import { PersonList } from "../components/people/PersonList";
import { PersonForm } from "../components/people/PersonForm";
import {
  listPeople,
  createPerson,
  updatePerson,
  deletePerson,
  checkPersonDependencies,
} from "../lib/tauri";
import type { Person, CreatePersonInput } from "../types";

export function PeopleManagementPage() {
  const navigate = useNavigate();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpened, setFormOpened] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  useEffect(() => {
    loadPeople();
  }, []);

  const loadPeople = async () => {
    try {
      setLoading(true);
      const data = await listPeople();
      setPeople(data);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to load people",
        color: "red",
      });
      console.error("Failed to load people:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: CreatePersonInput) => {
    try {
      await createPerson(values);
      await loadPeople();
      notifications.show({
        title: "Success",
        message: "Person created successfully",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to create person",
        color: "red",
      });
      throw error;
    }
  };

  const handleUpdate = async (values: CreatePersonInput) => {
    if (!selectedPerson) return;

    try {
      await updatePerson(selectedPerson.id, values);
      await loadPeople();
      notifications.show({
        title: "Success",
        message: "Person updated successfully",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to update person",
        color: "red",
      });
      throw error;
    }
  };

  const handleDelete = async (id: number) => {
    const person = people.find((p) => p.id === id);
    if (!person) return;

    try {
      const deps = await checkPersonDependencies(id);

      modals.openConfirmModal({
        title: "Delete Person",
        centered: true,
        children: (
          <Stack gap="sm">
            <Text size="sm">
              Are you sure you want to delete <strong>{person.name}</strong>?
            </Text>
            {deps.assignment_count > 0 && (
              <Alert color="orange" icon={<IconAlertTriangle size={16} />}>
                This person has {deps.assignment_count} active assignment(s)
                which will also be deleted.
              </Alert>
            )}
            {deps.absence_count > 0 && (
              <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
                This will also delete {deps.absence_count} absence record(s).
              </Alert>
            )}
            {(deps.assignment_count > 0 || deps.absence_count > 0) && (
              <Alert color="blue">
                Capacity calculations will be invalidated and need to be
                recalculated.
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
            await deletePerson(id);
            await loadPeople();
            notifications.show({
              title: "Success",
              message: "Person deleted successfully",
              color: "green",
            });
            if (deps.assignment_count > 0) {
              notifications.show({
                title: "Recalculation Needed",
                message:
                  "Please recalculate capacity allocations in the Analysis tab.",
                color: "yellow",
                autoClose: 5000,
              });
            }
          } catch (error) {
            notifications.show({
              title: "Error",
              message: "Failed to delete person",
              color: "red",
            });
            console.error("Failed to delete person:", error);
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

  const handleEdit = (person: Person) => {
    setSelectedPerson(person);
    setFormOpened(true);
  };

  const handleView = (personId: number) => {
    navigate(`/people/${personId}`);
  };

  const handleCloseForm = () => {
    setFormOpened(false);
    setSelectedPerson(null);
  };

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <Title order={1}>People Management</Title>
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => setFormOpened(true)}
          >
            Add Person
          </Button>
        </Group>

        <Paper shadow="xs" p="md" pos="relative">
          <LoadingOverlay visible={loading} />
          <PersonList
            people={people}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
          />
        </Paper>
      </Stack>

      <PersonForm
        opened={formOpened}
        onClose={handleCloseForm}
        onSubmit={selectedPerson ? handleUpdate : handleCreate}
        person={selectedPerson}
        title={selectedPerson ? "Edit Person" : "Create Person"}
      />
    </Container>
  );
}
