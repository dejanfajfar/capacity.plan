import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "../../test/test-utils";
import { JobForm } from "./JobForm";
import type { Job, CreateJobInput } from "../../types";

describe("JobForm", () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  const defaultProps = {
    opened: true,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
    title: "Add Job",
    job: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  it("renders form fields correctly", () => {
    render(<JobForm {...defaultProps} />);

    expect(screen.getByLabelText(/job name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("does not submit when job name is empty", async () => {
    const user = userEvent.setup();
    render(<JobForm {...defaultProps} />);

    // Try to submit with empty name
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Should not have called submit because validation failed
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("submits form with valid data", async () => {
    const user = userEvent.setup();
    render(<JobForm {...defaultProps} />);

    await user.type(screen.getByLabelText(/job name/i), "Senior Developer");
    await user.type(
      screen.getByLabelText(/description/i),
      "Senior level developer role",
    );
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: "Senior Developer",
        description: "Senior level developer role",
      } satisfies CreateJobInput);
    });
  });

  it("calls onClose when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(<JobForm {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("pre-fills form when editing existing job", () => {
    const existingJob: Job = {
      id: 1,
      name: "Existing Job",
      description: "Existing description",
      created_at: new Date().toISOString(),
    };

    render(<JobForm {...defaultProps} job={existingJob} title="Edit Job" />);

    expect(screen.getByLabelText(/job name/i)).toHaveValue("Existing Job");
    expect(screen.getByLabelText(/description/i)).toHaveValue(
      "Existing description",
    );
  });

  it("handles submission error gracefully", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockOnSubmit.mockRejectedValue(new Error("Failed to save"));

    const user = userEvent.setup();
    render(<JobForm {...defaultProps} />);

    await user.type(screen.getByLabelText(/job name/i), "Test Job");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to save job:",
        expect.any(Error),
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("resets form when modal is opened without a job", async () => {
    // First render with a job
    const existingJob: Job = {
      id: 1,
      name: "Existing Job",
      description: "Existing description",
      created_at: new Date().toISOString(),
    };

    const { rerender } = render(
      <JobForm {...defaultProps} opened={true} job={existingJob} />,
    );

    expect(screen.getByLabelText(/job name/i)).toHaveValue("Existing Job");

    // Close the modal
    rerender(<JobForm {...defaultProps} opened={false} job={null} />);

    // Reopen without a job
    rerender(<JobForm {...defaultProps} opened={true} job={null} />);

    // Form should be empty when opened without a job
    await waitFor(() => {
      expect(screen.getByLabelText(/job name/i)).toHaveValue("");
    });
  });

  it("handles jobs with null description", () => {
    const jobWithNullDescription: Job = {
      id: 1,
      name: "Job Without Description",
      description: null,
      created_at: new Date().toISOString(),
    };

    render(<JobForm {...defaultProps} job={jobWithNullDescription} />);

    expect(screen.getByLabelText(/job name/i)).toHaveValue(
      "Job Without Description",
    );
    expect(screen.getByLabelText(/description/i)).toHaveValue("");
  });
});
