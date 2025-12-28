import { ActionIcon, Table, Text } from '@mantine/core';
import { IconEdit, IconTrash, IconEye } from '@tabler/icons-react';
import type { PlanningPeriod } from '../../types';

interface PlanningPeriodListProps {
  periods: PlanningPeriod[];
  onEdit: (period: PlanningPeriod) => void;
  onDelete: (id: number) => void;
  onView: (periodId: number) => void;
}

export function PlanningPeriodList({ periods, onEdit, onDelete, onView }: PlanningPeriodListProps) {
  if (periods.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No planning periods found. Create your first planning period to get started.
      </Text>
    );
  }

  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          <Table.Th>Start Date</Table.Th>
          <Table.Th>End Date</Table.Th>
          <Table.Th>Duration (days)</Table.Th>
          <Table.Th style={{ width: 100 }}>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {periods.map((period) => {
          const startDate = new Date(period.start_date);
          const endDate = new Date(period.end_date);
          const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          
          return (
            <Table.Tr key={period.id} style={{ cursor: 'pointer' }} onClick={() => onView(period.id)}>
              <Table.Td>
                {period.name || <Text c="dimmed" fs="italic">Unnamed Period</Text>}
              </Table.Td>
              <Table.Td>{startDate.toLocaleDateString()}</Table.Td>
              <Table.Td>{endDate.toLocaleDateString()}</Table.Td>
              <Table.Td>{durationDays} days</Table.Td>
              <Table.Td onClick={(e) => e.stopPropagation()}>
                <ActionIcon.Group>
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    onClick={() => onView(period.id)}
                    title="View details"
                  >
                    <IconEye size={18} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    onClick={() => onEdit(period)}
                    title="Edit planning period"
                  >
                    <IconEdit size={18} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => onDelete(period.id)}
                    title="Delete planning period"
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </ActionIcon.Group>
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
