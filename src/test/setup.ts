import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock window.matchMedia for Mantine color scheme detection
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver for Mantine components
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.ResizeObserver = ResizeObserverMock;

// Mock Element.scrollIntoView for Mantine Combobox
Element.prototype.scrollIntoView = vi.fn();

// Mock Tauri APIs globally
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock Mantine notifications
vi.mock("@mantine/notifications", () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// Suppress console.error for expected test failures
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning: ReactDOM.render") ||
        args[0].includes("Warning: Each child in a list"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
