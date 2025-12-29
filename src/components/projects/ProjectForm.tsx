import { useState, useEffect } from "react";
import {
  TextInput,
  Button,
  Modal,
  Group,
  Stack,
  Textarea,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import type { Project, CreateProjectInput } from "../../types";

interface ProjectFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: CreateProjectInput) => Promise<void>;
  project?: Project | null;
  title: string;
}

export function ProjectForm({
  opened,
  onClose,
  onSubmit,
  project,
  title,
}: ProjectFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<CreateProjectInput>({
    initialValues: {
      name: "",
      description: "",
      required_hours: 0, // Deprecated - will be set per planning period
    },
    validate: {
      name: (value) => (!value ? "Name is required" : null),
    },
  });

  // Update form values when modal opens or project changes
  useEffect(() => {
    if (opened) {
      if (project) {
        // Edit mode - populate with project's data
        form.setValues({
          name: project.name,
          description: project.description || "",
          required_hours: 0, // Still deprecated as per design
        });
        form.clearErrors();
      } else {
        // Create mode - reset to defaults
        form.reset();
      }
    }
  }, [opened, project]);

  const handleSubmit = async (values: CreateProjectInput) => {
    setLoading(true);
    try {
      await onSubmit(values);
      form.reset();
      onClose();
    } catch (error) {
      console.error("Failed to save project:", error);
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
            {...form.getInputProps("name")}
          />

          <Textarea
            label="Description"
            placeholder="Enter project description"
            rows={3}
            {...form.getInputProps("description")}
          />

          <Text size="sm" c="dimmed">
            Required hours are now set per planning period. After creating a
            project, go to a planning period's detail view to set required hours
            for that specific period.
          </Text>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {project ? "Update" : "Create"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
