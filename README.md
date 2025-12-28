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
- **Optimization** - Calculate optimal allocation percentages (coming soon)
- **Capacity Analysis** - Visualize utilization and staffing (coming soon)

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Mantine UI
- **Backend:** Rust + Tauri v2
- **Database:** SQLite with sqlx
- **Logging:** simplelog with daily file rotation

## Development Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## CI/CD

This project uses GitHub Actions for continuous integration and automated releases:

- **CI Workflow** - Runs on every push and PR
  - TypeScript type checking
  - Rust linting (clippy, fmt)
  - Build verification
  
- **Release Workflow** - Creates production builds
  - Windows (x64): MSI installer + portable EXE
  - macOS (Universal): DMG installer for Intel and Apple Silicon
  - Triggered manually or by pushing version tags (e.g., `v0.1.0`)
  
- **Test Workflow** - Runs automated tests (when available)

### Creating a Release

**Option 1: Manual trigger**
1. Go to Actions → Release → Run workflow
2. Download artifacts from the workflow run

**Option 2: Git tag**
```bash
git tag v0.1.0
git push --tags
```
The release will be created automatically with installers attached.

## Project Structure

- `src/` - React frontend source code
- `src-tauri/` - Rust backend source code
- `~/.capacity-planner/` - User data directory (database & logs)

## Documentation

- `plan.md` - Project planning and design decisions
- `futures.md` - Future enhancement ideas and roadmap

## License

MIT License - See LICENSE file for details