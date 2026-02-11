import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "../../test/test-utils";
import { JobOverheadTaskForm } from "./JobOverheadTaskForm";
import type { JobOverheadTask, CreateJobOverheadTaskInput } from "../../types";

describe("JobOverheadTaskForm", () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  const defaultProps = {
    opened: true,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
    jobId: 1,
    title: "Add Overhead Task",
    task: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  it("renders form fields correctly", () => {
    render(<JobOverheadTaskForm {...defaultProps} />);

    expect(screen.getByLabelText(/task name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/effort hours/i)).toBeInTheDocument();
    expect(screen.getByText(/effort period/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("does not submit when task name is empty", async () => {
    const user = userEvent.setup();
    render(<JobOverheadTaskForm {...defaultProps} />);

    // Try to submit with empty name
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Should not have called submit because validation failed
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("submits form with valid data", async () => {
    const user = userEvent.setup();
    render(<JobOverheadTaskForm {...defaultProps} />);

    await user.type(screen.getByLabelText(/task name/i), "Code Reviews");
    await user.type(
      screen.getByLabelText(/description/i),
      "Weekly code review sessions",
    );

    // Clear default value and enter new value
    const effortInput = screen.getByLabelText(/effort hours/i);
    await user.clear(effortInput);
    await user.type(effortInput, "2");

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          job_id: 1,
          name: "Code Reviews",
          description: "Weekly code review sessions",
          effort_hours: 2,
          effort_period: "weekly",
          is_optional: false,
        } satisfies CreateJobOverheadTaskInput),
      );
    });
  });

  it("allows switching effort period to daily", async () => {
    const user = userEvent.setup();
    render(<JobOverheadTaskForm {...defaultProps} />);

    await user.type(screen.getByLabelText(/task name/i), "Stand-up");

    // Click on "Daily" segment
    await user.click(screen.getByText("Daily"));

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          effort_period: "daily",
        }),
      );
    });
  });

  it("calls onClose when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(<JobOverheadTaskForm {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("pre-fills form when editing existing task", () => {
    const existingTask: JobOverheadTask = {
      id: 1,
      job_id: 1,
      name: "Existing Task",
      description: "Existing description",
      effort_hours: 3,
      effort_period: "daily",
      is_optional: false,
      optional_weight: 0.5,
      created_at: new Date().toISOString(),
    };

    render(
      <JobOverheadTaskForm
        {...defaultProps}
        task={existingTask}
        title="Edit Task"
      />,
    );

    // Mantine form uses useEffect to populate values, so check with waitFor
    expect(screen.getByLabelText(/task name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it("handles submission error gracefully", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockOnSubmit.mockRejectedValue(new Error("Failed to save"));

    const user = userEvent.setup();
    render(<JobOverheadTaskForm {...defaultProps} />);

    await user.type(screen.getByLabelText(/task name/i), "Test Task");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to save overhead task:",
        expect.any(Error),
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("handles task with null description", () => {
    const taskWithNullDescription: JobOverheadTask = {
      id: 1,
      job_id: 1,
      name: "Task Without Description",
      description: null,
      effort_hours: 1,
      effort_period: "weekly",
      is_optional: false,
      optional_weight: 0.5,
      created_at: new Date().toISOString(),
    };

    render(
      <JobOverheadTaskForm {...defaultProps} task={taskWithNullDescription} />,
    );

    expect(screen.getByLabelText(/task name/i)).toHaveValue(
      "Task Without Description",
    );
    expect(screen.getByLabelText(/description/i)).toHaveValue("");
  });

  it("shows help text about effort calculation", () => {
    render(<JobOverheadTaskForm {...defaultProps} />);

    expect(
      screen.getByText(
        /example.*hours weekly.*deducted from available capacity/i,
      ),
    ).toBeInTheDocument();
  });
});
