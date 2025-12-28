import { AppShell, Burger, Group, Text, NavLink } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  IconCalendar, 
  IconUsers, 
  IconFolder,
} from '@tabler/icons-react';

export function AppLayout() {
  const [opened, { toggle }] = useDisclosure();
  const location = useLocation();

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
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Text size="xl" fw={700}>Capacity Planner</Text>
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
