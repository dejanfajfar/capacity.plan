# Agent Guidelines for Capacity Planner

This document provides essential information for AI coding agents working in this repository.

## Project Overview

A Tauri v2 desktop application for resource capacity planning and optimization.

- **Frontend:** React 19 + TypeScript + Vite + Mantine UI + Tailwind CSS
- **Backend:** Rust + Tauri v2 + SQLite (with sqlx)
- **State Management:** Zustand
- **Form Management:** Mantine hooks + React Hook Form + Zod validation

## Build & Development Commands

### Frontend
```bash
npm install              # Install dependencies
npm run dev             # Start Vite dev server (port 1420)
npm run build           # Build frontend (includes TypeScript check)
npx tsc --noEmit        # Type check only (no build)
npm run format          # Format both TS/TSX and Rust code
```

### Backend (Rust)
```bash
cd src-tauri
cargo check --all-features              # Quick compile check
cargo clippy --all-targets -- -D warnings  # Run linter
cargo fmt -- --check                    # Check formatting
cargo fmt                               # Auto-format code
cargo build                             # Build debug binary
cargo build --release                   # Build optimized binary
```

### Full Application
```bash
npm run tauri dev       # Run full app in dev mode
npm run tauri build     # Build production app (creates installer)
npm run tauri build -- --debug  # Debug build with symbols
```

### Testing
```bash
cd src-tauri
cargo test --all-features --verbose     # Run all Rust tests
cargo test <test_name>                  # Run specific test
cargo test -- --nocapture               # Show println! output
```

**Note:** Frontend tests not yet configured. To add: install `vitest` and `@testing-library/react`.

## Code Style Guidelines

### TypeScript/React

#### Imports
- Group imports: external libraries, then local imports
- Use named imports for clarity
- Order: styles, libraries, components, types, utilities
```typescript
import "@mantine/core/styles.css";
import { useState, useEffect } from "react";
import { TextInput, Button } from "@mantine/core";
import { PersonForm } from "../components/people/PersonForm";
import type { Person, CreatePersonInput } from "../types";
```

#### Component Structure
- Use function declarations for components: `function ComponentName() {}`
- Named exports for components: `export function ComponentName() {}`
- Default export only for App.tsx or page-level components
- Props interfaces: `interface ComponentNameProps { ... }`
- Use type imports: `import type { ... }`

#### Naming Conventions
- Components: PascalCase (e.g., `PersonForm`, `AppLayout`)
- Files: Match component name (e.g., `PersonForm.tsx`)
- Hooks: camelCase with "use" prefix (e.g., `useTheme`)
- Types/Interfaces: PascalCase (e.g., `CreatePersonInput`)
- Constants: UPPER_SNAKE_CASE for true constants, camelCase for config objects

#### Type Safety
- Enable strict mode (already configured in tsconfig.json)
- Use explicit types for function parameters and return values
- Avoid `any` - use `unknown` if necessary
- Use type-safe form handling with Mantine hooks
- Define interfaces for all API responses matching Rust structs

#### Error Handling
- Use try-catch blocks in async functions
- Log errors to console: `console.error("Context:", error)`
- Show user-friendly notifications via Mantine Notifications
- Propagate errors up when appropriate
```typescript
try {
  await onSubmit(values);
  onClose();
} catch (error) {
  console.error("Failed to save:", error);
  // Handle error UI
}
```

#### State Management
- Use Zustand for global state (not implemented yet, but planned)
- Use React hooks (useState, useEffect) for local component state
- Mantine forms for form state management

### Rust

#### Module Organization
- One feature per module in `src-tauri/src/`
- Re-export public items in `mod.rs`
- Commands go in `commands/mod.rs`
- Models in `models/mod.rs`

#### Naming Conventions
- Files: snake_case (e.g., `mod.rs`, `capacity.rs`)
- Functions: snake_case (e.g., `list_people`, `create_person`)
- Structs: PascalCase (e.g., `Person`, `CreatePersonInput`)
- Enums: PascalCase variants (e.g., `Priority::High`)
- Constants: UPPER_SNAKE_CASE

#### Type Annotations
- Always annotate Tauri command return types: `Result<Vec<Person>, String>`
- Use explicit types for struct fields
- Derive common traits: `#[derive(Debug, Clone, Serialize, Deserialize)]`
- Use `sqlx::FromRow` for database models

#### Error Handling
- Return `Result<T, String>` from Tauri commands
- Use `map_err(|e| e.to_string())` for error conversion
- Log errors with `log` crate: `error!("Context: {}", e)`
- Log levels: `debug!`, `info!`, `warn!`, `error!`
- Use thiserror for custom error types (already included)

#### Database Patterns
- Use sqlx prepared statements with `?` placeholders
- Always `.await` database queries
- Use `fetch_all()` for multiple rows, `fetch_one()` for single row
- Use transactions for multi-step operations

#### Formatting
- Use `cargo fmt` before committing (enforced in CI)
- Max line length: 100 characters (Rust default)
- 4 spaces indentation (Rust standard)

### Formatting Tools
- **Prettier** for TypeScript/TSX: configured to run via `npm run format`
- **cargo fmt** for Rust: configured to run via `npm run format`
- Run both: `npm run format` (formats entire project)

## Architecture Patterns

### Frontend-Backend Communication
- Use Tauri's `invoke()` to call Rust commands
- Commands are async - always await results
- Example: `await invoke<Person[]>("list_people")`
- Type safety: provide generic type for expected return value

### Data Flow
1. User interaction triggers event
2. React component calls Tauri command via `invoke()`
3. Rust command processes request, interacts with SQLite
4. Returns serialized data as JSON
5. Frontend updates UI with result

### File Locations
- Components: `src/components/<feature>/ComponentName.tsx`
- Pages: `src/pages/PageName.tsx`
- Types: `src/types/index.ts` (shared across frontend)
- Contexts: `src/contexts/ContextName.tsx`
- Rust commands: `src-tauri/src/commands/mod.rs`
- Rust models: `src-tauri/src/models/mod.rs`
- Database: Runtime location `~/.capacity-planner/capacity.db`

## Common Pitfalls

1. **Type mismatches** - Ensure Rust and TypeScript types match exactly (especially Option vs null)
2. **Missing awaits** - All Tauri invokes and database queries must be awaited
3. **State updates** - React state updates are async, use callbacks for sequential updates
4. **Tauri commands** - Must be registered in `src-tauri/src/lib.rs` invoke_handler
5. **Date formats** - Use ISO 8601 strings for dates (e.g., "2024-01-15")
6. **Snake vs Camel case** - Rust uses snake_case, TypeScript uses camelCase - Serde handles conversion

## CI/CD

All code must pass CI checks before merging:
- TypeScript type checking (`tsc --noEmit`)
- Rust formatting (`cargo fmt -- --check`)
- Rust linting (`cargo clippy -- -D warnings`)
- Successful build verification

Run locally before pushing:
```bash
npm run build && cd src-tauri && cargo fmt && cargo clippy --all-targets -- -D warnings
```

## Additional Resources

- Project planning: `plan.md`
- Future features: `futures.md`
- Database schema: See migrations in runtime DB or models
- Logs location: `~/.capacity-planner/logs/`
