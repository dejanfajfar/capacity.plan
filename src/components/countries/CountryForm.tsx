import { useState, useEffect } from "react";
import { TextInput, Button, Modal, Group, Stack } from "@mantine/core";
import { useForm } from "@mantine/form";
import type { Country, CreateCountryInput } from "../../types";

interface CountryFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: CreateCountryInput) => Promise<void>;
  country?: Country | null;
  title: string;
}

export function CountryForm({
  opened,
  onClose,
  onSubmit,
  country,
  title,
}: CountryFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<CreateCountryInput>({
    initialValues: {
      iso_code: "",
      name: "",
    },
    validate: {
      iso_code: (value) => {
        if (!value) return "ISO code is required";
        const upperValue = value.toUpperCase();
        if (upperValue.length !== 3)
          return "ISO code must be exactly 3 letters";
        if (!/^[A-Z]{3}$/.test(upperValue))
          return "ISO code must contain only letters";
        return null;
      },
      name: (value) =>
        !value
          ? "Country name is required"
          : value.length < 2
            ? "Country name must be at least 2 characters"
            : null,
    },
    transformValues: (values) => ({
      ...values,
      iso_code: values.iso_code.toUpperCase(), // Auto-uppercase ISO code
    }),
  });

  // Update form values when modal opens or country changes
  useEffect(() => {
    if (opened) {
      if (country) {
        // Edit mode - populate with country's data
        form.setValues({
          iso_code: country.iso_code,
          name: country.name,
        });
        form.clearErrors();
      } else {
        // Create mode - reset to defaults
        form.reset();
      }
    }
  }, [opened, country]);

  const handleSubmit = async (values: CreateCountryInput) => {
    setLoading(true);
    try {
      await onSubmit(values);
      form.reset();
      onClose();
    } catch (error) {
      console.error("Failed to save country:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="ISO Code"
            placeholder="USA"
            description="3-letter ISO 3166-1 alpha-3 code"
            required
            maxLength={3}
            {...form.getInputProps("iso_code")}
            onChange={(e) => {
              form.setFieldValue("iso_code", e.target.value.toUpperCase());
            }}
          />

          <TextInput
            label="Country Name"
            placeholder="United States"
            required
            {...form.getInputProps("name")}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {country ? "Update" : "Create"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
