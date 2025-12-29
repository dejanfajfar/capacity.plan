import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Title,
  Text,
  Tabs,
  LoadingOverlay,
  Group,
  Button,
  Paper,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconInfoCircle,
  IconCalendar,
  IconArrowLeft,
} from "@tabler/icons-react";
import { listPeople, updatePerson } from "../lib/tauri";
import type { Person, CreatePersonInput } from "../types";
import { PersonOverview } from "../components/person/PersonOverview";
import { AbsenceManager } from "../components/absences/AbsenceManager";
import { PersonForm } from "../components/people/PersonForm";

export function PersonDetailPage() {
  const { personId } = useParams<{ personId: string }>();
  const navigate = useNavigate();
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>("overview");
  const [formOpened, setFormOpened] = useState(false);

  useEffect(() => {
    loadPerson();
  }, [personId]);

  const loadPerson = async () => {
    if (!personId) return;

    try {
      setLoading(true);
      const people = await listPeople();
      const found = people.find((p) => p.id === parseInt(personId));

      if (!found) {
        notifications.show({
          title: "Error",
          message: "Person not found",
          color: "red",
        });
        navigate("/people");
        return;
      }

      setPerson(found);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to load person",
        color: "red",
      });
      console.error("Failed to load person:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setFormOpened(true);
  };

  const handleUpdate = async (values: CreatePersonInput) => {
    if (!person) return;

    try {
      await updatePerson(person.id, values);
      await loadPerson();
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

  const handleCloseForm = () => {
    setFormOpened(false);
  };

  if (!personId) {
    return <Text>Invalid person ID</Text>;
  }

  return (
    <Container size="xl" py="md">
      <Paper pos="relative" p="md">
        <LoadingOverlay visible={loading} />

        {person && (
          <>
            <Group justify="space-between" mb="lg">
              <div>
                <Group gap="sm" mb="xs">
                  <Button
                    variant="subtle"
                    leftSection={<IconArrowLeft size={16} />}
                    onClick={() => navigate("/people")}
                    size="sm"
                  >
                    Back to People
                  </Button>
                </Group>
                <Title order={1}>{person.name}</Title>
                <Text size="sm" c="dimmed" mt="xs">
                  {person.email}
                </Text>
              </div>
            </Group>

            <Tabs value={activeTab} onChange={setActiveTab}>
              <Tabs.List>
                <Tabs.Tab
                  value="overview"
                  leftSection={<IconInfoCircle size={16} />}
                >
                  Overview
                </Tabs.Tab>
                <Tabs.Tab
                  value="absences"
                  leftSection={<IconCalendar size={16} />}
                >
                  Absences
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="overview" pt="lg">
                <PersonOverview person={person} onEdit={handleEdit} />
              </Tabs.Panel>

              <Tabs.Panel value="absences" pt="lg">
                <AbsenceManager personId={person.id} />
              </Tabs.Panel>
            </Tabs>
          </>
        )}
      </Paper>

      {person && (
        <PersonForm
          opened={formOpened}
          onClose={handleCloseForm}
          onSubmit={handleUpdate}
          person={person}
          title="Edit Person"
        />
      )}
    </Container>
  );
}
