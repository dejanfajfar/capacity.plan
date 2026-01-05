![Logo](https://github.com/dejanfajfar/capacity.plan/blob/2639b86a909b5fa923171bd03194164b8d9dd9ac/doc/Logo%20gemini.png)

# Capacity Planner

[![CI](https://github.com/dejanfajfar/capacity.plan/actions/workflows/ci.yml/badge.svg)](https://github.com/dejanfajfar/capacity.plan/actions/workflows/ci.yml)
[![Tests](https://github.com/dejanfajfar/capacity.plan/actions/workflows/test.yml/badge.svg)](https://github.com/dejanfajfar/capacity.plan/actions/workflows/test.yml)
[![Release](https://github.com/dejanfajfar/capacity.plan/actions/workflows/release.yml/badge.svg)](https://github.com/dejanfajfar/capacity.plan/actions/workflows/release.yml)

A desktop application for optimal resource allocation across projects and people within planning periods.

## Features

- **People Management** - Define team members and their available capacity
- **Project Management** - Create global projects with target hours per period
- **Planning Periods** - Define time windows (quarters, months) for planning
- **Smart Assignments** - Assign people to projects with productivity factors
- **Absence Management** - Track absences that reduce available capacity
- **Overhead Management** - Track recurring overhead tasks (meetings, admin work)
- **Optimization Algorithm** - Calculate optimal allocation percentages using linear programming
- **Capacity Analysis** - Visualize utilization, staffing, and capacity breakdown with interactive charts
- **Project Requirements** - Define specific hour requirements per project per period

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + Mantine UI + Tailwind CSS
- **Backend:** Rust + Tauri v2
- **Database:** SQLite with sqlx
- **State Management:** Zustand (planned)
- **Optimization:** good_lp linear programming solver
- **Logging:** simplelog with daily file rotation

## Development Setup

### Prerequisites

- Node.js (v18 or later)
- Rust (latest stable)
- Platform-specific requirements for Tauri (see [Tauri Prerequisites](https://tauri.app/v2/guides/prerequisites/))

### Getting Started

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

### Development Commands

```bash
# Frontend
npm run dev              # Start Vite dev server (port 1420)
npm run build            # Build frontend
npx tsc --noEmit         # Type check only
npm run format           # Format TypeScript and Rust code

# Backend (Rust)
cd src-tauri
cargo check              # Quick compile check
cargo clippy --all-targets -- -D warnings  # Run linter
cargo fmt                # Format Rust code
cargo test               # Run tests
```

## CI/CD

This project uses GitHub Actions for continuous integration and automated releases:

- **CI Workflow** - Runs on every push and PR
  - TypeScript type checking
  - Rust linting (clippy, fmt)
  - Build verification
- **Release Workflow** - Creates production builds with automated versioning
  - Windows (x64): MSI installer + portable EXE
  - macOS (Universal): DMG installer for Intel and Apple Silicon
  - Triggered manually (requires version input) or by pushing version tags (e.g., `v0.1.0`)
  - Automatically updates version in all config files from git tag
  - Validates semantic versioning format (MAJOR.MINOR.PATCH)
- **Test Workflow** - Runs automated tests (when available)

### Creating a Release

The release workflow automatically extracts the version from git tags and updates all configuration files during the build process. This ensures installer filenames always match the release version.

**Option 1: Git tag (Recommended)**

1. Create and push a version tag:

   ```bash
   git tag v0.1.5
   git push origin v0.1.5
   ```

2. The workflow will:
   - Validate the version format (must be semantic versioning: v0.1.0)
   - Update `package.json`, `Cargo.toml`, and `tauri.conf.json` with version `0.1.5`
   - Build installers with correct version in filename (e.g., `capacity-planner_0.1.5_x64_en-US.msi`)
   - Create a GitHub release with artifacts attached

**Option 2: Manual trigger**

1. Go to Actions → Release → Run workflow
2. Enter the version (e.g., `v0.1.5` or `0.1.5`)
3. The workflow validates the version and builds with that version
4. Download artifacts from the workflow run

**Version Format Requirements**:

- Must follow semantic versioning: `MAJOR.MINOR.PATCH`
- Examples: `v0.1.0`, `v1.2.3`, `v2.0.0-beta.1`
- The `v` prefix is optional for manual triggers but required for tags

**Important Notes**:

- Version numbers in the repository files (`package.json`, `Cargo.toml`, `tauri.conf.json`) can remain at `0.1.0`
- The workflow updates these files automatically during CI builds
- Installer filenames will always match the release tag version

## Key Concepts

### Planning Workflow

1. **Create Planning Period** - Define a time window (e.g., Q1 2024)
2. **Add People** - Define team members and their weekly capacity
3. **Create Projects** - Set up projects with target hours
4. **Define Requirements** - Specify hour requirements per project per period
5. **Create Assignments** - Assign people to projects with productivity factors
6. **Track Deductions** - Add absences and overhead that reduce capacity
7. **Optimize** - Run the optimization algorithm to calculate ideal allocations
8. **Analyze** - Review capacity utilization and project staffing

### Capacity Calculation

Available capacity for a person is calculated as:

```
Base Hours = Available Hours/Week × Weeks in Period
Deductions = Absence Hours + Overhead Hours
Available Hours = Base Hours - Deductions
Effective Hours = Available Hours × Productivity Factor × Allocation %
```

### Optimization Algorithm

The optimization engine uses linear programming to:

- Minimize deviation from project requirements
- Respect person capacity constraints
- Honor pinned assignments
- Account for productivity factors
- Balance workload across team members

## Project Structure

```
capacity.plan/
├── src/                           # React frontend
│   ├── components/               # UI components
│   │   ├── absences/            # Absence management
│   │   ├── analysis/            # Capacity analysis & charts
│   │   ├── assignments/         # Assignment management
│   │   ├── overheads/          # Overhead management
│   │   ├── people/             # People management
│   │   ├── period/             # Period overview
│   │   ├── person/             # Person detail view
│   │   ├── planning/           # Planning period management
│   │   ├── projects/           # Project management
│   │   └── requirements/       # Project requirements
│   ├── pages/                  # Page components
│   ├── contexts/               # React contexts
│   ├── lib/                    # Utility functions & Tauri API
│   └── types/                  # TypeScript type definitions
│
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── capacity/           # Optimization algorithm
│   │   ├── commands/           # Tauri commands (API)
│   │   ├── db/                 # Database setup & migrations
│   │   └── models/             # Data models
│   └── Cargo.toml
│
└── ~/.capacity-planner/          # User data directory (runtime)
    ├── capacity.db              # SQLite database
    └── logs/                    # Application logs
```

## Documentation

- `plan.md` - Project planning and design decisions
- `AGENTS.md` - Guidelines for AI coding agents working on this project

For detailed development guidelines, code style conventions, and architecture patterns, see `AGENTS.md`.

## License

MIT License - See LICENSE file for details
