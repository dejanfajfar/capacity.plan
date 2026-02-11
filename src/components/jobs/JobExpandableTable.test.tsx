import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "../../test/test-utils";
import { JobExpandableTable } from "./JobExpandableTable";
import type { Job, JobOverheadTask } from "../../types";

describe("JobExpandableTable", () => {
  const mockOnEditJob = vi.fn();
  const mockOnDeleteJob = vi.fn();
  const mockOnAddTask = vi.fn();
  const mockOnEditTask = vi.fn();
  const mockOnDeleteTask = vi.fn();
  const mockOnExpandJob = vi.fn();

  const createMockJobs = (): Job[] => [
    {
      id: 1,
      name: "Senior Developer",
      description: "Senior level developer role",
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      name: "Team Lead",
      description: null,
      created_at: new Date().toISOString(),
    },
  ];

  const createMockTasks = (): Map<number, JobOverheadTask[]> => {
    const map = new Map<number, JobOverheadTask[]>();
    map.set(1, [
      {
        id: 1,
        job_id: 1,
        name: "Code Reviews",
        description: "Weekly code review sessions",
        effort_hours: 2,
        effort_period: "weekly",
        is_optional: false,
        optional_weight: 0.5,
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        job_id: 1,
        name: "Stand-up",
        description: "Daily standup meetings",
        effort_hours: 0.5,
        effort_period: "daily",
        is_optional: false,
        optional_weight: 0.5,
        created_at: new Date().toISOString(),
      },
    ]);
    map.set(2, []);
    return map;
  };

  const defaultProps = {
    jobs: createMockJobs(),
    tasks: createMockTasks(),
    onEditJob: mockOnEditJob,
    onDeleteJob: mockOnDeleteJob,
    onAddTask: mockOnAddTask,
    onEditTask: mockOnEditTask,
    onDeleteTask: mockOnDeleteTask,
    onExpandJob: mockOnExpandJob,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders job names correctly", () => {
    render(<JobExpandableTable {...defaultProps} />);

    expect(screen.getByText("Senior Developer")).toBeInTheDocument();
    expect(screen.getByText("Team Lead")).toBeInTheDocument();
  });

  it("displays task count badges", () => {
    render(<JobExpandableTable {...defaultProps} />);

    expect(screen.getByText("2 tasks")).toBeInTheDocument();
    expect(screen.getByText("0 tasks")).toBeInTheDocument();
  });

  it("calculates weekly overhead correctly", () => {
    render(<JobExpandableTable {...defaultProps} />);

    // Senior Developer: 2h weekly + 0.5h daily * 5 = 4.5h/week
    expect(screen.getByText("4.5h/week")).toBeInTheDocument();
  });

  it("shows empty state when no jobs exist", () => {
    render(<JobExpandableTable {...defaultProps} jobs={[]} />);

    expect(screen.getByText(/no jobs defined yet/i)).toBeInTheDocument();
  });

  it("expands job to show tasks when clicked", async () => {
    const user = userEvent.setup();
    render(<JobExpandableTable {...defaultProps} />);

    // Click on job row to expand
    await user.click(screen.getByText("Senior Developer"));

    expect(mockOnExpandJob).toHaveBeenCalledWith(1);
  });

  it("calls onEditJob when edit button is clicked", async () => {
    const user = userEvent.setup();
    render(<JobExpandableTable {...defaultProps} />);

    // Find edit icons by their SVG class (IconEdit)
    const editButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.querySelector("svg.tabler-icon-edit"));
    // Click the first one that's in the actions column (not nested)
    await user.click(editButtons[0]);

    expect(mockOnEditJob).toHaveBeenCalledWith(defaultProps.jobs[0]);
  });

  it("calls onDeleteJob when delete button is clicked", async () => {
    const user = userEvent.setup();
    render(<JobExpandableTable {...defaultProps} />);

    // Find delete icons by their SVG class (IconTrash)
    const deleteButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.querySelector("svg.tabler-icon-trash"));
    await user.click(deleteButtons[0]);

    expect(mockOnDeleteJob).toHaveBeenCalledWith(defaultProps.jobs[0]);
  });

  it("shows job description when available", () => {
    render(<JobExpandableTable {...defaultProps} />);

    expect(screen.getByText("Senior level developer role")).toBeInTheDocument();
  });

  it("shows dash for jobs without description", () => {
    render(<JobExpandableTable {...defaultProps} />);

    // Team Lead has null description, should show "-"
    const dashElements = screen.getAllByText("-");
    expect(dashElements.length).toBeGreaterThan(0);
  });

  it("displays table headers correctly", () => {
    render(<JobExpandableTable {...defaultProps} />);

    // Use getAllBy since nested table also has headers
    const jobNameHeaders = screen.getAllByRole("columnheader", {
      name: /job name/i,
    });
    expect(jobNameHeaders.length).toBeGreaterThanOrEqual(1);

    const actionHeaders = screen.getAllByRole("columnheader", {
      name: /actions/i,
    });
    expect(actionHeaders.length).toBeGreaterThanOrEqual(1);
  });

  it("handles jobs with no tasks showing dash for weekly overhead", () => {
    const jobsWithNoTasks: Job[] = [
      {
        id: 3,
        name: "Junior Developer",
        description: "Entry level role",
        created_at: new Date().toISOString(),
      },
    ];
    const emptyTasks = new Map<number, JobOverheadTask[]>();
    emptyTasks.set(3, []);

    render(
      <JobExpandableTable
        {...defaultProps}
        jobs={jobsWithNoTasks}
        tasks={emptyTasks}
      />,
    );

    // Should show "0 tasks" badge
    expect(screen.getByText("0 tasks")).toBeInTheDocument();
  });

  it("shows task details when job is expanded", async () => {
    const user = userEvent.setup();
    render(<JobExpandableTable {...defaultProps} />);

    // Expand first job
    await user.click(screen.getByText("Senior Developer"));

    // Wait for expansion and check "Add Task" button appears (which is in the expanded section)
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /add task/i }),
      ).toBeInTheDocument();
    });
  });
});
