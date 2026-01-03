import { useState, useEffect } from "react";
import {
  Button,
  Modal,
  Group,
  Stack,
  NumberInput,
  Select,
  MultiSelect,
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

  const form = useForm<{
    overhead_id: number;
    person_ids: number[];
    effort_hours: number;
    effort_period: "daily" | "weekly";
  }>({
    initialValues: {
      overhead_id: overheadId,
      person_ids: [],
      effort_hours: 1,
      effort_period: "weekly",
    },
    validate: {
      person_ids: (value) => {
        if (value.length === 0) return "Please select at least one person";
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
        // Edit mode - populate with assignment's data (single person)
        form.setValues({
          overhead_id: assignment.overhead_id,
          person_ids: [assignment.person_id], // Wrap in array for consistency
          effort_hours: assignment.effort_hours,
          effort_period: assignment.effort_period as "daily" | "weekly",
        });
        form.clearErrors();
      } else {
        // Create mode - reset to defaults (multiple people possible)
        form.setValues({
          overhead_id: overheadId,
          person_ids: [],
          effort_hours: 1,
          effort_period: "weekly",
        });
        form.clearErrors();
      }
    }
  }, [opened, assignment, overheadId]);

  const handleSubmit = async (values: {
    overhead_id: number;
    person_ids: number[];
    effort_hours: number;
    effort_period: "daily" | "weekly";
  }) => {
    console.log("Submitting overhead assignment:", values);
    setLoading(true);
    try {
      if (assignment) {
        // Edit mode: single person (convert back to CreateOverheadAssignmentInput)
        await onSubmit({
          overhead_id: values.overhead_id,
          person_id: values.person_ids[0], // Take first (only) person
          effort_hours: values.effort_hours,
          effort_period: values.effort_period,
        });
      } else {
        // Create mode: multiple people - pass extended object with person_ids
        await onSubmit({
          overhead_id: values.overhead_id,
          person_id: 0, // Not used in create mode with multiple people
          effort_hours: values.effort_hours,
          effort_period: values.effort_period,
          person_ids: values.person_ids, // Pass the array
        } as any); // Type assertion for extended interface
      }
      form.reset();
      onClose();
    } catch (error) {
      console.error("Failed to save overhead assignment:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter out already-assigned people (only for create mode)
  const assignedPersonIds = new Set(
    assignment ? [] : existingAssignments.map((a) => a.person_id),
  );

  const personOptions = people
    .filter((person) => !assignedPersonIds.has(person.id))
    .map((person) => ({
      value: String(person.id),
      label: `${person.name} (${person.email})`,
    }));

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {/* Person Selection - MultiSelect for create, disabled Select for edit */}
          {assignment ? (
            // Edit mode: Show single person (disabled)
            <Select
              label="Person"
              placeholder="Select a person"
              required
              searchable
              data={people.map((person) => ({
                value: String(person.id),
                label: `${person.name} (${person.email})`,
              }))}
              disabled={true}
              value={
                form.values.person_ids.length > 0
                  ? String(form.values.person_ids[0])
                  : null
              }
            />
          ) : (
            // Create mode: MultiSelect for multiple people
            <MultiSelect
              label="People"
              placeholder="Select one or more people"
              required
              searchable
              data={personOptions}
              disabled={loadingData}
              value={form.values.person_ids.map(String)}
              onChange={(values) =>
                form.setFieldValue(
                  "person_ids",
                  values.map((v) => parseInt(v)),
                )
              }
              error={form.errors.person_ids}
            />
          )}

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
              {assignment
                ? "Update"
                : form.values.person_ids.length > 1
                  ? `Assign ${form.values.person_ids.length} People`
                  : "Assign"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
