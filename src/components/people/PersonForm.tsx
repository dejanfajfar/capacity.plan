import { useState, useEffect } from "react";
import {
  TextInput,
  Button,
  Modal,
  Group,
  Stack,
  NumberInput,
  Select,
  Checkbox,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import type { Person, CreatePersonInput, Country } from "../../types";
import { listCountries } from "../../lib/tauri";

interface PersonFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: CreatePersonInput) => Promise<void>;
  person?: Person | null;
  title: string;
}

export function PersonForm({
  opened,
  onClose,
  onSubmit,
  person,
  title,
}: PersonFormProps) {
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [workingDaysArray, setWorkingDaysArray] = useState<string[]>([
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
  ]);

  const form = useForm<CreatePersonInput>({
    initialValues: {
      name: "",
      email: "",
      available_hours_per_week: 40,
      country_id: null,
      working_days: "Mon,Tue,Wed,Thu,Fri",
    },
    validate: {
      name: (value) => (!value ? "Name is required" : null),
      email: (value) =>
        !value
          ? "Email is required"
          : /^\S+@\S+$/.test(value)
            ? null
            : "Invalid email",
      available_hours_per_week: (value) =>
        value <= 0
          ? "Available hours must be greater than 0"
          : value > 168
            ? "Available hours cannot exceed 168 (hours in a week)"
            : null,
    },
  });

  // Load countries when modal opens
  useEffect(() => {
    if (opened) {
      loadCountries();
    }
  }, [opened]);

  const loadCountries = async () => {
    try {
      const data = await listCountries();
      setCountries(data);
    } catch (error) {
      console.error("Failed to load countries:", error);
    }
  };

  // Update form values when modal opens or person changes
  useEffect(() => {
    if (opened) {
      if (person) {
        // Edit mode - populate with person's data
        const workingDaysArr = person.working_days
          ? person.working_days.split(",").map((d) => d.trim())
          : ["Mon", "Tue", "Wed", "Thu", "Fri"];
        setWorkingDaysArray(workingDaysArr);

        form.setValues({
          name: person.name,
          email: person.email,
          available_hours_per_week: person.available_hours_per_week,
          country_id: person.country_id,
          working_days: person.working_days,
        });
        form.clearErrors();
      } else {
        // Create mode - reset to defaults
        setWorkingDaysArray(["Mon", "Tue", "Wed", "Thu", "Fri"]);
        form.reset();
      }
    }
  }, [opened, person]);

  const handleSubmit = async (values: CreatePersonInput) => {
    // Validate at least one working day is selected
    if (workingDaysArray.length === 0) {
      return;
    }

    setLoading(true);
    try {
      // Convert working days array to comma-separated string
      const workingDaysString = workingDaysArray.join(",");
      await onSubmit({ ...values, working_days: workingDaysString });
      form.reset();
      setWorkingDaysArray(["Mon", "Tue", "Wed", "Thu", "Fri"]);
      onClose();
    } catch (error) {
      console.error("Failed to save person:", error);
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
            placeholder="Enter person's name"
            required
            {...form.getInputProps("name")}
          />

          <TextInput
            label="Email"
            placeholder="person@example.com"
            required
            type="email"
            {...form.getInputProps("email")}
          />

          <Select
            label="Country"
            placeholder="Select country (optional)"
            description="Determines which holidays apply to this person"
            data={countries.map((c) => ({
              value: c.id.toString(),
              label: `${c.iso_code} - ${c.name}`,
            }))}
            value={form.values.country_id?.toString() || null}
            onChange={(value) =>
              form.setFieldValue(
                "country_id",
                value ? parseInt(value, 10) : null,
              )
            }
            clearable
            searchable
          />

          <NumberInput
            label="Available Hours per Week"
            placeholder="40"
            required
            min={0}
            max={168}
            step={1}
            {...form.getInputProps("available_hours_per_week")}
          />

          <Checkbox.Group
            label="Working Days"
            description="Select the days this person works for the company"
            required
            value={workingDaysArray}
            onChange={setWorkingDaysArray}
            error={
              workingDaysArray.length === 0
                ? "At least one day must be selected"
                : null
            }
          >
            <Group mt="xs">
              <Checkbox value="Mon" label="Monday" />
              <Checkbox value="Tue" label="Tuesday" />
              <Checkbox value="Wed" label="Wednesday" />
              <Checkbox value="Thu" label="Thursday" />
              <Checkbox value="Fri" label="Friday" />
              <Checkbox value="Sat" label="Saturday" />
              <Checkbox value="Sun" label="Sunday" />
            </Group>
          </Checkbox.Group>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {person ? "Update" : "Create"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
