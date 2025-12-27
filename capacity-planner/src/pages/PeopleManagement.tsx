import { useEffect, useState } from 'react';
import { Container, Title, Button, Stack, Group, LoadingOverlay, Paper } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import { PersonList } from '../components/people/PersonList';
import { PersonForm } from '../components/people/PersonForm';
import { listPeople, createPerson, updatePerson, deletePerson } from '../lib/tauri';
import type { Person, CreatePersonInput } from '../types';

export function PeopleManagementPage() {
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
        title: 'Error',
        message: 'Failed to load people',
        color: 'red',
      });
      console.error('Failed to load people:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: CreatePersonInput) => {
    try {
      await createPerson(values);
      await loadPeople();
      notifications.show({
        title: 'Success',
        message: 'Person created successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to create person',
        color: 'red',
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
        title: 'Success',
        message: 'Person updated successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update person',
        color: 'red',
      });
      throw error;
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this person?')) return;

    try {
      await deletePerson(id);
      await loadPeople();
      notifications.show({
        title: 'Success',
        message: 'Person deleted successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete person',
        color: 'red',
      });
      console.error('Failed to delete person:', error);
    }
  };

  const handleEdit = (person: Person) => {
    setSelectedPerson(person);
    setFormOpened(true);
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
          />
        </Paper>
      </Stack>

      <PersonForm
        opened={formOpened}
        onClose={handleCloseForm}
        onSubmit={selectedPerson ? handleUpdate : handleCreate}
        person={selectedPerson}
        title={selectedPerson ? 'Edit Person' : 'Create Person'}
      />
    </Container>
  );
}
