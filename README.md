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
Base Hours = Available Hours/Week × Weeks in Period × (Working Days / 7)
Deductions = Absence Hours + Holiday Hours + Overhead Hours
Available Hours = Base Hours - Deductions
Effective Hours = Available Hours × Productivity Factor × Allocation %
```

**Working Days**: People can work 1-7 days per week. The system accounts for their specific schedule when calculating capacity and only counts holidays that fall on their working days.

### Proficiency Levels

When assigning people to projects, you select a **proficiency level** that represents their expertise/familiarity with the project's technology, domain, or tools. This is expressed as a productivity factor (0.0 - 1.0) that multiplies their available hours.

The system provides 7 preset proficiency levels:

| Level | Factor | Description | When to Use |
|-------|--------|-------------|-------------|
| **Master** | 0.90 | Subject matter expert with deep mastery | Person is the architect/SME, mentors others, maintains highest productivity |
| **Expert** | 0.80 | Deep expertise and experience | Person has years of experience, works independently, rarely needs guidance |
| **Advanced** | 0.65 | Strong knowledge and experience | Person knows the domain well, works independently most of the time |
| **Proficient** | 0.50 | Solid understanding and competence | Person is competent but not specialized (default/baseline) |
| **Intermediate** | 0.35 | Developing skills and knowledge | Person is learning, needs regular guidance and code reviews |
| **Beginner** | 0.20 | Basic familiarity only | Person has little experience, needs frequent support and mentoring |
| **Trainee** | 0.10 | Shadowing/training mode | Person is in training, minimal direct output, focused on learning |

**Custom Values**: You can also enter custom productivity factors (0.0 - 1.0) for special cases.

**Rationale**: Even experts don't have 1.0 (100%) productivity because real work includes meetings, planning, context-switching, research, code reviews, and other non-coding activities. These presets are based on industry research for technical work capacity planning.

**Example**: If a person has 40 hours available in a period and is assigned to a project at "Expert" level (0.80) with 50% allocation, their effective hours are: `40h × 0.80 × 0.50 = 16h`

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
