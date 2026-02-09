import { useState, useEffect, useCallback } from "react";
import {
  Container,
  Title,
  Button,
  Group,
  Paper,
  LoadingOverlay,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { IconPlus, IconBriefcase } from "@tabler/icons-react";
import {
  listJobs,
  listJobOverheadTasks,
  createJob,
  updateJob,
  deleteJob,
  checkJobDependencies,
  createJobOverheadTask,
  updateJobOverheadTask,
  deleteJobOverheadTask,
} from "../lib/tauri";
import type {
  Job,
  JobOverheadTask,
  CreateJobInput,
  CreateJobOverheadTaskInput,
} from "../types";
import { JobForm } from "../components/jobs/JobForm";
import { JobOverheadTaskForm } from "../components/jobs/JobOverheadTaskForm";
import { JobExpandableTable } from "../components/jobs/JobExpandableTable";

export function JobsManagementPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tasks, setTasks] = useState<Map<number, JobOverheadTask[]>>(new Map());
  const [loading, setLoading] = useState(true);

  // Job form state
  const [jobFormOpened, setJobFormOpened] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Task form state
  const [taskFormOpened, setTaskFormOpened] = useState(false);
  const [editingTask, setEditingTask] = useState<JobOverheadTask | null>(null);
  const [taskJobId, setTaskJobId] = useState<number>(0);

  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      const jobList = await listJobs();
      setJobs(jobList);

      // Load tasks for all jobs upfront
      const tasksMap = new Map<number, JobOverheadTask[]>();
      await Promise.all(
        jobList.map(async (job) => {
          const jobTasks = await listJobOverheadTasks(job.id);
          tasksMap.set(job.id, jobTasks);
        }),
      );
      setTasks(tasksMap);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to load jobs",
        color: "red",
      });
      console.error("Failed to load jobs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTasksForJob = useCallback(async (jobId: number) => {
    try {
      const jobTasks = await listJobOverheadTasks(jobId);
      setTasks((prev) => {
        const newTasks = new Map(prev);
        newTasks.set(jobId, jobTasks);
        return newTasks;
      });
    } catch (error) {
      console.error("Failed to load tasks for job:", error);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Job CRUD handlers
  const handleCreateJob = async (values: CreateJobInput) => {
    try {
      await createJob(values);
      notifications.show({
        title: "Success",
        message: "Job created successfully",
        color: "green",
      });
      loadJobs();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: `Failed to create job: ${error}`,
        color: "red",
      });
      throw error;
    }
  };

  const handleUpdateJob = async (values: CreateJobInput) => {
    if (!editingJob) return;
    try {
      await updateJob(editingJob.id, values);
      notifications.show({
        title: "Success",
        message: "Job updated successfully",
        color: "green",
      });
      loadJobs();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: `Failed to update job: ${error}`,
        color: "red",
      });
      throw error;
    }
  };

  const handleDeleteJob = async (job: Job) => {
    try {
      const deps = await checkJobDependencies(job.id);
      const hasAssignments = deps.assignment_count > 0;

      modals.openConfirmModal({
        title: "Delete Job",
        children: (
          <Text size="sm">
            Are you sure you want to delete "{job.name}"?
            {deps.task_count > 0 && (
              <>
                <br />
                <br />
                This will also delete {deps.task_count} overhead task(s).
              </>
            )}
            {hasAssignments && (
              <>
                <br />
                <br />
                <Text c="red" fw={500}>
                  Warning: This job is assigned to {deps.assignment_count}{" "}
                  person(s) in various planning periods. These assignments will
                  be removed.
                </Text>
              </>
            )}
          </Text>
        ),
        labels: { confirm: "Delete", cancel: "Cancel" },
        confirmProps: { color: "red" },
        onConfirm: async () => {
          try {
            await deleteJob(job.id);
            notifications.show({
              title: "Success",
              message: "Job deleted successfully",
              color: "green",
            });
            loadJobs();
          } catch (error) {
            notifications.show({
              title: "Error",
              message: `Failed to delete job: ${error}`,
              color: "red",
            });
          }
        },
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: `Failed to check job dependencies: ${error}`,
        color: "red",
      });
    }
  };

  // Task CRUD handlers
  const handleCreateTask = async (values: CreateJobOverheadTaskInput) => {
    try {
      await createJobOverheadTask(values);
      notifications.show({
        title: "Success",
        message: "Overhead task created successfully",
        color: "green",
      });
      loadTasksForJob(values.job_id);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: `Failed to create overhead task: ${error}`,
        color: "red",
      });
      throw error;
    }
  };

  const handleUpdateTask = async (values: CreateJobOverheadTaskInput) => {
    if (!editingTask) return;
    try {
      await updateJobOverheadTask(editingTask.id, values);
      notifications.show({
        title: "Success",
        message: "Overhead task updated successfully",
        color: "green",
      });
      loadTasksForJob(editingTask.job_id);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: `Failed to update overhead task: ${error}`,
        color: "red",
      });
      throw error;
    }
  };

  const handleDeleteTask = async (task: JobOverheadTask) => {
    modals.openConfirmModal({
      title: "Delete Overhead Task",
      children: (
        <Text size="sm">
          Are you sure you want to delete "{task.name}"? This action cannot be
          undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteJobOverheadTask(task.id);
          notifications.show({
            title: "Success",
            message: "Overhead task deleted successfully",
            color: "green",
          });
          loadTasksForJob(task.job_id);
        } catch (error) {
          notifications.show({
            title: "Error",
            message: `Failed to delete overhead task: ${error}`,
            color: "red",
          });
        }
      },
    });
  };

  // UI handlers
  const openCreateJobForm = () => {
    setEditingJob(null);
    setJobFormOpened(true);
  };

  const openEditJobForm = (job: Job) => {
    setEditingJob(job);
    setJobFormOpened(true);
  };

  const openCreateTaskForm = (job: Job) => {
    setTaskJobId(job.id);
    setEditingTask(null);
    setTaskFormOpened(true);
  };

  const openEditTaskForm = (task: JobOverheadTask) => {
    setTaskJobId(task.job_id);
    setEditingTask(task);
    setTaskFormOpened(true);
  };

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="lg">
        <Group>
          <IconBriefcase size={32} />
          <div>
            <Title order={1}>Jobs</Title>
            <Text size="sm" c="dimmed">
              Define job templates with predefined overhead tasks
            </Text>
          </div>
        </Group>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={openCreateJobForm}
        >
          Add Job
        </Button>
      </Group>

      <Paper pos="relative" p="md">
        <LoadingOverlay visible={loading} />
        <JobExpandableTable
          jobs={jobs}
          tasks={tasks}
          onEditJob={openEditJobForm}
          onDeleteJob={handleDeleteJob}
          onAddTask={openCreateTaskForm}
          onEditTask={openEditTaskForm}
          onDeleteTask={handleDeleteTask}
          onExpandJob={loadTasksForJob}
        />
      </Paper>

      {/* Job Form Modal */}
      <JobForm
        opened={jobFormOpened}
        onClose={() => setJobFormOpened(false)}
        onSubmit={editingJob ? handleUpdateJob : handleCreateJob}
        job={editingJob}
        title={editingJob ? "Edit Job" : "Create Job"}
      />

      {/* Task Form Modal */}
      <JobOverheadTaskForm
        opened={taskFormOpened}
        onClose={() => setTaskFormOpened(false)}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        jobId={taskJobId}
        task={editingTask}
        title={editingTask ? "Edit Overhead Task" : "Add Overhead Task"}
      />
    </Container>
  );
}
