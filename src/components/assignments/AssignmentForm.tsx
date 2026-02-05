import { useState, useEffect } from "react";
import {
  TextInput,
  Button,
  Modal,
  Group,
  Stack,
  NumberInput,
  Select,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import type {
  Assignment,
  CreateAssignmentInput,
  Person,
  Project,
  PlanningPeriod,
} from "../../types";
import { listPeople, listProjects } from "../../lib/tauri";
import {
  PROFICIENCY_LEVELS,
  DEFAULT_PROFICIENCY_FACTOR,
  CUSTOM_PROFICIENCY_VALUE,
  getProficiencyByFactor,
} from "../../constants/proficiency";

interface AssignmentFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: CreateAssignmentInput) => Promise<void>;
  assignment?: Assignment | null;
  planningPeriod: PlanningPeriod;
  title: string;
}

export function AssignmentForm({
  opened,
  onClose,
  onSubmit,
  assignment,
  planningPeriod,
  title,
}: AssignmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isCustomProficiency, setIsCustomProficiency] = useState(false);
  const [selectedProficiency, setSelectedProficiency] =
    useState<string>("proficient");

  useEffect(() => {
    if (opened) {
      loadFormData();
    }
  }, [opened]);

  const loadFormData = async () => {
    try {
      setLoadingData(true);
      const [peopleData, projectsData] = await Promise.all([
        listPeople(),
        listProjects(),
      ]);
      setPeople(peopleData);
      setProjects(projectsData);
    } catch (error) {
      console.error("Failed to load form data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const form = useForm<CreateAssignmentInput>({
    initialValues: {
      person_id: 0,
      project_id: 0,
      planning_period_id: planningPeriod.id,
      productivity_factor: DEFAULT_PROFICIENCY_FACTOR,
      start_date: planningPeriod.start_date,
      end_date: planningPeriod.end_date,
    },
    validate: {
      person_id: (value) => (value <= 0 ? "Please select a person" : null),
      project_id: (value) => (value <= 0 ? "Please select a project" : null),
      productivity_factor: (value) => {
        if (value < 0) return "Productivity factor cannot be negative";
        if (value > 1) return "Productivity factor cannot exceed 1.0";
        return null;
      },
      start_date: (value) => {
        if (!value) return "Start date is required";
        if (value < planningPeriod.start_date) {
          return "Start date must be within the planning period";
        }
        if (value > planningPeriod.end_date) {
          return "Start date must be within the planning period";
        }
        return null;
      },
      end_date: (value, values) => {
        if (!value) return "End date is required";
        if (
          value < planningPeriod.start_date ||
          value > planningPeriod.end_date
        ) {
          return "End date must be within the planning period";
        }
        if (values.start_date && value < values.start_date) {
          return "End date must be after start date";
        }
        return null;
      },
    },
  });

  // Update form values when modal opens or assignment changes
  useEffect(() => {
    if (opened) {
      if (assignment) {
        // Edit mode - populate with assignment's data
        const factor = assignment.productivity_factor;
        const preset = getProficiencyByFactor(factor);

        if (preset) {
          setSelectedProficiency(preset.value);
          setIsCustomProficiency(false);
        } else {
          setSelectedProficiency(CUSTOM_PROFICIENCY_VALUE);
          setIsCustomProficiency(true);
        }

        form.setValues({
          person_id: assignment.person_id,
          project_id: assignment.project_id,
          planning_period_id: assignment.planning_period_id,
          productivity_factor: assignment.productivity_factor,
          start_date: assignment.start_date,
          end_date: assignment.end_date,
        });
        form.clearErrors();
      } else {
        // Create mode - reset to defaults
        setSelectedProficiency("proficient");
        setIsCustomProficiency(false);

        form.setValues({
          person_id: 0,
          project_id: 0,
          planning_period_id: planningPeriod.id,
          productivity_factor: DEFAULT_PROFICIENCY_FACTOR,
          start_date: planningPeriod.start_date,
          end_date: planningPeriod.end_date,
        });
        form.clearErrors();
      }
    }
  }, [opened, assignment, planningPeriod]);

  // Handle proficiency selection change
  const handleProficiencyChange = (value: string | null) => {
    if (!value) return;

    if (value === CUSTOM_PROFICIENCY_VALUE) {
      setIsCustomProficiency(true);
      setSelectedProficiency(value);
      // Keep current factor value
    } else {
      setIsCustomProficiency(false);
      setSelectedProficiency(value);
      const level = PROFICIENCY_LEVELS.find((l) => l.value === value);
      if (level) {
        form.setFieldValue("productivity_factor", level.factor);
      }
    }
  };

  const handleSubmit = async (values: CreateAssignmentInput) => {
    setLoading(true);
    try {
      await onSubmit(values);
      form.reset();
      onClose();
    } catch (error) {
      console.error("Failed to save assignment:", error);
    } finally {
      setLoading(false);
    }
  };

  const personOptions = people.map((person) => ({
    value: person.id.toString(),
    label: person.name,
  }));

  const projectOptions = projects.map((project) => ({
    value: project.id.toString(),
    label: project.name,
  }));

  // Build proficiency options for dropdown
  const proficiencyOptions = [
    ...PROFICIENCY_LEVELS.map((level) => ({
      value: level.value,
      label: `${level.label} (${(level.factor * 100).toFixed(0)}%)`,
    })),
    { value: CUSTOM_PROFICIENCY_VALUE, label: "Custom..." },
  ];

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="lg">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <div>
            <Text size="sm" fw={500} mb="xs">
              Planning Period
            </Text>
            <Text size="sm" c="dimmed">
              {planningPeriod.name} (
              {new Date(planningPeriod.start_date).toLocaleDateString()} -{" "}
              {new Date(planningPeriod.end_date).toLocaleDateString()})
            </Text>
          </div>

          <Select
            label="Person"
            placeholder="Select a person"
            data={personOptions}
            required
            disabled={loadingData}
            searchable
            value={
              form.values.person_id > 0
                ? form.values.person_id.toString()
                : null
            }
            onChange={(value) =>
              form.setFieldValue("person_id", value ? parseInt(value) : 0)
            }
            error={form.errors.person_id}
          />

          <Select
            label="Project"
            placeholder="Select a project"
            data={projectOptions}
            required
            disabled={loadingData}
            searchable
            value={
              form.values.project_id > 0
                ? form.values.project_id.toString()
                : null
            }
            onChange={(value) =>
              form.setFieldValue("project_id", value ? parseInt(value) : 0)
            }
            error={form.errors.project_id}
          />

          <Select
            label="Proficiency Level"
            placeholder="Select proficiency level"
            description="Person's expertise/familiarity with this project's technology/domain"
            data={proficiencyOptions}
            required
            value={selectedProficiency}
            onChange={handleProficiencyChange}
          />

          {isCustomProficiency && (
            <NumberInput
              label="Custom Productivity Factor"
              placeholder="0.0 - 1.0"
              description="Multiplier applied to available hours (e.g., 0.5 = 50% productive time)"
              required
              min={0}
              max={1}
              step={0.05}
              decimalScale={2}
              {...form.getInputProps("productivity_factor")}
            />
          )}

          <Group grow>
            <TextInput
              label="Start Date"
              type="date"
              required
              {...form.getInputProps("start_date")}
            />

            <TextInput
              label="End Date"
              type="date"
              required
              {...form.getInputProps("end_date")}
            />
          </Group>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading || loadingData}>
              {assignment ? "Update" : "Create"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
