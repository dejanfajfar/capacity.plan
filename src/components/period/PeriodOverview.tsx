import { useState, useEffect } from 'react';
import { Paper, Title, Text, Group, Stack, Button, Grid } from '@mantine/core';
import { IconEdit, IconTrash, IconCalendar, IconUsers, IconTarget, IconClipboardList } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import type { PlanningPeriod } from '../../types';
import { 
  listProjectRequirements, 
  listAssignments,
  deletePlanningPeriod,
} from '../../lib/tauri';
import { useNavigate } from 'react-router-dom';

interface PeriodOverviewProps {
  period: PlanningPeriod;
  onReload: () => void;
}

export function PeriodOverview({ period, onReload }: PeriodOverviewProps) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    requirementsCount: 0,
    assignmentsCount: 0,
    uniquePeopleCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [period.id]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [requirements, assignments] = await Promise.all([
        listProjectRequirements(period.id),
        listAssignments(period.id),
      ]);

      const uniquePeople = new Set(assignments.map(a => a.person_id));

      setStats({
        requirementsCount: requirements.length,
        assignmentsCount: assignments.length,
        uniquePeopleCount: uniquePeople.size,
      });
    } catch (error) {
      console.error('Failed to load period stats:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load period statistics',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(
      `Are you sure you want to delete "${period.name || 'Unnamed Period'}"? ` +
      `This will also delete all project requirements and assignments associated with this period. ` +
      `This action cannot be undone.`
    )) return;

    try {
      await deletePlanningPeriod(period.id);
      notifications.show({
        title: 'Success',
        message: 'Planning period deleted successfully',
        color: 'green',
      });
      navigate('/planning');
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to delete planning period',
        color: 'red',
      });
    }
  };

  const calculateDuration = () => {
    const start = new Date(period.start_date);
    const end = new Date(period.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    
    return { days: diffDays, weeks: diffWeeks };
  };

  const duration = calculateDuration();

  return (
    <Stack gap="md">
      <Paper p="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={2}>{period.name || 'Unnamed Period'}</Title>
          <Group>
            <Button 
              variant="light" 
              leftSection={<IconEdit size={16} />}
              onClick={onReload}
            >
              Edit
            </Button>
            <Button 
              variant="light" 
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </Group>
        </Group>

        <Grid>
          <Grid.Col span={6}>
            <Group gap="xs" mb="xs">
              <IconCalendar size={20} />
              <Text fw={500}>Duration</Text>
            </Group>
            <Text size="sm" c="dimmed">
              {new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()}
            </Text>
            <Text size="sm" c="dimmed">
              {duration.days} days ({duration.weeks} weeks)
            </Text>
          </Grid.Col>

          <Grid.Col span={6}>
            <Group gap="xs" mb="xs">
              <IconTarget size={20} />
              <Text fw={500}>Project Requirements</Text>
            </Group>
            <Text size="lg" fw={700}>
              {loading ? '...' : stats.requirementsCount}
            </Text>
            <Text size="sm" c="dimmed">
              {stats.requirementsCount === 0 
                ? 'No projects configured yet' 
                : `${stats.requirementsCount} project${stats.requirementsCount !== 1 ? 's' : ''} with requirements`
              }
            </Text>
          </Grid.Col>

          <Grid.Col span={6}>
            <Group gap="xs" mb="xs">
              <IconClipboardList size={20} />
              <Text fw={500}>Assignments</Text>
            </Group>
            <Text size="lg" fw={700}>
              {loading ? '...' : stats.assignmentsCount}
            </Text>
            <Text size="sm" c="dimmed">
              {stats.assignmentsCount === 0 
                ? 'No assignments created yet' 
                : `${stats.assignmentsCount} assignment${stats.assignmentsCount !== 1 ? 's' : ''}`
              }
            </Text>
          </Grid.Col>

          <Grid.Col span={6}>
            <Group gap="xs" mb="xs">
              <IconUsers size={20} />
              <Text fw={500}>People Assigned</Text>
            </Group>
            <Text size="lg" fw={700}>
              {loading ? '...' : stats.uniquePeopleCount}
            </Text>
            <Text size="sm" c="dimmed">
              {stats.uniquePeopleCount === 0 
                ? 'No people assigned yet' 
                : `${stats.uniquePeopleCount} ${stats.uniquePeopleCount !== 1 ? 'people' : 'person'} working on projects`
              }
            </Text>
          </Grid.Col>
        </Grid>
      </Paper>

      {stats.requirementsCount === 0 && (
        <Paper p="md" withBorder bg="blue.0">
          <Text size="sm" c="blue.9">
            <strong>Next Step:</strong> Go to the "Project Requirements" tab to set required hours for each project in this planning period.
          </Text>
        </Paper>
      )}

      {stats.requirementsCount > 0 && stats.assignmentsCount === 0 && (
        <Paper p="md" withBorder bg="blue.0">
          <Text size="sm" c="blue.9">
            <strong>Next Step:</strong> Go to the "Assignments" tab to assign people to projects for this planning period.
          </Text>
        </Paper>
      )}
    </Stack>
  );
}
