import { useState } from 'react';
import {
  TextInput,
  Button,
  Modal,
  Group,
  Stack,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import type { PlanningPeriod, CreatePlanningPeriodInput } from '../../types';

interface PlanningPeriodFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: CreatePlanningPeriodInput) => Promise<void>;
  period?: PlanningPeriod | null;
  title: string;
}

export function PlanningPeriodForm({ opened, onClose, onSubmit, period, title }: PlanningPeriodFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<CreatePlanningPeriodInput>({
    initialValues: {
      name: period?.name || '',
      start_date: period?.start_date || new Date().toISOString().split('T')[0],
      end_date: period?.end_date || new Date().toISOString().split('T')[0],
    },
    validate: {
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

  const handleSubmit = async (values: CreatePlanningPeriodInput) => {
    setLoading(true);
    try {
      await onSubmit(values);
      form.reset();
      onClose();
    } catch (error) {
      console.error('Failed to save planning period:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Name (optional)"
            placeholder="e.g., Q1 2024, Spring Planning"
            {...form.getInputProps('name')}
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

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {period ? 'Update' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
