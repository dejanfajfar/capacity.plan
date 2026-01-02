import { useState, useEffect } from "react";
import {
  Button,
  Modal,
  Group,
  Stack,
  NumberInput,
  Select,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import type {
  OverheadAssignment,
  CreateOverheadAssignmentInput,
  Person,
} from "../../types";
import { listPeople } from "../../lib/tauri";

interface OverheadAssignmentFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: CreateOverheadAssignmentInput) => Promise<void>;
  assignment?: OverheadAssignment | null;
  overheadId: number;
  existingAssignments: OverheadAssignment[];
  title: string;
}

export function OverheadAssignmentForm({
  opened,
  onClose,
  onSubmit,
  assignment,
  overheadId,
  existingAssignments,
  title,
}: OverheadAssignmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (opened) {
      loadFormData();
    }
  }, [opened]);

  const loadFormData = async () => {
    try {
      setLoadingData(true);
      const peopleData = await listPeople();
      setPeople(peopleData);
    } catch (error) {
      console.error("Failed to load form data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const form = useForm<CreateOverheadAssignmentInput>({
    initialValues: {
      overhead_id: overheadId,
      person_id: 0,
      effort_hours: 1,
      effort_period: "weekly",
    },
    validate: {
      person_id: (value) => {
        if (value <= 0) return "Please select a person";
        // Check if person is already assigned (only for create mode)
        if (
          !assignment &&
          existingAssignments.some((a) => a.person_id === value)
        ) {
          return "This person is already assigned to this overhead";
        }
        return null;
      },
      effort_hours: (value) => {
        if (value <= 0) return "Effort must be greater than 0";
        if (value > 40) return "Effort cannot exceed 40 hours";
        return null;
      },
      effort_period: (value) =>
        !value || (value !== "daily" && value !== "weekly")
          ? "Please select a period"
          : null,
    },
  });

  // Update form values when modal opens or assignment changes
  useEffect(() => {
    if (opened) {
      if (assignment) {
        // Edit mode - populate with assignment's data
        form.setValues({
          overhead_id: assignment.overhead_id,
          person_id: assignment.person_id,
          effort_hours: assignment.effort_hours,
          effort_period: assignment.effort_period as "daily" | "weekly",
        });
        form.clearErrors();
      } else {
        // Create mode - reset to defaults
        form.reset();
      }
    }
  }, [opened, assignment]);

  const handleSubmit = async (values: CreateOverheadAssignmentInput) => {
    setLoading(true);
    try {
      await onSubmit(values);
      form.reset();
      onClose();
    } catch (error) {
      console.error("Failed to save overhead assignment:", error);
    } finally {
      setLoading(false);
    }
  };

  const personOptions = people.map((person) => ({
    value: String(person.id),
    label: `${person.name} (${person.email})`,
    disabled:
      !assignment && existingAssignments.some((a) => a.person_id === person.id),
  }));

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Select
            label="Person"
            placeholder="Select a person"
            required
            searchable
            data={personOptions}
            disabled={loadingData || !!assignment}
            value={
              form.values.person_id > 0 ? String(form.values.person_id) : null
            }
            onChange={(value) =>
              form.setFieldValue("person_id", value ? parseInt(value) : 0)
            }
            error={form.errors.person_id}
          />

          <NumberInput
            label="Effort (hours)"
            placeholder="1.0"
            required
            min={0.25}
            max={40}
            step={0.25}
            decimalScale={2}
            {...form.getInputProps("effort_hours")}
          />

          <Select
            label="Period"
            placeholder="Select period"
            required
            data={[
              { value: "daily", label: "Per Day" },
              { value: "weekly", label: "Per Week" },
            ]}
            {...form.getInputProps("effort_period")}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {assignment ? "Update" : "Assign"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
