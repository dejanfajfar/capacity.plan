# Future Enhancements

This document tracks potential features and improvements for future implementation.

---

## 🔧 Logging System Enhancements

### 1. Automatic Log Cleanup / Retention Policy

**Description:** Automatically delete old log files based on age or count.

**Implementation Ideas:**
- Add configuration for retention days (e.g., keep last 30 days)
- Run cleanup on application startup
- Option: Keep last N files regardless of date

**Code Location:** `src-tauri/src/logger.rs`

**Estimated Effort:** 1-2 hours

**Example:**
```rust
fn cleanup_old_logs(log_dir: &Path, retention_days: u64) {
    // Delete logs older than retention_days
}
```

---

### 2. Log File Size Limits

**Description:** Rotate logs within the same day if file size exceeds a threshold.

**Implementation Ideas:**
- Check file size before writing
- If > limit (e.g., 10MB), create `app-2025-12-27-001.log`, `app-2025-12-27-002.log`, etc.
- Update logger to handle multiple files per day

**Code Location:** `src-tauri/src/logger.rs`

**Estimated Effort:** 2-3 hours

**Benefits:**
- Prevents single log files from growing too large
- Easier to manage and parse smaller files

---

### 3. JSON Log Format

**Description:** Option to output logs in JSON format for easier parsing/analysis.

**Implementation Ideas:**
- Add configuration option: `log_format: "text" | "json"`
- Use structured logging crate like `tracing` with JSON formatter
- Each log entry becomes a JSON object with fields: timestamp, level, module, message, etc.

**Code Location:** `src-tauri/src/logger.rs`

**Estimated Effort:** 3-4 hours (requires migration to `tracing` crate)

**Example JSON Output:**
```json
{"timestamp":"2025-12-27T21:27:03.227009Z","level":"DEBUG","target":"capacity_planner_lib::db","message":"Initializing database connection"}
{"timestamp":"2025-12-27T21:27:03.232524Z","level":"INFO","target":"capacity_planner_lib::db","message":"Database initialized successfully"}
```

**Benefits:**
- Easy to parse with tools like `jq`
- Integration with log aggregation systems (ELK, Splunk, etc.)
- Structured queries on log data

---

### 4. User-Configurable Log Level

**Description:** Allow users to change log level via application settings (UI).

**Implementation Ideas:**
- Add log level setting to application preferences
- Store in config file or database
- Reload logger when setting changes (or require app restart)
- UI: Dropdown with options: Error, Warn, Info, Debug, Trace

**Code Locations:**
- UI: New settings page or section
- Backend: `src-tauri/src/logger.rs` - add configuration loading
- State management: Store preference in database or config file

**Estimated Effort:** 4-6 hours

**Benefits:**
- Users can increase log detail when troubleshooting
- Reduce log volume in production by setting to WARN or ERROR

---

### 5. Log Viewer in Application UI

**Description:** Display application logs directly in the UI for easy access.

**Implementation Ideas:**
- Add "Logs" page/tab in application
- Read and display log file contents
- Features:
  - Real-time log streaming (tail -f behavior)
  - Filter by log level
  - Search/filter by keyword
  - Download/export logs
  - Clear logs button

**Code Locations:**
- UI: New `LogViewer.tsx` component
- Backend: New Tauri command `get_logs()`
- Optional: WebSocket for real-time streaming

**Estimated Effort:** 8-12 hours

**Benefits:**
- No need to navigate to log files manually
- Users can easily share logs when reporting issues
- Better user experience

---

### 6. Environment Variable Override

**Description:** Allow `RUST_LOG` environment variable to override configured log level.

**Implementation Ideas:**
- Check for `RUST_LOG` env var on startup
- If set, parse and use that level instead of default
- Follows Rust ecosystem convention

**Code Location:** `src-tauri/src/logger.rs` - Update `get_terminal_log_level()`

**Estimated Effort:** 30 minutes

**Example Usage:**
```bash
# Run with debug logs
RUST_LOG=debug npm run tauri dev

# Run with trace logs (most verbose)
RUST_LOG=trace npm run tauri dev

# Filter to specific module
RUST_LOG=capacity_planner_lib::commands=debug npm run tauri dev
```

**Benefits:**
- Developer convenience
- No code changes needed for different log levels
- Standard Rust practice

---

## 🎯 Optimization Algorithm

### 7. Linear Programming Solver Integration

**Description:** Implement the core optimization algorithm to calculate optimal resource allocations.

**Requirements:**
- Minimize deviation from project requirements
- Respect capacity constraints (available hours)
- Honor pinned assignments
- Handle multiple assignments per person
- Consider productivity factors

**Implementation Ideas:**
- Use `good_lp` or `lp_solvers` Rust crate
- Create `src-tauri/src/optimizer/mod.rs` module
- New Tauri command: `optimize_assignments(planning_period_id)`
- Input: Assignments, people capacity, project requirements
- Output: Updated `calculated_allocation_percentage` and `calculated_effective_hours`

**Estimated Effort:** 16-24 hours

**Algorithm Pseudocode:**
```
For each person in planning period:
  available_hours = person.available_hours_per_week * weeks_in_period
  
For each assignment:
  effective_hours = available_hours * productivity_factor * allocation_percentage
  
Objective:
  Minimize sum of (project.required_hours - sum(effective_hours_for_project))^2
  
Constraints:
  - Sum of allocation_percentages per person ≤ 1.0
  - If assignment.is_pinned: allocation_percentage = pinned_allocation_percentage
  - All allocation_percentages ≥ 0
```

**Code Locations:**
- `src-tauri/src/optimizer/mod.rs` - Optimization engine
- `src-tauri/src/commands/mod.rs` - Add `optimize_assignments` command
- `src/pages/AssignmentDashboard.tsx` - Add "Optimize" button

---

## 📊 Analytics & Reporting

### 8. Capacity Analysis Dashboard

**Description:** Implement the Capacity Analysis page with visualizations.

**Features:**
- Person utilization charts (who's over/under allocated)
- Project staffing status (which projects need more/less resources)
- Timeline view of assignments
- Workload distribution
- Bottleneck identification

**Implementation Ideas:**
- Use `recharts` or `visx` for React charts
- New Tauri commands:
  - `get_capacity_analysis(planning_period_id)`
  - `get_person_workload(planning_period_id, person_id)`
  - `get_project_staffing(planning_period_id, project_id)`

**Code Locations:**
- `src/pages/CapacityAnalysis.tsx` - Implement full page
- `src-tauri/src/commands/mod.rs` - Add analysis commands

**Estimated Effort:** 12-16 hours

---

### 9. Export Reports (PDF/Excel)

**Description:** Generate downloadable reports of capacity analysis.

**Implementation Ideas:**
- PDF: Use `printpdf` Rust crate or browser print
- Excel: Use `rust_xlsxwriter` crate
- CSV: Native Rust CSV generation
- Reports:
  - Person capacity summary
  - Project staffing summary
  - Assignment details
  - Utilization charts

**Estimated Effort:** 8-12 hours

---

## 🗓️ Absence Management

### 10. Implement Absence CRUD Operations

**Description:** Complete the absence management feature (currently unused).

**Features:**
- Create/edit/delete absences for people
- Absences reduce available capacity during date range
- UI for managing absences
- Integration with capacity calculations

**Implementation Ideas:**
- Already have database table and models
- Add Tauri commands: `list_absences`, `create_absence`, etc.
- Create UI components: `AbsenceForm.tsx`, `AbsenceList.tsx`
- Update capacity calculations to account for absences

**Code Locations:**
- `src-tauri/src/commands/mod.rs` - Add absence commands
- `src/components/absences/` - Create components
- `src/pages/PeopleManagement.tsx` - Add absences section

**Estimated Effort:** 6-8 hours

---

## 🔒 Data Management

### 11. Data Import/Export

**Description:** Allow importing/exporting all data (backup/restore).

**Features:**
- Export all data to JSON file
- Import data from JSON file
- Validation on import
- Merge vs Replace options

**Implementation Ideas:**
- New Tauri commands: `export_data()`, `import_data(json_string)`
- Export format: Single JSON with all tables
- Include version number for compatibility

**Estimated Effort:** 4-6 hours

---

### 12. Database Migrations System

**Description:** Proper migration management for schema changes.

**Current State:** Manual migrations in `db/mod.rs`

**Improvement Ideas:**
- Use `sqlx` migrations directory
- Version tracking in database
- Rollback support
- Migration testing

**Estimated Effort:** 4-6 hours

---

## 🎨 UI/UX Improvements

### 13. Dark Mode

**Description:** Add dark mode theme toggle.

**Implementation Ideas:**
- Mantine already supports dark mode
- Add theme toggle button
- Store preference in local storage or database
- Apply theme on app load

**Estimated Effort:** 2-3 hours

---

### 14. Drag-and-Drop Assignment Creation

**Description:** Drag person onto project to create assignment.

**Implementation Ideas:**
- Use `@dnd-kit` or `react-beautiful-dnd`
- Visual timeline/calendar view
- Drag person card to project row
- Auto-fills assignment form with person+project

**Estimated Effort:** 8-12 hours

---

### 15. Keyboard Shortcuts

**Description:** Add keyboard shortcuts for common actions.

**Examples:**
- `Ctrl+N` - New item (context-aware)
- `Ctrl+S` - Save form
- `Esc` - Close modal
- `/` - Focus search
- `Ctrl+,` - Settings

**Implementation Ideas:**
- Use `react-hotkeys-hook`
- Add shortcuts help modal (`?` key)

**Estimated Effort:** 3-4 hours

---

## 🔔 Notifications & Alerts

### 16. Smart Notifications

**Description:** Alert users to capacity issues.

**Notification Types:**
- Person over-allocated (>100%)
- Project under-staffed
- Optimization improved allocations
- Conflicting assignments

**Implementation Ideas:**
- Use Mantine notifications
- Optional: Desktop notifications (Tauri API)
- Notification preferences in settings

**Estimated Effort:** 4-6 hours

---

## 🧪 Testing & Quality

### 17. Unit Tests

**Description:** Add comprehensive test coverage.

**Testing Needs:**
- Backend: Command tests, database tests
- Frontend: Component tests
- Integration tests

**Implementation Ideas:**
- Rust: Use `#[cfg(test)]` modules
- React: Jest + React Testing Library
- E2E: Playwright or Cypress

**Estimated Effort:** 20-30 hours (ongoing)

---

### 18. Error Handling Improvements

**Description:** Better error messages and recovery.

**Current State:** Generic error messages

**Improvements:**
- Specific error types
- User-friendly error messages
- Retry logic for transient errors
- Error reporting/logging

**Estimated Effort:** 6-8 hours

---

## 🌐 Collaboration Features

### 19. Multi-User Support (Future)

**Description:** Allow multiple users to collaborate on planning.

**Features:**
- User authentication
- User roles/permissions
- Concurrent editing handling
- Activity log

**Note:** Major feature requiring backend changes (may need server component)

**Estimated Effort:** 40-80 hours

---

### 20. Cloud Sync (Future)

**Description:** Sync data across devices.

**Implementation Ideas:**
- Backend API server
- Sync protocol
- Conflict resolution
- Offline support

**Note:** Major feature requiring infrastructure

**Estimated Effort:** 60-100 hours

---

## 📱 Platform Expansion

### 21. Mobile App (Future)

**Description:** iOS/Android version using Tauri Mobile.

**Features:**
- View capacity analysis
- Quick assignment adjustments
- Notifications

**Note:** Tauri v2 has mobile support (alpha/beta)

**Estimated Effort:** 40-60 hours

---

## 🔍 Advanced Features

### 22. What-If Scenarios

**Description:** Create and compare different assignment scenarios.

**Features:**
- Clone current assignments to scenario
- Edit scenario without affecting main plan
- Compare scenarios side-by-side
- Apply scenario to main plan

**Estimated Effort:** 12-16 hours

---

### 23. Historical Tracking

**Description:** Track changes over time.

**Features:**
- Version history of assignments
- "Time machine" to view past states
- Compare current vs past allocations
- Learn from past capacity planning

**Implementation Ideas:**
- Add audit tables
- Store snapshots at key points
- UI to browse history

**Estimated Effort:** 16-24 hours

---

### 24. Skills/Competencies Matching

**Description:** Match people to projects based on skills.

**Features:**
- Define skills (e.g., React, Backend, Design)
- People have skill proficiency levels
- Projects require certain skills
- Optimizer considers skill matching

**Implementation Ideas:**
- New tables: `skills`, `person_skills`, `project_skills`
- Optimizer constraint: Only assign if skills match
- UI for managing skills

**Estimated Effort:** 20-30 hours

---

### 25. Cost/Budget Tracking

**Description:** Track project costs based on hourly rates.

**Features:**
- People have hourly rates
- Calculate project costs
- Budget constraints in optimizer
- Cost reports

**Implementation Ideas:**
- Add `hourly_rate` to people table
- Calculate: `cost = effective_hours * hourly_rate`
- Add budget reports to analytics

**Estimated Effort:** 8-12 hours

---

## 📋 Priority Recommendations

### High Priority (Next Steps)
1. **Optimization Algorithm** (#7) - Core feature
2. **Capacity Analysis Dashboard** (#8) - Core feature
3. **Absence Management** (#10) - Completes existing model
4. **Environment Variable Override** (#6) - Easy win

### Medium Priority
5. **Automatic Log Cleanup** (#1) - Maintenance
6. **User-Configurable Log Level** (#4) - UX
7. **Data Import/Export** (#11) - Safety
8. **Dark Mode** (#13) - UX

### Low Priority / Nice to Have
9. **Log Viewer in UI** (#5) - Convenience
10. **Export Reports** (#9) - Reporting
11. **Keyboard Shortcuts** (#15) - Power users
12. **What-If Scenarios** (#22) - Advanced

### Future / Exploratory
- Multi-User Support (#19)
- Cloud Sync (#20)
- Mobile App (#21)
- Skills Matching (#24)

---

## 📝 Notes

- Effort estimates are approximate and for a single developer
- Some features depend on others (e.g., optimization algorithm before advanced scenarios)
- Consider user feedback before implementing less critical features
- Many features can be implemented incrementally

---

*Last Updated: 2025-12-27*
