import { useState, useEffect } from "react";
import {
  TextInput,
  Button,
  Modal,
  Group,
  Stack,
  Textarea,
  Text,
  Badge,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconCalendar } from "@tabler/icons-react";
import type { Absence, CreateAbsenceInput } from "../../types";

interface AbsenceFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: CreateAbsenceInput) => Promise<void>;
  absence?: Absence | null;
  personId: number;
  title: string;
}

// Calculate business days between two dates (excluding weekends)
function calculateBusinessDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (end < start) return 0;

  let businessDays = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return businessDays;
}

export function AbsenceForm({
  opened,
  onClose,
  onSubmit,
  absence,
  personId,
  title,
}: AbsenceFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<CreateAbsenceInput>({
    initialValues: {
      person_id: personId,
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date().toISOString().split("T")[0],
      days: 1,
      reason: "",
    },
    validate: {
      start_date: (value) => (!value ? "Start date is required" : null),
      end_date: (value, values) => {
        if (!value) return "End date is required";
        if (
          values.start_date &&
          new Date(value) < new Date(values.start_date)
        ) {
          return "End date must be on or after start date";
        }
        return null;
      },
    },
  });

  // Calculate business days whenever dates change
  useEffect(() => {
    const businessDays = calculateBusinessDays(
      form.values.start_date,
      form.values.end_date,
    );
    form.setFieldValue("days", businessDays);
  }, [form.values.start_date, form.values.end_date]);

  // Update form values when modal opens or absence changes
  useEffect(() => {
    if (opened) {
      if (absence) {
        // Edit mode - populate with absence's data
        form.setValues({
          person_id: absence.person_id,
          start_date: absence.start_date,
          end_date: absence.end_date,
          days: absence.days,
          reason: absence.reason || "",
        });
        form.clearErrors();
      } else {
        // Create mode - reset to defaults
        form.reset();
      }
    }
  }, [opened, absence]);

  const handleSubmit = async (values: CreateAbsenceInput) => {
    setLoading(true);
    try {
      await onSubmit(values);
      form.reset();
      onClose();
    } catch (error) {
      console.error("Failed to save absence:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Group grow>
            <TextInput
              label="Start Date"
              type="date"
              required
              leftSection={<IconCalendar size={16} />}
              {...form.getInputProps("start_date")}
            />

            <TextInput
              label="End Date"
              type="date"
              required
              leftSection={<IconCalendar size={16} />}
              {...form.getInputProps("end_date")}
            />
          </Group>

          <div>
            <Text size="sm" fw={500} mb={4}>
              Business Days (5-day work week)
            </Text>
            <Badge size="lg" variant="light" color="blue">
              {form.values.days} {form.values.days === 1 ? "day" : "days"}
            </Badge>
            <Text size="xs" c="dimmed" mt={4}>
              Automatically calculated excluding weekends
            </Text>
          </div>

          <Textarea
            label="Reason (optional)"
            placeholder="e.g., Vacation, Sick leave, Holiday, Conference"
            rows={3}
            {...form.getInputProps("reason")}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {absence ? "Update" : "Create"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
