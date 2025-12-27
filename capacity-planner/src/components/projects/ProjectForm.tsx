import { useState } from 'react';
import {
  TextInput,
  Button,
  Modal,
  Group,
  Stack,
  NumberInput,
  Textarea,
  Select,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import type { Project, CreateProjectInput } from '../../types';

interface ProjectFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: CreateProjectInput) => Promise<void>;
  project?: Project | null;
  title: string;
}

export function ProjectForm({ opened, onClose, onSubmit, project, title }: ProjectFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<CreateProjectInput>({
    initialValues: {
      name: project?.name || '',
      description: project?.description || '',
      required_hours: project?.required_hours || 0,
      start_date: project?.start_date || new Date().toISOString().split('T')[0],
      end_date: project?.end_date || new Date().toISOString().split('T')[0],
      status: project?.status || 'planned',
    },
    validate: {
      name: (value) => (!value ? 'Name is required' : null),
      required_hours: (value) => (value <= 0 ? 'Required hours must be greater than 0' : null),
      start_date: (value) => (!value ? 'Start date is required' : null),
      end_date: (value, values) => {
        if (!value) return 'End date is required';
        if (values.start_date && new Date(value) < new Date(values.start_date)) {
          return 'End date must be after start date';
        }
        return null;
      },
    },
  });

  const handleSubmit = async (values: CreateProjectInput) => {
    setLoading(true);
    try {
      await onSubmit(values);
      form.reset();
      onClose();
    } catch (error) {
      console.error('Failed to save project:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="lg">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Project Name"
            placeholder="Enter project name"
            required
            {...form.getInputProps('name')}
          />
          
          <Textarea
            label="Description"
            placeholder="Enter project description"
            rows={3}
            {...form.getInputProps('description')}
          />
          
          <NumberInput
            label="Required Hours"
            placeholder="Total hours needed for the project"
            required
            min={0}
            step={10}
            {...form.getInputProps('required_hours')}
          />

          <Group grow>
            <TextInput
              label="Start Date"
              type="date"
              required
              {...form.getInputProps('start_date')}
            />
            
            <TextInput
              label="End Date"
              type="date"
              required
              {...form.getInputProps('end_date')}
            />
          </Group>

          <Select
            label="Status"
            placeholder="Select project status"
            data={[
              { value: 'planned', label: 'Planned' },
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Completed' },
            ]}
            {...form.getInputProps('status')}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {project ? 'Update' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
