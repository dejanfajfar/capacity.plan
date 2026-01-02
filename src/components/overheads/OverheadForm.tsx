import { useState, useEffect } from "react";
import {
  TextInput,
  Button,
  Modal,
  Group,
  Stack,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconClock } from "@tabler/icons-react";
import type { Overhead, CreateOverheadInput } from "../../types";

interface OverheadFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: CreateOverheadInput) => Promise<void>;
  overhead?: Overhead | null;
  planningPeriodId: number;
  title: string;
}

export function OverheadForm({
  opened,
  onClose,
  onSubmit,
  overhead,
  planningPeriodId,
  title,
}: OverheadFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<CreateOverheadInput>({
    initialValues: {
      planning_period_id: planningPeriodId,
      name: "",
      description: "",
    },
    validate: {
      name: (value) =>
        !value || value.trim() === "" ? "Name is required" : null,
    },
  });

  // Update form values when modal opens or overhead changes
  useEffect(() => {
    if (opened) {
      if (overhead) {
        // Edit mode - populate with overhead's data
        form.setValues({
          planning_period_id: overhead.planning_period_id,
          name: overhead.name,
          description: overhead.description || "",
        });
        form.clearErrors();
      } else {
        // Create mode - reset to defaults
        form.reset();
      }
    }
  }, [opened, overhead]);

  const handleSubmit = async (values: CreateOverheadInput) => {
    setLoading(true);
    try {
      await onSubmit(values);
      form.reset();
      onClose();
    } catch (error) {
      console.error("Failed to save overhead:", error);
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
            placeholder="e.g., Weekly Team Meeting, Daily Standup"
            required
            leftSection={<IconClock size={16} />}
            {...form.getInputProps("name")}
          />

          <Textarea
            label="Description (optional)"
            placeholder="Brief description of this overhead task"
            rows={3}
            {...form.getInputProps("description")}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {overhead ? "Update" : "Create"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
