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
import { IconMail, IconClock, IconEdit, IconWorld } from "@tabler/icons-react";
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
