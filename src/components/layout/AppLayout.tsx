import { useState, useEffect } from "react";
import {
  AppShell,
  Group,
  Text,
  NavLink,
  ActionIcon,
  Box,
  Divider,
  Stack,
} from "@mantine/core";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  IconCalendar,
  IconUsers,
  IconFolder,
  IconSun,
  IconMoon,
  IconCalendarEvent,
  IconBriefcase,
} from "@tabler/icons-react";
import { useTheme } from "../../contexts/ThemeContext";

export function AppLayout() {
  const location = useLocation();
  const { colorScheme, toggleColorScheme } = useTheme();
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    async function fetchVersion() {
      try {
        const { getAppVersion } = await import("../../lib/tauri");
        const appVersion = await getAppVersion();
        setVersion(appVersion);
      } catch (error) {
        console.error("Failed to fetch app version:", error);
        setVersion("");
      }
    }
    fetchVersion();
  }, []);

  const navItems = [
    {
      to: "/planning",
      label: "Planning Periods",
      icon: <IconCalendar size={20} />,
    },
    { to: "/projects", label: "Projects", icon: <IconFolder size={20} /> },
    { to: "/people", label: "People", icon: <IconUsers size={20} /> },
    { to: "/jobs", label: "Jobs", icon: <IconBriefcase size={20} /> },
    {
      to: "/holidays",
      label: "Holidays",
      icon: <IconCalendarEvent size={20} />,
    },
  ];

  return (
    <AppShell navbar={{ width: 280, breakpoint: "xs" }} padding="md">
      <AppShell.Navbar p="md">
        <AppShell.Section>
          <Group justify="space-between" mb="md">
            <Text size="lg" fw={700}>
              Capacity Planner
            </Text>
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={toggleColorScheme}
              title={`Switch to ${colorScheme === "dark" ? "light" : "dark"} mode`}
            >
              {colorScheme === "dark" ? (
                <IconSun size={20} />
              ) : (
                <IconMoon size={20} />
              )}
            </ActionIcon>
          </Group>
          <Divider />
        </AppShell.Section>

        <AppShell.Section grow mt="sm">
          <Stack gap={4}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                component={Link}
                to={item.to}
                label={item.label}
                leftSection={item.icon}
                active={location.pathname.startsWith(item.to)}
              />
            ))}
          </Stack>
        </AppShell.Section>

        {version && (
          <AppShell.Section>
            <Divider mb="sm" />
            <Box px="xs">
              <Text size="xs" c="dimmed">
                v{version}
              </Text>
            </Box>
          </AppShell.Section>
        )}
      </AppShell.Navbar>

      <AppShell.Main>
        <Box
          style={(theme) => ({
            height: "100%",
            borderRadius: theme.radius.md,
            border: `1px solid ${
              colorScheme === "dark" ? "var(--mantine-color-dark-3)" : "#93a1a1"
            }`,
            backgroundColor:
              colorScheme === "dark"
                ? "var(--mantine-color-dark-5)"
                : "#fdf6e3",
            boxShadow:
              colorScheme === "dark"
                ? "0 4px 24px rgba(0, 0, 0, 0.4)"
                : "0 4px 24px rgba(0, 0, 0, 0.12)",
            overflow: "auto",
          })}
        >
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
