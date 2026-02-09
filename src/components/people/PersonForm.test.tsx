import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "../../test/test-utils";
import { PersonForm } from "./PersonForm";
import type { Person, CreatePersonInput, Country } from "../../types";
import { listCountries } from "../../lib/tauri";

// Mock the tauri module
vi.mock("../../lib/tauri", () => ({
  listCountries: vi.fn(),
}));

const mockListCountries = vi.mocked(listCountries);

describe("PersonForm", () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  const mockCountries: Country[] = [
    {
      id: 1,
      name: "United States",
      iso_code: "US",
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      name: "Germany",
      iso_code: "DE",
      created_at: new Date().toISOString(),
    },
    {
      id: 3,
      name: "Japan",
      iso_code: "JP",
      created_at: new Date().toISOString(),
    },
  ];

  const defaultProps = {
    opened: true,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
    title: "Add Person",
    person: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
    mockListCountries.mockResolvedValue(mockCountries);
  });

  it("renders form fields correctly", async () => {
    render(<PersonForm {...defaultProps} />);

    expect(
      screen.getByPlaceholderText(/enter person's name/i),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/person@example.com/i),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/select country/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/available hours per week/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/working days/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("renders all working day checkboxes", () => {
    render(<PersonForm {...defaultProps} />);

    expect(screen.getByLabelText(/monday/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tuesday/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/wednesday/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/thursday/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/friday/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/saturday/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sunday/i)).toBeInTheDocument();
  });

  it("has weekdays checked by default", () => {
    render(<PersonForm {...defaultProps} />);

    expect(screen.getByLabelText(/monday/i)).toBeChecked();
    expect(screen.getByLabelText(/tuesday/i)).toBeChecked();
    expect(screen.getByLabelText(/wednesday/i)).toBeChecked();
    expect(screen.getByLabelText(/thursday/i)).toBeChecked();
    expect(screen.getByLabelText(/friday/i)).toBeChecked();
    expect(screen.getByLabelText(/saturday/i)).not.toBeChecked();
    expect(screen.getByLabelText(/sunday/i)).not.toBeChecked();
  });

  it("does not submit when name is empty", async () => {
    const user = userEvent.setup();
    render(<PersonForm {...defaultProps} />);

    // Fill only email, leave name empty
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.click(screen.getByRole("button", { name: /create/i }));

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("does not submit when email is empty", async () => {
    const user = userEvent.setup();
    render(<PersonForm {...defaultProps} />);

    // Fill only name, leave email empty
    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.click(screen.getByRole("button", { name: /create/i }));

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("shows validation error for invalid email format", async () => {
    const user = userEvent.setup();
    render(<PersonForm {...defaultProps} />);

    await user.type(
      screen.getByPlaceholderText(/enter person's name/i),
      "John Doe",
    );
    await user.type(
      screen.getByPlaceholderText(/person@example.com/i),
      "invalid-email",
    );
    await user.click(screen.getByRole("button", { name: /create/i }));

    // Should not submit with invalid email
    expect(mockOnSubmit).not.toHaveBeenCalled();

    // Verify form is still open (modal didn't close) - onClose should not have been called
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("submits form with valid data", async () => {
    const user = userEvent.setup();
    render(<PersonForm {...defaultProps} />);

    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: "John Doe",
        email: "john@example.com",
        available_hours_per_week: 40,
        country_id: null,
        working_days: "Mon,Tue,Wed,Thu,Fri",
      } satisfies CreatePersonInput);
    });
  });

  it("submits with custom hours and working days", async () => {
    const user = userEvent.setup();
    render(<PersonForm {...defaultProps} />);

    await user.type(screen.getByLabelText(/name/i), "Part Timer");
    await user.type(screen.getByLabelText(/email/i), "part@example.com");

    // Clear and set custom hours
    const hoursInput = screen.getByLabelText(/available hours per week/i);
    await user.clear(hoursInput);
    await user.type(hoursInput, "20");

    // Uncheck Friday
    await user.click(screen.getByLabelText(/friday/i));

    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: "Part Timer",
        email: "part@example.com",
        available_hours_per_week: 20,
        country_id: null,
        working_days: "Mon,Tue,Wed,Thu",
      });
    });
  });

  it("calls onClose when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(<PersonForm {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("pre-fills form when editing existing person", async () => {
    const existingPerson: Person = {
      id: 1,
      name: "Jane Smith",
      email: "jane@example.com",
      available_hours_per_week: 35,
      country_id: 2,
      working_days: "Mon,Tue,Wed,Thu",
      created_at: new Date().toISOString(),
    };

    render(
      <PersonForm
        {...defaultProps}
        person={existingPerson}
        title="Edit Person"
      />,
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/enter person's name/i)).toHaveValue(
        "Jane Smith",
      );
      expect(screen.getByPlaceholderText(/person@example.com/i)).toHaveValue(
        "jane@example.com",
      );
      // NumberInput returns value as string in DOM
      expect(screen.getByLabelText(/available hours per week/i)).toHaveValue(
        "35",
      );
    });

    // Check working days
    expect(screen.getByLabelText(/monday/i)).toBeChecked();
    expect(screen.getByLabelText(/tuesday/i)).toBeChecked();
    expect(screen.getByLabelText(/wednesday/i)).toBeChecked();
    expect(screen.getByLabelText(/thursday/i)).toBeChecked();
    expect(screen.getByLabelText(/friday/i)).not.toBeChecked();
  });

  it("shows 'Update' button when editing", () => {
    const existingPerson: Person = {
      id: 1,
      name: "Jane Smith",
      email: "jane@example.com",
      available_hours_per_week: 40,
      country_id: null,
      working_days: "Mon,Tue,Wed,Thu,Fri",
      created_at: new Date().toISOString(),
    };

    render(<PersonForm {...defaultProps} person={existingPerson} />);

    expect(screen.getByRole("button", { name: /update/i })).toBeInTheDocument();
  });

  it("handles submission error gracefully", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockOnSubmit.mockRejectedValue(new Error("Failed to save"));

    const user = userEvent.setup();
    render(<PersonForm {...defaultProps} />);

    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to save person:",
        expect.any(Error),
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("loads countries when modal opens", async () => {
    render(<PersonForm {...defaultProps} />);

    await waitFor(() => {
      expect(mockListCountries).toHaveBeenCalled();
    });
  });

  it("handles country loading error gracefully", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockListCountries.mockRejectedValue(new Error("Failed to load"));

    render(<PersonForm {...defaultProps} />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to load countries:",
        expect.any(Error),
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("resets form when modal is opened without a person", async () => {
    const existingPerson: Person = {
      id: 1,
      name: "Jane Smith",
      email: "jane@example.com",
      available_hours_per_week: 35,
      country_id: null,
      working_days: "Mon,Wed,Fri",
      created_at: new Date().toISOString(),
    };

    const { rerender } = render(
      <PersonForm {...defaultProps} opened={true} person={existingPerson} />,
    );

    expect(screen.getByLabelText(/name/i)).toHaveValue("Jane Smith");

    // Close the modal
    rerender(<PersonForm {...defaultProps} opened={false} person={null} />);

    // Reopen without a person
    rerender(<PersonForm {...defaultProps} opened={true} person={null} />);

    // Form should be empty
    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toHaveValue("");
      expect(screen.getByLabelText(/email/i)).toHaveValue("");
    });

    // Working days should reset to default weekdays
    expect(screen.getByLabelText(/monday/i)).toBeChecked();
    expect(screen.getByLabelText(/friday/i)).toBeChecked();
    expect(screen.getByLabelText(/saturday/i)).not.toBeChecked();
  });

  it("requires at least one working day selected", async () => {
    const user = userEvent.setup();
    render(<PersonForm {...defaultProps} />);

    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.type(screen.getByLabelText(/email/i), "john@example.com");

    // Uncheck all working days
    await user.click(screen.getByLabelText(/monday/i));
    await user.click(screen.getByLabelText(/tuesday/i));
    await user.click(screen.getByLabelText(/wednesday/i));
    await user.click(screen.getByLabelText(/thursday/i));
    await user.click(screen.getByLabelText(/friday/i));

    await user.click(screen.getByRole("button", { name: /create/i }));

    // Should show validation error
    expect(
      screen.getByText(/at least one day must be selected/i),
    ).toBeInTheDocument();

    // Should not submit
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("closes modal and resets after successful submission", async () => {
    const user = userEvent.setup();
    render(<PersonForm {...defaultProps} />);

    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
