import { useState, useEffect } from 'react';
import {
  TextInput,
  Button,
  Modal,
  Group,
  Stack,
  NumberInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import type { Person, CreatePersonInput } from '../../types';

interface PersonFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: CreatePersonInput) => Promise<void>;
  person?: Person | null;
  title: string;
}

export function PersonForm({ opened, onClose, onSubmit, person, title }: PersonFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<CreatePersonInput>({
    initialValues: {
      name: '',
      email: '',
      available_hours_per_week: 40,
    },
    validate: {
      name: (value) => (!value ? 'Name is required' : null),
      email: (value) => (!value ? 'Email is required' : /^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      available_hours_per_week: (value) => 
        value <= 0 ? 'Available hours must be greater than 0' : 
        value > 168 ? 'Available hours cannot exceed 168 (hours in a week)' : null,
    },
  });

  // Update form values when modal opens or person changes
  useEffect(() => {
    if (opened) {
      if (person) {
        // Edit mode - populate with person's data
        form.setValues({
          name: person.name,
          email: person.email,
          available_hours_per_week: person.available_hours_per_week,
        });
        form.clearErrors();
      } else {
        // Create mode - reset to defaults
        form.reset();
      }
    }
  }, [opened, person]);

  const handleSubmit = async (values: CreatePersonInput) => {
    setLoading(true);
    try {
      await onSubmit(values);
      form.reset();
      onClose();
    } catch (error) {
      console.error('Failed to save person:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Name"
            placeholder="Enter person's name"
            required
            {...form.getInputProps('name')}
          />
          
          <TextInput
            label="Email"
            placeholder="person@example.com"
            required
            type="email"
            {...form.getInputProps('email')}
          />
          
          <NumberInput
            label="Available Hours per Week"
            placeholder="40"
            required
            min={0}
            max={168}
            step={1}
            {...form.getInputProps('available_hours_per_week')}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {person ? 'Update' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
