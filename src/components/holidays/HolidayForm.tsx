import { useState, useEffect } from "react";
import { TextInput, Button, Modal, Group, Stack, Select } from "@mantine/core";
import { useForm } from "@mantine/form";
import type { Holiday, CreateHolidayInput, Country } from "../../types";

interface HolidayFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: CreateHolidayInput) => Promise<void>;
  holiday?: Holiday | null;
  countries: Country[];
  title: string;
}

export function HolidayForm({
  opened,
  onClose,
  onSubmit,
  holiday,
  countries,
  title,
}: HolidayFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<CreateHolidayInput>({
    initialValues: {
      country_id: 0,
      name: "",
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date().toISOString().split("T")[0],
    },
    validate: {
      country_id: (value) => (!value ? "Country is required" : null),
      start_date: (value) => (!value ? "Start date is required" : null),
      end_date: (value, values) => {
        if (!value) return "End date is required";
        if (
          values.start_date &&
          new Date(value) < new Date(values.start_date)
        ) {
          return "End date must be after or equal to start date";
        }
        return null;
      },
    },
  });

  // Update form values when modal opens or holiday changes
  useEffect(() => {
    if (opened) {
      if (holiday) {
        // Edit mode - populate with holiday's data
        form.setValues({
          country_id: holiday.country_id,
          name: holiday.name || "",
          start_date: holiday.start_date,
          end_date: holiday.end_date,
        });
        form.clearErrors();
      } else {
        // Create mode - reset to defaults
        form.reset();
      }
    }
  }, [opened, holiday]);

  // Auto-set end_date to match start_date for convenience (single-day holidays)
  useEffect(() => {
    if (
      form.values.start_date &&
      !holiday &&
      form.values.end_date === form.getInitialValues().end_date
    ) {
      form.setFieldValue("end_date", form.values.start_date);
    }
  }, [form.values.start_date]);

  const handleSubmit = async (values: CreateHolidayInput) => {
    setLoading(true);
    try {
      // Ensure name is undefined (not empty string) for optional field
      const input: CreateHolidayInput = {
        ...values,
        name: values.name?.trim() || undefined,
      };
      await onSubmit(input);
      form.reset();
      onClose();
    } catch (error) {
      console.error("Failed to save holiday:", error);
    } finally {
      setLoading(false);
    }
  };

  // Format country options: "USA - United States"
  const countryOptions = countries.map((country) => ({
    value: country.id.toString(),
    label: `${country.iso_code} - ${country.name}`,
  }));

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Select
            label="Country"
            placeholder="Select country"
            required
            searchable
            data={countryOptions}
            value={form.values.country_id.toString()}
            onChange={(value) => {
              form.setFieldValue("country_id", value ? parseInt(value, 10) : 0);
            }}
            error={form.errors.country_id}
            disabled={!!holiday} // Can't change country when editing
          />

          <TextInput
            label="Holiday Name"
            placeholder="New Year's Day (optional)"
            description="Leave blank for unnamed holidays"
            {...form.getInputProps("name")}
          />

          <Group grow>
            <TextInput
              label="Start Date"
              type="date"
              required
              {...form.getInputProps("start_date")}
            />

            <TextInput
              label="End Date"
              type="date"
              description="Defaults to start date for single-day holidays"
              required
              {...form.getInputProps("end_date")}
            />
          </Group>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {holiday ? "Update" : "Create"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
