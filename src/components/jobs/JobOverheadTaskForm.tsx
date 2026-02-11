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
  Switch,
  Slider,
  Box,
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

// Preset marks for the probability slider
const probabilityMarks = [
  { value: 0, label: "0%" },
  { value: 25, label: "25%" },
  { value: 50, label: "50%" },
  { value: 75, label: "75%" },
  { value: 100, label: "100%" },
];

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
      is_optional: false,
      optional_weight: 0.5,
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
          is_optional: task.is_optional,
          optional_weight: task.optional_weight,
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

  // Convert weight (0-1) to percentage for slider display
  const weightAsPercent = (form.values.optional_weight ?? 0.5) * 100;

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

          <Switch
            label="Optional Task"
            description="Optional tasks may or may not happen"
            {...form.getInputProps("is_optional", { type: "checkbox" })}
          />

          {form.values.is_optional && (
            <Box>
              <Text size="sm" fw={500} mb="xs">
                Probability ({Math.round(weightAsPercent)}%)
              </Text>
              <Slider
                value={weightAsPercent}
                onChange={(val) =>
                  form.setFieldValue("optional_weight", val / 100)
                }
                min={0}
                max={100}
                step={5}
                marks={probabilityMarks}
                label={(val) => `${val}%`}
              />
              <Text size="xs" c="dimmed" mt="md">
                How likely is this task to happen? Higher probability = more
                hours deducted from capacity.
              </Text>
            </Box>
          )}

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
