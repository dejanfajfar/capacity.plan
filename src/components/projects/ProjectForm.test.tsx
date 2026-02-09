import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { ProjectForm } from "./ProjectForm";
import type { Project } from "../../types";

function renderWithMantine(ui: React.ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe("ProjectForm", () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  describe("rendering", () => {
    it("renders the modal with title when opened", () => {
      renderWithMantine(
        <ProjectForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Project"
        />,
      );

      expect(screen.getByText("Add Project")).toBeInTheDocument();
    });

    it("renders project name input", () => {
      renderWithMantine(
        <ProjectForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Project"
        />,
      );

      expect(
        screen.getByPlaceholderText("Enter project name"),
      ).toBeInTheDocument();
    });

    it("renders description textarea", () => {
      renderWithMantine(
        <ProjectForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Project"
        />,
      );

      expect(
        screen.getByPlaceholderText("Enter project description"),
      ).toBeInTheDocument();
    });

    it("renders informational text about required hours", () => {
      renderWithMantine(
        <ProjectForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Project"
        />,
      );

      expect(
        screen.getByText(/Required hours are now set per planning period/i),
      ).toBeInTheDocument();
    });

    it("renders Create button in create mode", () => {
      renderWithMantine(
        <ProjectForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Project"
        />,
      );

      expect(
        screen.getByRole("button", { name: "Create" }),
      ).toBeInTheDocument();
    });

    it("renders Update button in edit mode", () => {
      const project: Project = {
        id: 1,
        name: "Existing Project",
        description: "A description",
        required_hours: 0,
        created_at: "2024-01-01T00:00:00Z",
      };

      renderWithMantine(
        <ProjectForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          project={project}
          title="Edit Project"
        />,
      );

      expect(
        screen.getByRole("button", { name: "Update" }),
      ).toBeInTheDocument();
    });

    it("renders Cancel button", () => {
      renderWithMantine(
        <ProjectForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Project"
        />,
      );

      expect(
        screen.getByRole("button", { name: "Cancel" }),
      ).toBeInTheDocument();
    });
  });

  describe("validation", () => {
    it("does not submit when name is empty", async () => {
      const user = userEvent.setup();

      renderWithMantine(
        <ProjectForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Project"
        />,
      );

      // Click submit with empty name - browser validation should prevent submission
      await user.click(screen.getByRole("button", { name: "Create" }));

      // The onSubmit should not be called due to required field validation
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("does not show error when name is provided", async () => {
      const user = userEvent.setup();

      renderWithMantine(
        <ProjectForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Project"
        />,
      );

      await user.type(
        screen.getByPlaceholderText("Enter project name"),
        "My Project",
      );
      await user.click(screen.getByRole("button", { name: "Create" }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
    });
  });

  describe("edit mode", () => {
    it("pre-fills form with project data", () => {
      const project: Project = {
        id: 1,
        name: "Test Project",
        description: "Test description",
        required_hours: 100,
        created_at: "2024-01-01T00:00:00Z",
      };

      renderWithMantine(
        <ProjectForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          project={project}
          title="Edit Project"
        />,
      );

      expect(screen.getByPlaceholderText("Enter project name")).toHaveValue(
        "Test Project",
      );
      expect(
        screen.getByPlaceholderText("Enter project description"),
      ).toHaveValue("Test description");
    });

    it("handles null description gracefully", () => {
      const project: Project = {
        id: 1,
        name: "Test Project",
        description: null,
        required_hours: 0,
        created_at: "2024-01-01T00:00:00Z",
      };

      renderWithMantine(
        <ProjectForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          project={project}
          title="Edit Project"
        />,
      );

      expect(screen.getByPlaceholderText("Enter project name")).toHaveValue(
        "Test Project",
      );
      expect(
        screen.getByPlaceholderText("Enter project description"),
      ).toHaveValue("");
    });
  });

  describe("submission", () => {
    it("calls onSubmit with form values", async () => {
      const user = userEvent.setup();

      renderWithMantine(
        <ProjectForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Project"
        />,
      );

      await user.type(
        screen.getByPlaceholderText("Enter project name"),
        "New Project",
      );
      await user.type(
        screen.getByPlaceholderText("Enter project description"),
        "Project description",
      );
      await user.click(screen.getByRole("button", { name: "Create" }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: "New Project",
          description: "Project description",
          required_hours: 0,
        });
      });
    });

    it("calls onClose after successful submission", async () => {
      const user = userEvent.setup();

      renderWithMantine(
        <ProjectForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Project"
        />,
      );

      await user.type(
        screen.getByPlaceholderText("Enter project name"),
        "New Project",
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
        <ProjectForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Project"
        />,
      );

      await user.type(
        screen.getByPlaceholderText("Enter project name"),
        "New Project",
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
        <ProjectForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Project"
        />,
      );

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("description field", () => {
    it("allows empty description", async () => {
      const user = userEvent.setup();

      renderWithMantine(
        <ProjectForm
          opened={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          title="Add Project"
        />,
      );

      await user.type(
        screen.getByPlaceholderText("Enter project name"),
        "Project Without Description",
      );
      await user.click(screen.getByRole("button", { name: "Create" }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: "Project Without Description",
          description: "",
          required_hours: 0,
        });
      });
    });
  });
});
