import React, { type ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router-dom";

// Wrapper component that provides all necessary providers
function AllTheProviders({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <MantineProvider>{children}</MantineProvider>
    </MemoryRouter>
  );
}

// Custom render function that wraps component with providers
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

// Re-export everything from testing library
export * from "@testing-library/react";
export { customRender as render };
