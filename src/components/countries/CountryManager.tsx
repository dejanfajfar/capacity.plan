import { useEffect, useState } from "react";
import { Button, Stack, Group, Alert, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { IconPlus, IconAlertTriangle, IconDownload } from "@tabler/icons-react";
import { CountryList } from "./CountryList";
import { CountryForm } from "./CountryForm";
import { CountryMultiSelectImport } from "./CountryMultiSelectImport";
import {
  listCountries,
  createCountry,
  updateCountry,
  deleteCountry,
  checkCountryDependencies,
  listHolidays,
  listPeople,
} from "../../lib/tauri";
import type { Country, CreateCountryInput } from "../../types";

export function CountryManager() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [formOpened, setFormOpened] = useState(false);
  const [importOpened, setImportOpened] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [holidayCounts, setHolidayCounts] = useState<Map<number, number>>(
    new Map(),
  );
  const [peopleCounts, setPeopleCounts] = useState<Map<number, number>>(
    new Map(),
  );

  useEffect(() => {
    loadCountries();
    loadCounts();
  }, []);

  const loadCountries = async () => {
    try {
      const data = await listCountries();
      setCountries(data);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to load countries",
        color: "red",
      });
      console.error("Failed to load countries:", error);
    }
  };

  const loadCounts = async () => {
    try {
      const [holidays, people] = await Promise.all([
        listHolidays(),
        listPeople(),
      ]);

      const hCounts = new Map<number, number>();
      holidays.forEach((h) => {
        hCounts.set(h.country_id, (hCounts.get(h.country_id) || 0) + 1);
      });
      setHolidayCounts(hCounts);

      const pCounts = new Map<number, number>();
      people.forEach((p) => {
        if (p.country_id) {
          pCounts.set(p.country_id, (pCounts.get(p.country_id) || 0) + 1);
        }
      });
      setPeopleCounts(pCounts);
    } catch (error) {
      console.error("Failed to load counts:", error);
    }
  };

  const handleCreate = async (values: CreateCountryInput) => {
    try {
      await createCountry(values);
      await loadCountries();
      await loadCounts();
      notifications.show({
        title: "Success",
        message: "Country created successfully",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: String(error) || "Failed to create country",
        color: "red",
      });
      throw error;
    }
  };

  const handleUpdate = async (values: CreateCountryInput) => {
    if (!selectedCountry) return;

    try {
      await updateCountry(selectedCountry.id, values);
      await loadCountries();
      notifications.show({
        title: "Success",
        message: "Country updated successfully",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: String(error) || "Failed to update country",
        color: "red",
      });
      throw error;
    }
  };

  const handleDelete = async (id: number) => {
    const country = countries.find((c) => c.id === id);
    if (!country) return;

    try {
      const deps = await checkCountryDependencies(id);

      modals.openConfirmModal({
        title: "Delete Country",
        centered: true,
        children: (
          <Stack gap="sm">
            <Text size="sm">
              Are you sure you want to delete <strong>{country.name}</strong> (
              {country.iso_code})?
            </Text>
            {deps.holiday_count > 0 && (
              <Alert color="orange" icon={<IconAlertTriangle size={16} />}>
                This will delete {deps.holiday_count} holiday(s) associated with
                this country.
              </Alert>
            )}
            {deps.people_count > 0 && (
              <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
                {deps.people_count} person(s) assigned to this country will have
                their country unset.
              </Alert>
            )}
            <Text size="sm" c="dimmed">
              This action cannot be undone.
            </Text>
          </Stack>
        ),
        labels: { confirm: "Delete", cancel: "Cancel" },
        confirmProps: { color: "red" },
        onConfirm: async () => {
          try {
            await deleteCountry(id);
            await loadCountries();
            await loadCounts();
            notifications.show({
              title: "Success",
              message: "Country deleted successfully",
              color: "green",
            });
          } catch (error) {
            notifications.show({
              title: "Error",
              message: "Failed to delete country",
              color: "red",
            });
            console.error("Failed to delete country:", error);
          }
        },
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to check dependencies",
        color: "red",
      });
      console.error("Failed to check dependencies:", error);
    }
  };

  const handleEdit = (country: Country) => {
    setSelectedCountry(country);
    setFormOpened(true);
  };

  const handleCloseForm = () => {
    setFormOpened(false);
    setSelectedCountry(null);
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Text size="lg" fw={500}>
          Countries
        </Text>
        <Group gap="xs">
          <Button
            leftSection={<IconDownload size={18} />}
            onClick={() => setImportOpened(true)}
            variant="light"
          >
            Import from API
          </Button>
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => setFormOpened(true)}
          >
            Add Country
          </Button>
        </Group>
      </Group>

      <CountryList
        countries={countries}
        onEdit={handleEdit}
        onDelete={handleDelete}
        holidayCounts={holidayCounts}
        peopleCounts={peopleCounts}
      />

      <CountryForm
        opened={formOpened}
        onClose={handleCloseForm}
        onSubmit={selectedCountry ? handleUpdate : handleCreate}
        country={selectedCountry}
        title={selectedCountry ? "Edit Country" : "Create Country"}
      />

      <CountryMultiSelectImport
        opened={importOpened}
        onClose={() => setImportOpened(false)}
        onImportComplete={() => {
          loadCountries();
          loadCounts();
        }}
      />
    </Stack>
  );
}
