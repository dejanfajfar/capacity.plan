import { useState } from "react";
import {
  Modal,
  Button,
  Select,
  Table,
  Text,
  Group,
  Stack,
  Alert,
  Badge,
  LoadingOverlay,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconDownload,
  IconAlertCircle,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import type { Country, HolidayImportPreview } from "../../types";
import { previewHolidayImport, importHolidaysFromApi } from "../../lib/tauri";

interface HolidayImportDialogProps {
  opened: boolean;
  onClose: () => void;
  countries: Country[];
  onImportComplete?: () => void;
}

export function HolidayImportDialog({
  opened,
  onClose,
  countries,
  onImportComplete,
}: HolidayImportDialogProps) {
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(
    null,
  );
  const [preview, setPreview] = useState<HolidayImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  const handlePreview = async () => {
    if (!selectedCountryCode) {
      notifications.show({
        title: "No Country Selected",
        message: "Please select a country to preview holidays",
        color: "yellow",
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    setLoading(true);
    try {
      // Preview for current year (we'll import both years but only preview one)
      const previewData = await previewHolidayImport(
        selectedCountryCode,
        currentYear,
      );
      setPreview(previewData);
    } catch (error) {
      console.error("Failed to preview holidays:", error);
      notifications.show({
        title: "Preview Failed",
        message: error instanceof Error ? error.message : "Unknown error",
        color: "red",
        icon: <IconX size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedCountryCode) return;

    setImporting(true);
    try {
      const results = await importHolidaysFromApi(selectedCountryCode, [
        currentYear,
        nextYear,
      ]);

      const totalImported = results.reduce(
        (sum, r) => sum + r.imported_count,
        0,
      );
      const totalSkipped = results.reduce((sum, r) => sum + r.skipped_count, 0);

      notifications.show({
        title: "Import Complete",
        message: `Imported ${totalImported} holidays for ${currentYear}-${nextYear}. Skipped ${totalSkipped} duplicates.`,
        color: "green",
        icon: <IconCheck size={16} />,
      });

      // Refresh holidays list
      if (onImportComplete) {
        onImportComplete();
      }

      // Reset and close
      setPreview(null);
      setSelectedCountryCode(null);
      onClose();
    } catch (error) {
      console.error("Failed to import holidays:", error);
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

  const handleClose = () => {
    setPreview(null);
    setSelectedCountryCode(null);
    onClose();
  };

  const countryOptions = countries.map((c) => ({
    value: c.iso_code,
    label: `${c.iso_code} - ${c.name}`,
  }));

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Import Holidays from API"
      size="xl"
    >
      <Stack gap="md">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Holiday Import"
          color="blue"
        >
          Import public holidays from Nager.Date API for {currentYear} and{" "}
          {nextYear}. Existing holidays will be skipped automatically.
        </Alert>

        <Select
          label="Select Country"
          placeholder="Choose a country"
          data={countryOptions}
          value={selectedCountryCode}
          onChange={setSelectedCountryCode}
          searchable
          disabled={loading || importing}
        />

        <Group justify="apart">
          <Button
            onClick={handlePreview}
            disabled={!selectedCountryCode || importing}
            loading={loading}
            leftSection={<IconDownload size={16} />}
          >
            Preview {currentYear} Holidays
          </Button>

          {preview && (
            <Group gap="xs">
              <Badge color="blue">{preview.total_count} total</Badge>
              <Badge color="green">{preview.new_count} new</Badge>
              <Badge color="gray">{preview.duplicate_count} duplicates</Badge>
            </Group>
          )}
        </Group>

        {preview && (
          <>
            <LoadingOverlay
              visible={importing}
              overlayProps={{ blur: 2 }}
              loaderProps={{ type: "bars" }}
            />

            <Text size="sm" fw={500}>
              Preview: {preview.country_name} ({preview.year})
            </Text>

            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Local Name</Table.Th>
                    <Table.Th>English Name</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {preview.holidays.map((holiday, idx) => (
                    <Table.Tr
                      key={idx}
                      style={{
                        opacity: holiday.is_duplicate ? 0.5 : 1,
                      }}
                    >
                      <Table.Td>{holiday.date}</Table.Td>
                      <Table.Td>{holiday.local_name}</Table.Td>
                      <Table.Td>{holiday.name}</Table.Td>
                      <Table.Td>
                        {holiday.is_duplicate ? (
                          <Badge color="gray" size="sm">
                            Duplicate
                          </Badge>
                        ) : (
                          <Badge color="green" size="sm">
                            New
                          </Badge>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>

            <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
              Clicking "Import" will import holidays for both {currentYear} and{" "}
              {nextYear}. This preview shows only {currentYear}.
            </Alert>

            <Group justify="flex-end">
              <Button variant="subtle" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                color="blue"
                onClick={handleImport}
                loading={importing}
                disabled={preview.new_count === 0}
                leftSection={<IconDownload size={16} />}
              >
                Import {preview.new_count} Holidays
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
