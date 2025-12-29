import { useState, useEffect } from "react";
import {
  Paper,
  Table,
  NumberInput,
  Button,
  Group,
  Stack,
  Text,
  LoadingOverlay,
  Select,
} from "@mantine/core";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import type {
  Project,
  ProjectRequirement,
  CreateProjectRequirementInput,
} from "../../types";
import {
  listProjects,
  listProjectRequirements,
  batchUpsertProjectRequirements,
} from "../../lib/tauri";

interface ProjectRequirementManagerProps {
  periodId: number;
}

interface ProjectRequirementRow {
  project: Project;
  requiredHours: number;
  priority: number;
}

const PRIORITY_OPTIONS = [
  { value: "0", label: "Low" },
  { value: "10", label: "Medium" },
  { value: "20", label: "High" },
  { value: "30", label: "Blocker" },
];

export function ProjectRequirementManager({
  periodId,
}: ProjectRequirementManagerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [rows, setRows] = useState<ProjectRequirementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [periodId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allProjects, existingRequirements] = await Promise.all([
        listProjects(),
        listProjectRequirements(periodId),
      ]);

      setProjects(allProjects);

      // Create a map of project_id -> { hours, priority }
      const requirementsMap = new Map<
        number,
        { hours: number; priority: number }
      >();
      existingRequirements.forEach((req: ProjectRequirement) => {
        requirementsMap.set(req.project_id, {
          hours: req.required_hours,
          priority: req.priority,
        });
      });

      // Create rows combining projects with their requirements
      const projectRows = allProjects.map((project: Project) => {
        const existing = requirementsMap.get(project.id);
        return {
          project,
          requiredHours: existing?.hours || 0,
          priority: existing?.priority || 10, // Default to Medium
        };
      });
      setRows(projectRows);
    } catch (error) {
      console.error("Failed to load data:", error);
      notifications.show({
        title: "Error",
        message: "Failed to load projects and requirements",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHoursChange = (projectId: number, value: number | string) => {
    const hours = typeof value === "string" ? parseFloat(value) || 0 : value;
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.project.id === projectId ? { ...row, requiredHours: hours } : row,
      ),
    );
  };

  const handlePriorityChange = (projectId: number, value: string | null) => {
    const priority = parseInt(value || "10", 10);
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.project.id === projectId ? { ...row, priority } : row,
      ),
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Create array of requirements to upsert
      // Only include projects with hours > 0
      const requirementsToSave: CreateProjectRequirementInput[] = rows
        .filter((row) => row.requiredHours > 0)
        .map((row) => ({
          project_id: row.project.id,
          planning_period_id: periodId,
          required_hours: row.requiredHours,
          priority: row.priority,
        }));

      await batchUpsertProjectRequirements(periodId, requirementsToSave);

      notifications.show({
        title: "Success",
        message: `Updated requirements for ${requirementsToSave.length} project${requirementsToSave.length !== 1 ? "s" : ""}`,
        color: "green",
      });

      // Reload to get fresh data
      await loadData();
    } catch (error) {
      console.error("Failed to save requirements:", error);
      notifications.show({
        title: "Error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to save project requirements",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  if (projects.length === 0 && !loading) {
    return (
      <Paper p="xl" ta="center" withBorder>
        <Text c="dimmed" size="lg">
          No projects found. Create projects first in the Projects menu.
        </Text>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      <Paper p="md" withBorder bg="blue.0">
        <Text size="sm" c="blue.9">
          Set the required hours and priority for each project in this planning
          period. Priority affects allocation order: Blocker → High → Medium →
          Low. Only projects with hours &gt; 0 will be saved. You must define
          project requirements before creating assignments.
        </Text>
      </Paper>

      <Paper p="md" withBorder pos="relative">
        <LoadingOverlay visible={loading || saving} />

        <Group justify="space-between" mb="md">
          <Text fw={500} size="lg">
            Project Requirements
          </Text>
          <Button
            leftSection={<IconDeviceFloppy size={18} />}
            onClick={handleSave}
            disabled={loading || saving}
          >
            Save All Changes
          </Button>
        </Group>

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Project Name</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th style={{ width: 150 }}>Priority</Table.Th>
              <Table.Th style={{ width: 200 }}>Required Hours</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={row.project.id}>
                <Table.Td>{row.project.name}</Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed" lineClamp={1}>
                    {row.project.description || "—"}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Select
                    value={String(row.priority)}
                    onChange={(value) =>
                      handlePriorityChange(row.project.id, value)
                    }
                    data={PRIORITY_OPTIONS}
                    disabled={saving}
                  />
                </Table.Td>
                <Table.Td>
                  <NumberInput
                    value={row.requiredHours}
                    onChange={(value) =>
                      handleHoursChange(row.project.id, value)
                    }
                    min={0}
                    step={1}
                    suffix=" hrs"
                    placeholder="0"
                    disabled={saving}
                  />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <Group justify="flex-end" mt="md">
          <Button
            leftSection={<IconDeviceFloppy size={18} />}
            onClick={handleSave}
            disabled={loading || saving}
          >
            Save All Changes
          </Button>
        </Group>
      </Paper>
    </Stack>
  );
}
