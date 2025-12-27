# Capacity Planner

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

## Project Structure

- `src/` - React frontend source code
- `src-tauri/` - Rust backend source code
- `~/.capacity-planner/` - User data directory (database & logs)

## Documentation

- `plan.md` - Project planning and design decisions
- `futures.md` - Future enhancement ideas and roadmap

## License

MIT License - See LICENSE file for details