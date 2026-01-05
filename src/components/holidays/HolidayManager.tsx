import { useEffect, useState } from "react";
import { Button, Stack, Group, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { IconPlus } from "@tabler/icons-react";
import { HolidayList } from "./HolidayList";
import { HolidayForm } from "./HolidayForm";
import {
  listHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  listCountries,
} from "../../lib/tauri";
import type {
  HolidayWithCountry,
  CreateHolidayInput,
  Country,
  Holiday,
} from "../../types";

export function HolidayManager() {
  const [holidays, setHolidays] = useState<HolidayWithCountry[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [formOpened, setFormOpened] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    loadHolidays();
    loadCountries();
  }, []);

  const loadHolidays = async () => {
    try {
      const data = await listHolidays();
      setHolidays(data);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to load holidays",
        color: "red",
      });
      console.error("Failed to load holidays:", error);
    }
  };

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

  const handleCreate = async (values: CreateHolidayInput) => {
    try {
      await createHoliday(values);
      await loadHolidays();
      notifications.show({
        title: "Success",
        message: "Holiday created successfully",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: String(error) || "Failed to create holiday",
        color: "red",
      });
      throw error;
    }
  };

  const handleUpdate = async (values: CreateHolidayInput) => {
    if (!selectedHoliday) return;

    try {
      await updateHoliday(selectedHoliday.id, values);
      await loadHolidays();
      notifications.show({
        title: "Success",
        message: "Holiday updated successfully",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: String(error) || "Failed to update holiday",
        color: "red",
      });
      throw error;
    }
  };

  const handleDelete = async (id: number) => {
    const holiday = holidays.find((h) => h.id === id);
    if (!holiday) return;

    modals.openConfirmModal({
      title: "Delete Holiday",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete this holiday{" "}
          {holiday.name && (
            <>
              (<strong>{holiday.name}</strong>)
            </>
          )}{" "}
          for <strong>{holiday.country_name}</strong>?
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteHoliday(id);
          await loadHolidays();
          notifications.show({
            title: "Success",
            message: "Holiday deleted successfully",
            color: "green",
          });
        } catch (error) {
          notifications.show({
            title: "Error",
            message: "Failed to delete holiday",
            color: "red",
          });
          console.error("Failed to delete holiday:", error);
        }
      },
    });
  };

  const handleEdit = (holiday: HolidayWithCountry) => {
    // Convert HolidayWithCountry to Holiday for form
    const holidayForForm: Holiday = {
      id: holiday.id,
      country_id: holiday.country_id,
      name: holiday.name,
      start_date: holiday.start_date,
      end_date: holiday.end_date,
      created_at: holiday.created_at,
    };
    setSelectedHoliday(holidayForForm);
    setFormOpened(true);
  };

  const handleCloseForm = () => {
    setFormOpened(false);
    setSelectedHoliday(null);
  };

  // Filter holidays by selected country
  const filteredHolidays = selectedCountryId
    ? holidays.filter((h) => h.country_id.toString() === selectedCountryId)
    : holidays;

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Text size="lg" fw={500}>
          Holidays
        </Text>
        <Button
          leftSection={<IconPlus size={18} />}
          onClick={() => setFormOpened(true)}
          disabled={countries.length === 0}
        >
          Add Holiday
        </Button>
      </Group>

      {countries.length === 0 ? (
        <Text c="dimmed" size="sm">
          Please create a country first before adding holidays
        </Text>
      ) : (
        <HolidayList
          holidays={filteredHolidays}
          onEdit={handleEdit}
          onDelete={handleDelete}
          countries={countries}
          selectedCountryId={selectedCountryId}
          onCountryFilterChange={setSelectedCountryId}
        />
      )}

      <HolidayForm
        opened={formOpened}
        onClose={handleCloseForm}
        onSubmit={selectedHoliday ? handleUpdate : handleCreate}
        holiday={selectedHoliday}
        countries={countries}
        title={selectedHoliday ? "Edit Holiday" : "Create Holiday"}
      />
    </Stack>
  );
}
