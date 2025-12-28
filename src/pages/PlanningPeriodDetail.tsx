import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Title, Text, Tabs, LoadingOverlay, Group, Button, Paper } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { 
  IconInfoCircle, 
  IconTarget, 
  IconClipboardList, 
  IconChartBar,
  IconArrowLeft,
} from '@tabler/icons-react';
import { listPlanningPeriods } from '../lib/tauri';
import type { PlanningPeriod } from '../types';
import { PeriodOverview } from '../components/period/PeriodOverview';
import { ProjectRequirementManager } from '../components/requirements/ProjectRequirementManager';
import { AssignmentManager } from '../components/assignments/AssignmentManager';
import { CapacityAnalysis } from '../components/analysis/CapacityAnalysis';

export function PlanningPeriodDetailPage() {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PlanningPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>('overview');

  useEffect(() => {
    loadPeriod();
  }, [periodId]);

  const loadPeriod = async () => {
    if (!periodId) return;
    
    try {
      setLoading(true);
      const periods = await listPlanningPeriods();
      const found = periods.find(p => p.id === parseInt(periodId));
      
      if (!found) {
        notifications.show({
          title: 'Error',
          message: 'Planning period not found',
          color: 'red',
        });
        navigate('/planning');
        return;
      }
      
      setPeriod(found);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load planning period',
        color: 'red',
      });
      console.error('Failed to load planning period:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateRange = (p: PlanningPeriod) => {
    const start = new Date(p.start_date).toLocaleDateString();
    const end = new Date(p.end_date).toLocaleDateString();
    return `${start} - ${end}`;
  };

  if (!periodId) {
    return <Text>Invalid planning period ID</Text>;
  }

  return (
    <Container size="xl" py="md">
      <Paper pos="relative" p="md">
        <LoadingOverlay visible={loading} />
        
        {period && (
          <>
            <Group justify="space-between" mb="lg">
              <div>
                <Group gap="sm" mb="xs">
                  <Button
                    variant="subtle"
                    leftSection={<IconArrowLeft size={16} />}
                    onClick={() => navigate('/planning')}
                    size="sm"
                  >
                    Back to Planning Periods
                  </Button>
                </Group>
                <Title order={1}>{period.name || 'Planning Period'}</Title>
                <Text size="sm" c="dimmed" mt="xs">
                  {formatDateRange(period)}
                </Text>
              </div>
            </Group>

            <Tabs value={activeTab} onChange={setActiveTab}>
              <Tabs.List>
                <Tabs.Tab value="overview" leftSection={<IconInfoCircle size={16} />}>
                  Overview
                </Tabs.Tab>
                <Tabs.Tab value="requirements" leftSection={<IconTarget size={16} />}>
                  Project Requirements
                </Tabs.Tab>
                <Tabs.Tab value="assignments" leftSection={<IconClipboardList size={16} />}>
                  Assignments
                </Tabs.Tab>
                <Tabs.Tab value="analysis" leftSection={<IconChartBar size={16} />}>
                  Capacity Analysis
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="overview" pt="lg">
                <PeriodOverview period={period} onReload={loadPeriod} />
              </Tabs.Panel>

              <Tabs.Panel value="requirements" pt="lg">
                <ProjectRequirementManager periodId={period.id} />
              </Tabs.Panel>

              <Tabs.Panel value="assignments" pt="lg">
                <AssignmentManager periodId={period.id} period={period} />
              </Tabs.Panel>

              <Tabs.Panel value="analysis" pt="lg">
                <CapacityAnalysis periodId={period.id} />
              </Tabs.Panel>
            </Tabs>
          </>
        )}
      </Paper>
    </Container>
  );
}
