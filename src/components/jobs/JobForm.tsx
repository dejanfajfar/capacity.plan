import { useEffect } from "react";
import {
  Modal,
  TextInput,
  Textarea,
  Button,
  Group,
  Stack,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import type { Job, CreateJobInput } from "../../types";

interface JobFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: CreateJobInput) => Promise<void>;
  job?: Job | null;
  title: string;
}

export function JobForm({
  opened,
  onClose,
  onSubmit,
  job,
  title,
}: JobFormProps) {
  const form = useForm<CreateJobInput>({
    initialValues: {
      name: "",
      description: "",
    },
    validate: {
      name: (value) =>
        value.trim().length === 0 ? "Job name is required" : null,
    },
  });

  useEffect(() => {
    if (opened) {
      if (job) {
        form.setValues({
          name: job.name,
          description: job.description || "",
        });
      } else {
        form.reset();
      }
    }
  }, [opened, job]);

  const handleSubmit = async (values: CreateJobInput) => {
    try {
      await onSubmit(values);
      form.reset();
      onClose();
    } catch (error) {
      console.error("Failed to save job:", error);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Job Name"
            placeholder="e.g., Senior Developer, Team Lead"
            required
            {...form.getInputProps("name")}
          />

          <Textarea
            label="Description"
            placeholder="Brief description of this job role"
            rows={3}
            {...form.getInputProps("description")}
          />

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
