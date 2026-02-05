import { useEffect } from "react";
import {
  Modal,
  TextInput,
  Textarea,
  NumberInput,
  SegmentedControl,
  Button,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import type { JobOverheadTask, CreateJobOverheadTaskInput } from "../../types";

interface JobOverheadTaskFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: CreateJobOverheadTaskInput) => Promise<void>;
  jobId: number;
  task?: JobOverheadTask | null;
  title: string;
}

export function JobOverheadTaskForm({
  opened,
  onClose,
  onSubmit,
  jobId,
  task,
  title,
}: JobOverheadTaskFormProps) {
  const form = useForm<CreateJobOverheadTaskInput>({
    initialValues: {
      job_id: jobId,
      name: "",
      description: "",
      effort_hours: 1,
      effort_period: "weekly",
    },
    validate: {
      name: (value) =>
        value.trim().length === 0 ? "Task name is required" : null,
      effort_hours: (value) =>
        value <= 0 ? "Effort hours must be greater than 0" : null,
    },
  });

  useEffect(() => {
    if (opened) {
      if (task) {
        form.setValues({
          job_id: task.job_id,
          name: task.name,
          description: task.description || "",
          effort_hours: task.effort_hours,
          effort_period: task.effort_period,
        });
      } else {
        form.reset();
        form.setFieldValue("job_id", jobId);
      }
    }
  }, [opened, task, jobId]);

  const handleSubmit = async (values: CreateJobOverheadTaskInput) => {
    try {
      await onSubmit(values);
      form.reset();
      onClose();
    } catch (error) {
      console.error("Failed to save overhead task:", error);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Task Name"
            placeholder="e.g., Code Reviews, Team Meetings"
            required
            {...form.getInputProps("name")}
          />

          <Textarea
            label="Description"
            placeholder="Brief description of this overhead task"
            rows={2}
            {...form.getInputProps("description")}
          />

          <Group grow>
            <NumberInput
              label="Effort Hours"
              placeholder="Hours"
              min={0.5}
              step={0.5}
              decimalScale={1}
              required
              {...form.getInputProps("effort_hours")}
            />

            <div>
              <Text size="sm" fw={500} mb={4}>
                Effort Period
              </Text>
              <SegmentedControl
                fullWidth
                data={[
                  { label: "Daily", value: "daily" },
                  { label: "Weekly", value: "weekly" },
                ]}
                {...form.getInputProps("effort_period")}
              />
            </div>
          </Group>

          <Text size="xs" c="dimmed">
            Example: 2 hours weekly = 2 hours per week deducted from available
            capacity
          </Text>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
