import { AppShell, Burger, Group, Text, NavLink, ActionIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  IconCalendar, 
  IconUsers, 
  IconFolder,
  IconSun,
  IconMoon,
} from '@tabler/icons-react';
import { useTheme } from '../../contexts/ThemeContext';

export function AppLayout() {
  const [opened, { toggle }] = useDisclosure();
  const location = useLocation();
  const { colorScheme, toggleColorScheme } = useTheme();

  const navItems = [
    { to: '/planning', label: 'Planning Periods', icon: <IconCalendar size={20} /> },
    { to: '/projects', label: 'Projects', icon: <IconFolder size={20} /> },
    { to: '/people', label: 'People', icon: <IconUsers size={20} /> },
  ];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text size="xl" fw={700}>Capacity Planner</Text>
          </Group>
          
          <ActionIcon
            variant="subtle"
            size="lg"
            onClick={toggleColorScheme}
            title={`Switch to ${colorScheme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
          </ActionIcon>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section grow>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              component={Link}
              to={item.to}
              label={item.label}
              leftSection={item.icon}
              active={location.pathname === item.to}
              mb="xs"
            />
          ))}
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
