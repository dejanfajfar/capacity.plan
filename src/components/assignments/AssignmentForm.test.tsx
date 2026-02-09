import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "../../test/test-utils";
import { AssignmentForm } from "./AssignmentForm";
import type {
  Assignment,
  CreateAssignmentInput,
  Person,
  Project,
  PlanningPeriod,
} from "../../types";
import { listPeople, listProjects } from "../../lib/tauri";

// Mock the tauri module
vi.mock("../../lib/tauri", () => ({
  listPeople: vi.fn(),
  listProjects: vi.fn(),
}));

const mockListPeople = vi.mocked(listPeople);
const mockListProjects = vi.mocked(listProjects);

describe("AssignmentForm", () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  const mockPlanningPeriod: PlanningPeriod = {
    id: 1,
    name: "Q1 2024",
    start_date: "2024-01-01",
    end_date: "2024-03-31",
    created_at: new Date().toISOString(),
  };

  const mockPeople: Person[] = [
    {
      id: 1,
      name: "Alice Developer",
      email: "alice@example.com",
      available_hours_per_week: 40,
      country_id: null,
      working_days: "Mon,Tue,Wed,Thu,Fri",
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      name: "Bob Engineer",
      email: "bob@example.com",
      available_hours_per_week: 32,
      country_id: 1,
      working_days: "Mon,Tue,Wed,Thu",
      created_at: new Date().toISOString(),
    },
  ];

  const mockProjects: Project[] = [
    {
      id: 1,
      name: "Project Alpha",
      description: "First project",
      required_hours: 500,
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      name: "Project Beta",
      description: "Second project",
      required_hours: 300,
      created_at: new Date().toISOString(),
    },
  ];

  const defaultProps = {
    opened: true,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
    planningPeriod: mockPlanningPeriod,
    title: "Create Assignment",
    assignment: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
    mockListPeople.mockResolvedValue(mockPeople);
    mockListProjects.mockResolvedValue(mockProjects);
  });

  it("renders form fields correctly", async () => {
    render(<AssignmentForm {...defaultProps} />);

    // Wait for data to load
    await waitFor(() => {
      expect(mockListPeople).toHaveBeenCalled();
      expect(mockListProjects).toHaveBeenCalled();
    });

    expect(screen.getByText(/planning period/i)).toBeInTheDocument();
    expect(screen.getByText(/Q1 2024/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/select a person/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/select a project/i),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/select proficiency level/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("does not submit when person is not selected", async () => {
    const user = userEvent.setup();
    render(<AssignmentForm {...defaultProps} />);

    await waitFor(() => {
      expect(mockListPeople).toHaveBeenCalled();
    });

    await user.click(screen.getByRole("button", { name: /create/i }));

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("does not submit when project is not selected", async () => {
    const user = userEvent.setup();
    render(<AssignmentForm {...defaultProps} />);

    await waitFor(() => {
      expect(mockListPeople).toHaveBeenCalled();
    });

    // Select a person
    await user.click(screen.getByPlaceholderText(/select a person/i));
    await user.click(screen.getByText("Alice Developer"));

    await user.click(screen.getByRole("button", { name: /create/i }));

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("submits form with valid data", async () => {
    const user = userEvent.setup();
    render(<AssignmentForm {...defaultProps} />);

    await waitFor(() => {
      expect(mockListPeople).toHaveBeenCalled();
      expect(mockListProjects).toHaveBeenCalled();
    });

    // Select person
    await user.click(screen.getByPlaceholderText(/select a person/i));
    await user.click(screen.getByText("Alice Developer"));

    // Select project
    await user.click(screen.getByPlaceholderText(/select a project/i));
    await user.click(screen.getByText("Project Alpha"));

    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        person_id: 1,
        project_id: 1,
        planning_period_id: 1,
        productivity_factor: 0.5, // Default "Proficient" level
        start_date: "2024-01-01",
        end_date: "2024-03-31",
      } satisfies CreateAssignmentInput);
    });
  });

  it("calls onClose when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(<AssignmentForm {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("pre-fills form when editing existing assignment", async () => {
    const existingAssignment: Assignment = {
      id: 1,
      person_id: 2,
      project_id: 2,
      planning_period_id: 1,
      productivity_factor: 0.8, // Expert level
      start_date: "2024-02-01",
      end_date: "2024-02-28",
      calculated_allocation_percentage: null,
      calculated_effective_hours: null,
      last_calculated_at: null,
      created_at: new Date().toISOString(),
    };

    render(
      <AssignmentForm
        {...defaultProps}
        assignment={existingAssignment}
        title="Edit Assignment"
      />,
    );

    await waitFor(() => {
      expect(mockListPeople).toHaveBeenCalled();
      expect(mockListProjects).toHaveBeenCalled();
    });

    // Check dates are pre-filled
    expect(screen.getByLabelText(/start date/i)).toHaveValue("2024-02-01");
    expect(screen.getByLabelText(/end date/i)).toHaveValue("2024-02-28");
  });

  it("shows 'Update' button when editing", async () => {
    const existingAssignment: Assignment = {
      id: 1,
      person_id: 1,
      project_id: 1,
      planning_period_id: 1,
      productivity_factor: 0.5,
      start_date: "2024-01-01",
      end_date: "2024-03-31",
      calculated_allocation_percentage: null,
      calculated_effective_hours: null,
      last_calculated_at: null,
      created_at: new Date().toISOString(),
    };

    render(
      <AssignmentForm {...defaultProps} assignment={existingAssignment} />,
    );

    await waitFor(() => {
      expect(mockListPeople).toHaveBeenCalled();
    });

    expect(screen.getByRole("button", { name: /update/i })).toBeInTheDocument();
  });

  it("handles submission error gracefully", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockOnSubmit.mockRejectedValue(new Error("Failed to save"));

    const user = userEvent.setup();
    render(<AssignmentForm {...defaultProps} />);

    await waitFor(() => {
      expect(mockListPeople).toHaveBeenCalled();
      expect(mockListProjects).toHaveBeenCalled();
    });

    // Select person and project
    await user.click(screen.getByPlaceholderText(/select a person/i));
    await user.click(screen.getByText("Alice Developer"));
    await user.click(screen.getByPlaceholderText(/select a project/i));
    await user.click(screen.getByText("Project Alpha"));

    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to save assignment:",
        expect.any(Error),
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("loads people and projects when modal opens", async () => {
    render(<AssignmentForm {...defaultProps} />);

    await waitFor(() => {
      expect(mockListPeople).toHaveBeenCalled();
      expect(mockListProjects).toHaveBeenCalled();
    });
  });

  it("handles data loading error gracefully", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockListPeople.mockRejectedValue(new Error("Failed to load"));

    render(<AssignmentForm {...defaultProps} />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to load form data:",
        expect.any(Error),
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("defaults dates to planning period range", async () => {
    render(<AssignmentForm {...defaultProps} />);

    await waitFor(() => {
      expect(mockListPeople).toHaveBeenCalled();
    });

    expect(screen.getByLabelText(/start date/i)).toHaveValue("2024-01-01");
    expect(screen.getByLabelText(/end date/i)).toHaveValue("2024-03-31");
  });

  it("validates start date is within planning period", async () => {
    const user = userEvent.setup();
    render(<AssignmentForm {...defaultProps} />);

    await waitFor(() => {
      expect(mockListPeople).toHaveBeenCalled();
      expect(mockListProjects).toHaveBeenCalled();
    });

    // Select person and project first
    await user.click(screen.getByPlaceholderText(/select a person/i));
    await user.click(screen.getByText("Alice Developer"));
    await user.click(screen.getByPlaceholderText(/select a project/i));
    await user.click(screen.getByText("Project Alpha"));

    // Set invalid start date (before planning period)
    const startInput = screen.getByLabelText(/start date/i);
    await user.clear(startInput);
    await user.type(startInput, "2023-12-01");

    await user.click(screen.getByRole("button", { name: /create/i }));

    // Should not submit with invalid date
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("validates end date is after start date", async () => {
    const user = userEvent.setup();
    render(<AssignmentForm {...defaultProps} />);

    await waitFor(() => {
      expect(mockListPeople).toHaveBeenCalled();
      expect(mockListProjects).toHaveBeenCalled();
    });

    // Select person and project first
    await user.click(screen.getByPlaceholderText(/select a person/i));
    await user.click(screen.getByText("Alice Developer"));
    await user.click(screen.getByPlaceholderText(/select a project/i));
    await user.click(screen.getByText("Project Alpha"));

    // Set end date before start date
    const startInput = screen.getByLabelText(/start date/i);
    const endInput = screen.getByLabelText(/end date/i);
    await user.clear(startInput);
    await user.type(startInput, "2024-03-01");
    await user.clear(endInput);
    await user.type(endInput, "2024-02-01");

    await user.click(screen.getByRole("button", { name: /create/i }));

    // Should not submit with invalid dates
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("closes modal and calls onClose after successful submission", async () => {
    const user = userEvent.setup();
    render(<AssignmentForm {...defaultProps} />);

    await waitFor(() => {
      expect(mockListPeople).toHaveBeenCalled();
      expect(mockListProjects).toHaveBeenCalled();
    });

    // Select person and project
    await user.click(screen.getByPlaceholderText(/select a person/i));
    await user.click(screen.getByText("Alice Developer"));
    await user.click(screen.getByPlaceholderText(/select a project/i));
    await user.click(screen.getByText("Project Alpha"));

    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("shows custom proficiency input when Custom is selected", async () => {
    const user = userEvent.setup();
    render(<AssignmentForm {...defaultProps} />);

    await waitFor(() => {
      expect(mockListPeople).toHaveBeenCalled();
    });

    // Click the proficiency dropdown
    await user.click(screen.getByPlaceholderText(/select proficiency level/i));

    // Select Custom option
    await user.click(screen.getByText("Custom..."));

    // Custom input should now be visible
    expect(
      screen.getByLabelText(/custom productivity factor/i),
    ).toBeInTheDocument();
  });

  it("changes proficiency factor when different level is selected", async () => {
    const user = userEvent.setup();
    render(<AssignmentForm {...defaultProps} />);

    await waitFor(() => {
      expect(mockListPeople).toHaveBeenCalled();
      expect(mockListProjects).toHaveBeenCalled();
    });

    // Select person and project first
    await user.click(screen.getByPlaceholderText(/select a person/i));
    await user.click(screen.getByText("Alice Developer"));
    await user.click(screen.getByPlaceholderText(/select a project/i));
    await user.click(screen.getByText("Project Alpha"));

    // Change proficiency to Expert (0.8)
    await user.click(screen.getByPlaceholderText(/select proficiency level/i));
    await user.click(screen.getByText("Expert (80%)"));

    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          productivity_factor: 0.8,
        }),
      );
    });
  });
});
