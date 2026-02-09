import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { PlanningPeriodForm } from "./PlanningPeriodForm";
import type { PlanningPeriod } from "../../types";

function renderWithMantine(ui: React.ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe("PlanningPeriodForm", () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  describe("rendering", () => {
    it("renders the modal with title when opened", () => {
      renderWithMantine(
        <PlanningPeriodForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Planning Period"
        />,
      );

      expect(screen.getByText("Add Planning Period")).toBeInTheDocument();
    });

    it("renders name input with optional label", () => {
      renderWithMantine(
        <PlanningPeriodForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Planning Period"
        />,
      );

      expect(screen.getByText("Name (optional)")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("e.g., Q1 2024, Spring Planning"),
      ).toBeInTheDocument();
    });

    it("renders start date input", () => {
      renderWithMantine(
        <PlanningPeriodForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Planning Period"
        />,
      );

      expect(screen.getByText("Start Date")).toBeInTheDocument();
    });

    it("renders end date input", () => {
      renderWithMantine(
        <PlanningPeriodForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Planning Period"
        />,
      );

      expect(screen.getByText("End Date")).toBeInTheDocument();
    });

    it("renders Create button in create mode", () => {
      renderWithMantine(
        <PlanningPeriodForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Planning Period"
        />,
      );

      expect(
        screen.getByRole("button", { name: "Create" }),
      ).toBeInTheDocument();
    });

    it("renders Update button in edit mode", () => {
      const period: PlanningPeriod = {
        id: 1,
        name: "Q1 2024",
        start_date: "2024-01-01",
        end_date: "2024-03-31",
        created_at: "2024-01-01T00:00:00Z",
      };

      renderWithMantine(
        <PlanningPeriodForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          period={period}
          title="Edit Planning Period"
        />,
      );

      expect(
        screen.getByRole("button", { name: "Update" }),
      ).toBeInTheDocument();
    });

    it("renders Cancel button", () => {
      renderWithMantine(
        <PlanningPeriodForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Planning Period"
        />,
      );

      expect(
        screen.getByRole("button", { name: "Cancel" }),
      ).toBeInTheDocument();
    });
  });

  describe("validation", () => {
    it("shows error when end date is before start date", async () => {
      const user = userEvent.setup();

      renderWithMantine(
        <PlanningPeriodForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Planning Period"
        />,
      );

      const startDateInput = screen.getByLabelText(/Start Date/);
      const endDateInput = screen.getByLabelText(/End Date/);

      await user.clear(startDateInput);
      await user.type(startDateInput, "2024-03-01");

      await user.clear(endDateInput);
      await user.type(endDateInput, "2024-01-01");

      await user.click(screen.getByRole("button", { name: "Create" }));

      await waitFor(() => {
        expect(
          screen.getByText("End date must be after start date"),
        ).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("accepts valid date range", async () => {
      const user = userEvent.setup();

      renderWithMantine(
        <PlanningPeriodForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Planning Period"
        />,
      );

      const startDateInput = screen.getByLabelText(/Start Date/);
      const endDateInput = screen.getByLabelText(/End Date/);

      await user.clear(startDateInput);
      await user.type(startDateInput, "2024-01-01");

      await user.clear(endDateInput);
      await user.type(endDateInput, "2024-03-31");

      await user.click(screen.getByRole("button", { name: "Create" }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });
  });

  describe("edit mode", () => {
    it("pre-fills form with period data", () => {
      const period: PlanningPeriod = {
        id: 1,
        name: "Q1 2024",
        start_date: "2024-01-01",
        end_date: "2024-03-31",
        created_at: "2024-01-01T00:00:00Z",
      };

      renderWithMantine(
        <PlanningPeriodForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          period={period}
          title="Edit Planning Period"
        />,
      );

      expect(
        screen.getByPlaceholderText("e.g., Q1 2024, Spring Planning"),
      ).toHaveValue("Q1 2024");
      expect(screen.getByLabelText(/Start Date/)).toHaveValue("2024-01-01");
      expect(screen.getByLabelText(/End Date/)).toHaveValue("2024-03-31");
    });

    it("handles null name gracefully", () => {
      const period: PlanningPeriod = {
        id: 1,
        name: null,
        start_date: "2024-01-01",
        end_date: "2024-03-31",
        created_at: "2024-01-01T00:00:00Z",
      };

      renderWithMantine(
        <PlanningPeriodForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          period={period}
          title="Edit Planning Period"
        />,
      );

      expect(
        screen.getByPlaceholderText("e.g., Q1 2024, Spring Planning"),
      ).toHaveValue("");
    });
  });

  describe("submission", () => {
    it("calls onSubmit with form values", async () => {
      const user = userEvent.setup();

      renderWithMantine(
        <PlanningPeriodForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Planning Period"
        />,
      );

      const nameInput = screen.getByPlaceholderText(
        "e.g., Q1 2024, Spring Planning",
      );
      const startDateInput = screen.getByLabelText(/Start Date/);
      const endDateInput = screen.getByLabelText(/End Date/);

      await user.type(nameInput, "Q2 2024");
      await user.clear(startDateInput);
      await user.type(startDateInput, "2024-04-01");
      await user.clear(endDateInput);
      await user.type(endDateInput, "2024-06-30");

      await user.click(screen.getByRole("button", { name: "Create" }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: "Q2 2024",
          start_date: "2024-04-01",
          end_date: "2024-06-30",
        });
      });
    });

    it("calls onClose after successful submission", async () => {
      const user = userEvent.setup();

      renderWithMantine(
        <PlanningPeriodForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Planning Period"
        />,
      );

      await user.click(screen.getByRole("button", { name: "Create" }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("does not call onClose on submission error", async () => {
      const user = userEvent.setup();
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockOnSubmit.mockRejectedValue(new Error("Submit failed"));

      renderWithMantine(
        <PlanningPeriodForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Planning Period"
        />,
      );

      await user.click(screen.getByRole("button", { name: "Create" }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      // onClose should NOT be called when submission fails
      expect(mockOnClose).not.toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });

  describe("cancel button", () => {
    it("calls onClose when Cancel is clicked", async () => {
      const user = userEvent.setup();

      renderWithMantine(
        <PlanningPeriodForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Planning Period"
        />,
      );

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("name field", () => {
    it("allows empty name since it is optional", async () => {
      const user = userEvent.setup();

      renderWithMantine(
        <PlanningPeriodForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Planning Period"
        />,
      );

      // Just submit with default dates (name is empty by default)
      await user.click(screen.getByRole("button", { name: "Create" }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      // Check name is empty in the submitted values
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "",
        }),
      );
    });
  });

  describe("date equality edge case", () => {
    it("accepts when start date equals end date (single day period)", async () => {
      const user = userEvent.setup();

      renderWithMantine(
        <PlanningPeriodForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Planning Period"
        />,
      );

      const startDateInput = screen.getByLabelText(/Start Date/);
      const endDateInput = screen.getByLabelText(/End Date/);

      await user.clear(startDateInput);
      await user.type(startDateInput, "2024-01-15");

      await user.clear(endDateInput);
      await user.type(endDateInput, "2024-01-15");

      await user.click(screen.getByRole("button", { name: "Create" }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: "",
          start_date: "2024-01-15",
          end_date: "2024-01-15",
        });
      });
    });
  });
});
