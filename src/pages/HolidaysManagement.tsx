import { Container, Title, Stack, Text, Tabs } from "@mantine/core";
import { IconCalendar, IconWorld } from "@tabler/icons-react";
import { HolidayManager } from "../components/holidays/HolidayManager";
import { CountryManager } from "../components/countries/CountryManager";

export function HolidaysManagementPage() {
  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <div>
          <Title order={1}>Holidays Management</Title>
          <Text c="dimmed" size="sm">
            Manage country-specific holidays that reduce available capacity for
            people assigned to those countries.
          </Text>
        </div>

        <Tabs defaultValue="holidays">
          <Tabs.List>
            <Tabs.Tab value="holidays" leftSection={<IconCalendar size={16} />}>
              Holidays
            </Tabs.Tab>
            <Tabs.Tab value="countries" leftSection={<IconWorld size={16} />}>
              Countries
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="holidays" pt="lg">
            <HolidayManager />
          </Tabs.Panel>

          <Tabs.Panel value="countries" pt="lg">
            <CountryManager />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
