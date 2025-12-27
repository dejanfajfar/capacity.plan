import { useState } from 'react';
import {
  TextInput,
  Button,
  Modal,
  Group,
  Stack,
  NumberInput,
  Textarea,
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
    },
    validate: {
      name: (value) => (!value ? 'Name is required' : null),
      required_hours: (value) => (value <= 0 ? 'Required hours must be greater than 0' : null),
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
            placeholder="Target hours per planning period"
            description="This represents the hard requirement for this project in each planning period"
            required
            min={0}
            step={10}
            {...form.getInputProps('required_hours')}
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
