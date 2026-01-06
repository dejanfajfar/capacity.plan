import { useState } from "react";
import {
  Modal,
  Button,
  MultiSelect,
  Stack,
  Alert,
  Group,
  LoadingOverlay,
  Text,
  Divider,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconDownload,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconPlus,
} from "@tabler/icons-react";
import type { NagerDateCountry } from "../../types";
import {
  fetchAvailableCountriesForImport,
  importCountriesFromApi,
  createCountry,
} from "../../lib/tauri";

interface CountryMultiSelectImportProps {
  opened: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

export function CountryMultiSelectImport({
  opened,
  onClose,
  onImportComplete,
}: CountryMultiSelectImportProps) {
  const [availableCountries, setAvailableCountries] = useState<
    NagerDateCountry[]
  >([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualName, setManualName] = useState("");
  const [addingManual, setAddingManual] = useState(false);

  const handleOpen = async () => {
    if (opened && availableCountries.length === 0) {
      setLoading(true);
      try {
        const countries = await fetchAvailableCountriesForImport();
        setAvailableCountries(countries);
      } catch (error) {
        console.error("Failed to fetch available countries:", error);
        notifications.show({
          title: "API Error",
          message:
            "Failed to fetch countries from API. You can still add countries manually.",
          color: "yellow",
          icon: <IconAlertCircle size={16} />,
        });
        setShowManualEntry(true);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleImport = async () => {
    if (selectedCodes.length === 0) {
      notifications.show({
        title: "No Countries Selected",
        message: "Please select at least one country to import",
        color: "yellow",
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    setImporting(true);
    try {
      const imported = await importCountriesFromApi(selectedCodes);

      notifications.show({
        title: "Import Complete",
        message: `Successfully imported ${imported.length} countries`,
        color: "green",
        icon: <IconCheck size={16} />,
      });

      if (onImportComplete) {
        onImportComplete();
      }

      handleClose();
    } catch (error) {
      console.error("Failed to import countries:", error);
      notifications.show({
        title: "Import Failed",
        message: error instanceof Error ? error.message : "Unknown error",
        color: "red",
        icon: <IconX size={16} />,
      });
    } finally {
      setImporting(false);
    }
  };

  const handleManualAdd = async () => {
    if (!manualCode.trim() || !manualName.trim()) {
      notifications.show({
        title: "Missing Information",
        message: "Please provide both country code and name",
        color: "yellow",
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    const code = manualCode.trim().toUpperCase();
    if (code.length !== 2) {
      notifications.show({
        title: "Invalid Code",
        message: "Country code must be exactly 2 letters (e.g., US, GB, DE)",
        color: "red",
        icon: <IconX size={16} />,
      });
      return;
    }

    setAddingManual(true);
    try {
      await createCountry({
        iso_code: code,
        name: manualName.trim(),
      });

      notifications.show({
        title: "Country Added",
        message: `${manualName} (${code}) added successfully`,
        color: "green",
        icon: <IconCheck size={16} />,
      });

      if (onImportComplete) {
        onImportComplete();
      }

      // Reset manual form
      setManualCode("");
      setManualName("");
      setShowManualEntry(false);
    } catch (error) {
      console.error("Failed to add country:", error);
      notifications.show({
        title: "Failed to Add Country",
        message: error instanceof Error ? error.message : "Unknown error",
        color: "red",
        icon: <IconX size={16} />,
      });
    } finally {
      setAddingManual(false);
    }
  };

  const handleClose = () => {
    setSelectedCodes([]);
    setManualCode("");
    setManualName("");
    setShowManualEntry(false);
    onClose();
  };

  // Trigger load when modal opens
  if (opened && availableCountries.length === 0 && !loading) {
    handleOpen();
  }

  const countryOptions = availableCountries.map((c) => ({
    value: c.countryCode,
    label: `${c.countryCode} - ${c.name}`,
  }));

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Import Countries"
      size="lg"
    >
      <Stack gap="md">
        <LoadingOverlay
          visible={loading}
          overlayProps={{ blur: 2 }}
          loaderProps={{ type: "dots" }}
        />

        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Country Import"
          color="blue"
        >
          Import countries from Nager.Date API (106 countries available). You
          can select multiple countries at once.
        </Alert>

        {availableCountries.length > 0 && (
          <>
            <MultiSelect
              label="Select Countries"
              placeholder="Choose countries to import"
              data={countryOptions}
              value={selectedCodes}
              onChange={setSelectedCodes}
              searchable
              disabled={importing}
              maxDropdownHeight={300}
            />

            {selectedCodes.length > 0 && (
              <Text size="sm" c="dimmed">
                {selectedCodes.length} country/countries selected
              </Text>
            )}

            <Group justify="space-between">
              <Button
                variant="subtle"
                onClick={() => setShowManualEntry(!showManualEntry)}
                size="sm"
              >
                {showManualEntry ? "Hide Manual Entry" : "Add Country Manually"}
              </Button>

              <Group gap="xs">
                <Button variant="subtle" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  color="blue"
                  onClick={handleImport}
                  loading={importing}
                  disabled={selectedCodes.length === 0}
                  leftSection={<IconDownload size={16} />}
                >
                  Import {selectedCodes.length} Countries
                </Button>
              </Group>
            </Group>
          </>
        )}

        {showManualEntry && (
          <>
            <Divider label="Or Add Manually" labelPosition="center" />

            <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
              Use this if the country is not available in the API or if you're
              offline.
            </Alert>

            <TextInput
              label="Country Code"
              placeholder="e.g., US, GB, DE"
              value={manualCode}
              onChange={(e) => setManualCode(e.currentTarget.value)}
              maxLength={2}
              disabled={addingManual}
              description="2-letter ISO 3166-1 alpha-2 code"
            />

            <TextInput
              label="Country Name"
              placeholder="e.g., United States, United Kingdom"
              value={manualName}
              onChange={(e) => setManualName(e.currentTarget.value)}
              disabled={addingManual}
            />

            <Group justify="flex-end">
              <Button
                variant="subtle"
                onClick={() => {
                  setShowManualEntry(false);
                  setManualCode("");
                  setManualName("");
                }}
                disabled={addingManual}
              >
                Cancel
              </Button>
              <Button
                color="green"
                onClick={handleManualAdd}
                loading={addingManual}
                leftSection={<IconPlus size={16} />}
              >
                Add Country
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
