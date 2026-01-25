import { useState, useEffect } from "react";
import {
  Stack,
  Paper,
  Text,
  Group,
  Badge,
  Button,
  Avatar,
} from "@mantine/core";
import {
  IconMail,
  IconClock,
  IconEdit,
  IconWorld,
  IconCalendar,
} from "@tabler/icons-react";
import { useGravatarUrl } from "../../lib/gravatar";
import { listCountries } from "../../lib/tauri";
import type { Person, Country } from "../../types";

interface PersonOverviewProps {
  person: Person;
  onEdit: () => void;
}

export function PersonOverview({ person, onEdit }: PersonOverviewProps) {
  const [country, setCountry] = useState<Country | null>(null);
  const [loadingCountry, setLoadingCountry] = useState(true);

  const avatarUrl = useGravatarUrl(person.email, {
    size: 200,
    default: "initials",
    name: person.name,
  });

  useEffect(() => {
    loadCountry();
  }, [person.country_id]);

  const loadCountry = async () => {
    if (!person.country_id) {
      setCountry(null);
      setLoadingCountry(false);
      return;
    }

    try {
      setLoadingCountry(true);
      const countries = await listCountries();
      const found = countries.find((c) => c.id === person.country_id);
      setCountry(found || null);
    } catch (error) {
      console.error("Failed to load country:", error);
      setCountry(null);
    } finally {
      setLoadingCountry(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Helper function to format working days for display
  const formatWorkingDays = (workingDays: string): string => {
    if (!workingDays) return "Mon-Fri";

    const days = workingDays.split(",").map((d) => d.trim());
    const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayNames: { [key: string]: string } = {
      Mon: "Monday",
      Tue: "Tuesday",
      Wed: "Wednesday",
      Thu: "Thursday",
      Fri: "Friday",
      Sat: "Saturday",
      Sun: "Sunday",
    };

    // Check if it's the standard Mon-Fri pattern
    if (
      days.length === 5 &&
      days.includes("Mon") &&
      days.includes("Tue") &&
      days.includes("Wed") &&
      days.includes("Thu") &&
      days.includes("Fri")
    ) {
      return "Monday - Friday (5 days)";
    }

    // Check if it's all 7 days
    if (days.length === 7) {
      return "All 7 days";
    }

    // Check for consecutive days
    const dayIndices = days
      .map((d) => allDays.indexOf(d))
      .filter((i) => i !== -1)
      .sort((a, b) => a - b);

    if (dayIndices.length > 1) {
      let isConsecutive = true;
      for (let i = 1; i < dayIndices.length; i++) {
        if (dayIndices[i] !== dayIndices[i - 1] + 1) {
          isConsecutive = false;
          break;
        }
      }

      if (isConsecutive) {
        return `${dayNames[allDays[dayIndices[0]]]} - ${dayNames[allDays[dayIndices[dayIndices.length - 1]]]} (${days.length} days)`;
      }
    }

    // Otherwise, list the days
    const fullDayNames = days.map((d) => dayNames[d]).filter(Boolean);
    return `${fullDayNames.join(", ")} (${days.length} days)`;
  };

  return (
    <Stack gap="lg">
      <div>
        <Group justify="space-between" align="center">
          <Group gap="md">
            <Avatar src={avatarUrl} alt={person.name} size={120} radius="xl" />
            <div>
              <Text size="xl" fw={600}>
                {person.name}
              </Text>
              <Group gap="xs" mt="xs">
                <IconMail size={16} />
                <Text
                  size="sm"
                  component="a"
                  href={`mailto:${person.email}`}
                  style={{ textDecoration: "none" }}
                  c="blue"
                >
                  {person.email}
                </Text>
              </Group>
            </div>
          </Group>
          <Button
            leftSection={<IconEdit size={16} />}
            variant="light"
            onClick={onEdit}
          >
            Edit Person
          </Button>
        </Group>
      </div>

      <Paper withBorder p="lg">
        <Stack gap="md">
          <Text size="md" fw={600}>
            Details
          </Text>

          <div>
            <Text size="sm" c="dimmed" mb={4}>
              Available Hours per Week
            </Text>
            <Group gap="xs">
              <IconClock size={16} />
              <Text size="md" className="numeric-data">
                {person.available_hours_per_week} hrs
              </Text>
            </Group>
          </div>

          <div>
            <Text size="sm" c="dimmed" mb={4}>
              Working Days
            </Text>
            <Group gap="xs">
              <IconCalendar size={16} />
              <Text size="md">{formatWorkingDays(person.working_days)}</Text>
            </Group>
          </div>

          <div>
            <Text size="sm" c="dimmed" mb={4}>
              Country
            </Text>
            <Group gap="xs">
              <IconWorld size={16} />
              {loadingCountry ? (
                <Text size="md" c="dimmed">
                  Loading...
                </Text>
              ) : country ? (
                <Text size="md">
                  {country.iso_code} - {country.name}
                </Text>
              ) : (
                <Group gap="xs">
                  <Text size="md" c="dimmed">
                    No country selected
                  </Text>
                  <Badge color="yellow" variant="light" size="sm">
                    Holidays not calculated
                  </Badge>
                </Group>
              )}
            </Group>
          </div>

          <div>
            <Text size="sm" c="dimmed" mb={4}>
              Created
            </Text>
            <Text size="md" className="numeric-data">
              {formatDate(person.created_at)}
            </Text>
          </div>
        </Stack>
      </Paper>

      <Paper withBorder p="lg">
        <Stack gap="md">
          <Text size="md" fw={600}>
            Quick Stats
          </Text>
          <Group gap="lg">
            <div>
              <Text size="xs" c="dimmed" mb={4}>
                Status
              </Text>
              <Badge color="green" variant="light">
                Active
              </Badge>
            </div>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}
