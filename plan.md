# Capacity Planner - Application Design Document

## Overview
An autonomous desktop application built with Tauri and React for optimizing resource allocation and analyzing project feasibility across multiple projects and people within defined time periods.

## Core Requirements

### Capacity Model
- Capacity measured in **hours**
- People assigned to projects with **percentage allocation** of their total available time
- People can work on **multiple projects simultaneously** in the same period
- Planning scope is **user-defined** with arbitrary start and end dates

### People Management
- Each person has a **working schedule** (hours per week)
- Support for **holidays and vacation days** (entered as number of days per planning period)
- Schedule changes not supported in initial version

### Assignment Rules
- Users assign people to projects by specifying productivity factors only
- Allocation percentages are **calculated by the system** using optimization algorithms
- Assignment dates default to the project's full duration
- Multiple people can work on the same project simultaneously
- One person can be assigned to multiple overlapping projects
- Users can "pin" specific allocations to constrain the optimization
- System warns when projects are not viable with assigned resources

### Data Storage
- **Local storage** on device (SQLite)
- Export/import functionality (lower priority, JSON format)

### Primary Use Case
Determine optimal resource allocation and project feasibility:
- Users define projects (required hours, timeline) and available people (capacity, absences)
- Users assign people to projects with productivity factors
- System calculates optimal allocation percentages for each person on each project
- System identifies whether all projects are viable with available resources
- If projects cannot be completed, system communicates shortfalls and suggests alternatives

---

## Data Model

### Core Entities

#### 1. Planning Period
- `id`: Unique identifier
- `name`: Optional descriptive name
- `start_date`: Planning period start
- `end_date`: Planning period end
- `created_at`: Timestamp


#### 2. Person
- `id`: Unique identifier
- `name`: Person's name
- `hours_per_week`: Standard working hours per week
- `created_at`: Timestamp 

**Related:**
- Absences (vacation/holiday days)

**Calculated:**
- Total available hours in planning period: `(weeks × hours_per_week) - (vacation_days × hours_per_day)`

#### 3. Project
- `id`: Unique identifier
- `name`: Project name
- `description`: Optional description
- `required_hours`: Total effort needed
- `start_date`: Project start (within planning period)
- `end_date`: Project end (within planning period)
- `status`: planned, active, completed
- `created_at`: Timestamp

#### 4. Assignment
- `id`: Unique identifier
- `person_id`: Foreign key to person
- `project_id`: Foreign key to project
- `productivity_factor`: Percentage of person's time that is actually productive (0-1, required, default 0.5)
- `start_date`: Assignment start (defaults to project start)
- `end_date`: Assignment end (defaults to project end)
- `is_pinned`: Boolean - if true, allocation_percentage is user-defined and fixed
- `pinned_allocation_percentage`: User-specified allocation if pinned (0-100)
- `created_at`: Timestamp

**Calculated (stored for performance and history):**
- `calculated_allocation_percentage`: System-optimized allocation % (0-100)
- `calculated_effective_hours`: Actual productive hours contributed
- `last_calculated_at`: When optimization last ran

#### 5. Absence
- `id`: Unique identifier
- `person_id`: Foreign key to person
- `start_date`: Absence start
- `end_date`: Absence end
- `days`: Number of days absent
- `reason`: Optional (holiday, vacation, sick leave)

### Key Calculations

**Available Hours (Person):**
```
total_weeks = days_between(planning_start, planning_end) / 7
working_days = total_weeks × 5  // assuming 5-day work week
vacation_days = sum of absence days in period
available_days = working_days - vacation_days
total_available_hours = available_days × (hours_per_week / 5)
```

**Allocated Hours (Assignment):**
```
assignment_days = overlapping_days(assignment_period, planning_period)
hours_per_day = hours_per_week / 5
allocated_hours = assignment_days × hours_per_day × (allocation_percentage / 100)
effective_hours = allocated_hours × productivity_factor
```

**Note:** The `allocation_percentage` used here is calculated by the optimization algorithm.

**Commitment Level (Person at any point in time):**
```
total_allocation = sum(allocation_percentage for all overlapping assignments)
warning_threshold = 100%
over_committed = total_allocation > warning_threshold
```

### Optimization Algorithm

**Goal:** Determine optimal allocation percentages for all assignments to maximize project completion while respecting capacity constraints.

**Constraint Solving Approach:**
The system uses constraint-based optimization to solve the resource allocation problem:

**Inputs:**
- Projects: required_hours, start_date, end_date
- People: hours_per_week, absences (available capacity)
- Assignments: person_id, project_id, productivity_factor, pinned allocations

**Constraints:**
1. Person capacity: Sum of allocations for any person ≤ 100% at any point in time
2. Available hours: Account for absences and working schedule
3. Pinned allocations: Respect user-defined fixed allocations
4. Date overlaps: Only consider overlapping periods

**Optimization:**
```
For each project:
  required_hours = project.required_hours
  
  For each person assigned to project:
    available_capacity = calculate_available_hours(person, assignment_dates)
    max_contribution = available_capacity × productivity_factor
    
  Solve constraint satisfaction problem:
    Minimize: total_project_shortfall across all projects
    Subject to:
      - sum(allocations per person) ≤ 100% (per time period)
      - respect pinned allocations
      - allocations ≥ 0, ≤ 100%
```

**Output:**
- `calculated_allocation_percentage` for each assignment
- `calculated_effective_hours` for each assignment
- Project feasibility status (viable/not viable)
- Shortfall amounts for under-staffed projects

**Implementation Approach:**
- **Phase 3 (MVP)**: Simple proportional allocation algorithm
  - Calculate total required hours vs available capacity per project
  - Distribute proportionally among assigned people
  - Flag infeasible projects
  
- **Phase 4 (Advanced)**: Constraint solver using Rust optimization libraries
  - Linear programming (e.g., `good_lp` or `coin_cbc` crate)
  - Handle complex multi-project, multi-person scenarios
  - Multi-objective optimization (minimize under-staffing, balance workloads)

---

## Technology Stack

### Frontend (React)
- **Framework**: React 18+ with TypeScript
- **UI Library**: Mantine v8.3.10
- **Styling**: Tailwind CSS + Custom Themes
- **Theme System**: 
  - Dark Mode: One Dark (Atom/VS Code inspired)
  - Light Mode: Solarized Light
  - Toggle persistence via localStorage
- **Typography**:
  - Sans-serif: Inter (headers, navigation, body text)
  - Monospace: JetBrains Mono (numbers, tables, buttons, inputs)
- **State Management**: Zustand or React Context (local-first, simple)
- **Routing**: React Router
- **Forms**: React Hook Form + Zod validation
- **Date Handling**: date-fns (lightweight, functional)
- **Visualization**: 
  - Recharts (capacity charts, bar/line graphs)
  - React Big Calendar or custom timeline (Gantt-style views)
- **Tables**: TanStack Table (for data grids)

### Backend (Tauri/Rust)
- **Framework**: Tauri v2.x
- **Database**: SQLite via sqlx or rusqlite
- **Serialization**: serde + serde_json
- **Date Handling**: chrono
- **Commands**: Tauri commands for all CRUD operations
- **Business Logic**: Rust functions for calculations and validations

---

## Design System & Theming

### Color Themes

#### One Dark Theme (Dark Mode)
Inspired by Atom/VS Code One Dark, with syntax-highlighting color palette:

**Background Colors:**
- Background: `#282c34`
- Surface: `#21252b`
- Surface Hover: `#2c313a`
- Border: `#3e4451`

**Text Colors:**
- Primary: `#abb2bf`
- Secondary: `#5c6370`
- White: `#ffffff`

**Accent Colors** (10-shade interpolated palettes):
- Red: `#e06c75` - Errors, overcommitted status
- Orange: `#d19a66` - Warnings, underutilized status
- Yellow: `#e5c07b` - Caution, at-risk indicators
- Green: `#98c379` - Success, OK status
- Cyan: `#56b6c2` - Info, links
- Blue: `#61afef` - Primary actions, pinned items
- Purple: `#c678dd` - Special states

#### Solarized Light Theme (Light Mode)
Classic Solarized Light palette for daytime use:

**Background Colors:**
- Background: `#fdf6e3` (base3)
- Surface: `#eee8d5` (base2)
- Surface Hover: `#93a1a1` (base1)
- Border: `#839496` (base0)

**Text Colors:**
- Primary: `#657b83` (base00)
- Secondary: `#93a1a1` (base1)
- Emphasis: `#073642` (base02)

**Accent Colors** (10-shade interpolated palettes):
- Red: `#dc322f` - Errors, alerts
- Orange: `#cb4b16` - Warnings
- Yellow: `#b58900` - Caution
- Green: `#859900` - Success
- Cyan: `#2aa198` - Info
- Blue: `#268bd2` - Primary actions
- Magenta: `#d33682` - Special states
- Violet: `#6c71c4` - Accents

**UI Component Color Usage:**
- **Header/Navbar Background**: `#eee8d5` (base2 - light surface)
- **Main Content Background**: `#fdf6e3` (base3 - lightest)
- **Borders**: `#93a1a1` (base1 - subtle gray)
- **Table Headers**: `#eee8d5` (base2 - matches header)
- **Card/Paper Background**: `#ffffff` (pure white)
- **Input Background**: `#ffffff` (pure white)
- **Hover States**: `#93a1a1` (base1 - subtle highlight)
- **Active Nav Item**: `#839496` (base0 - medium gray)
- **Text in Inputs/Headers**: `#073642` (base02 - dark text)
- **Body Text**: `#657b83` (base00 - primary text)
- **Dimmed Text**: `#93a1a1` (base1 - subtle gray)

### Typography

**Font Loading:**
- JetBrains Mono loaded via Google Fonts CDN
- Inter loaded via system font stack fallback

**Font Application:**

**Monospace (JetBrains Mono):**
- All numeric data (percentages, hours, counts)
- All table content (headers and cells)
- All button labels
- All input fields (text, number, select)
- All badges and status indicators

**Sans-serif (Inter):**
- Page titles and headers (H1, H2, H3)
- Navigation menu items
- Body text and descriptions
- Long-form content

**Utility Classes:**
```css
.numeric-data {
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
```

### Theme Toggle
- Located in header (right side, next to app title)
- Icon: Sun (light mode) / Moon (dark mode)
- Persists preference in localStorage
- Smooth transition between themes

### Status Color Mappings

**Person Utilization:**
- 0-49%: Orange - "Underutilized"
- 50-95%: Green - "OK"
- 96-100%: Red - "Capacity"
- >100%: Red - "Overcommitted"

**Project Staffing:**
- ≥100%: Green - "Viable"
- 80-99%: Yellow - "At Risk"
- <80%: Red - "Under-Staffed"

---

## Database Schema

```sql
-- Planning periods
CREATE TABLE planning_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    start_date TEXT NOT NULL,  -- ISO 8601 format
    end_date TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- People
CREATE TABLE people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    hours_per_week REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Projects
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    required_hours REAL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT DEFAULT 'planned',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Assignments
CREATE TABLE assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    productivity_factor REAL NOT NULL DEFAULT 0.5,  -- Required, 0.0 to 1.0
    start_date TEXT NOT NULL,  -- Defaults to project start
    end_date TEXT NOT NULL,    -- Defaults to project end
    is_pinned BOOLEAN DEFAULT 0,
    pinned_allocation_percentage REAL,  -- Only used if is_pinned = 1
    calculated_allocation_percentage REAL,  -- System calculated
    calculated_effective_hours REAL,        -- System calculated
    last_calculated_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Absences (holidays/vacations)
CREATE TABLE absences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    days INTEGER NOT NULL,
    reason TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_assignments_person ON assignments(person_id);
CREATE INDEX idx_assignments_project ON assignments(project_id);
CREATE INDEX idx_absences_person ON absences(person_id);
```

---

## Application Architecture

### Tauri Commands (Rust Backend)

**Planning Period:**
- `create_planning_period(name, start_date, end_date) -> Result<PlanningPeriod>`
- `get_planning_period(id) -> Result<PlanningPeriod>`
- `list_planning_periods() -> Result<Vec<PlanningPeriod>>`
- `update_planning_period(id, ...) -> Result<PlanningPeriod>`
- `delete_planning_period(id) -> Result<()>`

**People:**
- `create_person(name, hours_per_week) -> Result<Person>`
- `get_person(id) -> Result<Person>`
- `list_people() -> Result<Vec<Person>>`
- `update_person(id, ...) -> Result<Person>`
- `delete_person(id) -> Result<()>`

**Projects:**
- `create_project(name, description, required_hours, start_date, end_date) -> Result<Project>`
- `get_project(id) -> Result<Project>`
- `list_projects() -> Result<Vec<Project>>`
- `update_project(id, ...) -> Result<Project>`
- `delete_project(id) -> Result<()>`

**Assignments:**
- `create_assignment(person_id, project_id, productivity_factor, start_date?, end_date?) -> Result<Assignment>`
- `get_assignment(id) -> Result<Assignment>`
- `list_assignments() -> Result<Vec<Assignment>>`
- `list_assignments_by_person(person_id) -> Result<Vec<Assignment>>`
- `list_assignments_by_project(project_id) -> Result<Vec<Assignment>>`
- `update_assignment_productivity(id, productivity_factor) -> Result<Assignment>`
- `pin_assignment_allocation(id, allocation_percentage) -> Result<Assignment>`
- `unpin_assignment_allocation(id) -> Result<Assignment>`
- `delete_assignment(id) -> Result<()>`

**Absences:**
- `create_absence(person_id, start_date, end_date, days, reason) -> Result<Absence>`
- `list_absences_by_person(person_id) -> Result<Vec<Absence>>`
- `delete_absence(id) -> Result<()>`

**Analytics:**
- `calculate_person_capacity(person_id, planning_period_id) -> Result<PersonCapacity>`
- `calculate_project_staffing(project_id) -> Result<ProjectStaffing>`
- `get_capacity_overview(planning_period_id) -> Result<CapacityOverview>`
- `check_over_commitments(planning_period_id) -> Result<Vec<OverCommitment>>`

**Optimization:**
- `run_optimization(planning_period_id) -> Result<OptimizationResult>`
- `get_optimization_status(planning_period_id) -> Result<OptimizationStatus>`
- `get_project_feasibility(project_id) -> Result<ProjectFeasibility>`

Where:
```rust
OptimizationResult {
    success: bool,
    calculations: Vec<AssignmentCalculation>,
    infeasible_projects: Vec<ProjectShortfall>,
    warnings: Vec<String>,
}

ProjectFeasibility {
    project_id: i64,
    required_hours: f64,
    available_capacity: f64,
    calculated_effective_hours: f64,
    is_viable: bool,
    shortfall: f64,
    utilization_percentage: f64,
}
```

### React Frontend Structure

```
src/
├── components/
│   ├── ui/                      # Mantine components
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── people/
│   │   ├── PersonList.tsx
│   │   ├── PersonForm.tsx
│   │   └── AbsenceForm.tsx
│   ├── projects/
│   │   ├── ProjectList.tsx
│   │   └── ProjectForm.tsx
│   ├── assignments/
│   │   ├── AssignmentMatrix.tsx
│   │   ├── AssignmentForm.tsx
│   │   └── AssignmentTimeline.tsx
│   ├── capacity/
│   │   ├── CapacityDashboard.tsx
│   │   ├── PersonCapacityCard.tsx
│   │   ├── ProjectStaffingCard.tsx
│   │   └── OverCommitmentWarning.tsx
│   └── planning/
│       └── PlanningPeriodForm.tsx
├── stores/
│   ├── usePlanningStore.ts
│   ├── usePeopleStore.ts
│   ├── useProjectsStore.ts
│   └── useAssignmentsStore.ts
├── hooks/
│   ├── useTauriCommand.ts
│   └── useCapacityCalculations.ts
├── lib/
│   ├── tauri.ts               # Tauri invoke wrappers
│   ├── calculations.ts         # Frontend calculations
│   └── utils.ts
├── types/
│   └── index.ts                # TypeScript types
├── pages/
│   ├── PlanningSetup.tsx
│   ├── PeopleManagement.tsx
│   ├── ProjectsManagement.tsx
│   ├── AssignmentDashboard.tsx
│   └── CapacityAnalysis.tsx
└── App.tsx
```

---

## User Interface & Flow

### 1. Planning Period Setup
**Screen:** Initial setup or planning period selection

**Elements:**
- Form with fields: Name (optional), Start Date, End Date
- Display calculated: Total weeks, total working days
- List of existing planning periods (if any)
- "Create New Period" button

**Flow:**
1. User enters dates
2. System calculates duration
3. User confirms and creates period
4. Navigate to main dashboard

---

### 2. People Management
**Screen:** List view with CRUD operations

**Elements:**
- Table: Name, Hours/Week, Total Available Hours, Actions
- "Add Person" button
- Edit/Delete actions per row

**Person Form:**
- Name (text input)
- Hours per week (number input)
- Absences section:
  - Add absence button
  - List of absences (date range, days, reason)
  - Total vacation days display

**Flow:**
1. Click "Add Person"
2. Fill in form
3. Optionally add absences
4. Save person
5. Return to list

---

### 3. Projects Management
**Screen:** List view with CRUD operations

**Elements:**
- Table: Name, Required Hours, Dates, Allocated Hours, Status, Actions
- "Add Project" button
- Edit/Delete actions per row

**Project Form:**
- Name (text input)
- Description (textarea)
- Required hours (number input)
- Start date (date picker, within planning period)
- End date (date picker, within planning period)
- Status (dropdown: planned, active, completed)

**Flow:**
1. Click "Add Project"
2. Fill in form with validation (dates within planning period)
3. Save project
4. Return to list

---

### 4. Assignment Dashboard (Main View)
**Screen:** Central workspace for assigning people to projects and viewing optimization results

**Layout:**
- **Left Sidebar:** List of projects with requirements and current status
- **Center Panel:** Assignment interface
- **Right Sidebar:** Optimization results and project feasibility
- **Bottom Panel:** Capacity warnings and person utilization summary

**Assignment Interface:**

**Assignment Form:**
- Dropdowns: Select person, select project
- Inputs: 
  - Productivity factor (required, default 0.5, range 0.0-1.0)
  - Start date (defaults to project start)
  - End date (defaults to project end)
- Toggle: "Pin allocation" (optional)
  - If pinned: Show allocation % input field
- Button: "Add Assignment"
- Validation: Warn if person already heavily committed

**After assignments created:**
- Button: "Calculate Optimal Allocations" (prominent, primary action)
- Shows last calculation timestamp
- Auto-suggests when assignments change

**Optimization Results Panel (Right Sidebar):**

**When project selected:**
- Project name, description
- Required hours: 400h
- Assigned people: 
  - Alice: 45% allocation (0.7 productivity) → 126 effective hours
  - Bob: 60% allocation (0.5 productivity) → 90 effective hours
- Total effective hours: 216h
- Status: ❌ NOT VIABLE - Shortfall: 184h (needs 54% more capacity)
- Suggestions:
  - Assign additional people
  - Increase productivity factors
  - Extend project timeline
  - Reduce required hours

**When person selected:**
- Name, hours/week
- Total available hours in period
- Current assignments:
  - Project X: 45% (calculated) [📌 if pinned]
  - Project Y: 30% (calculated)
  - Project Z: 15% (calculated)
- Total allocation: 90%
- Remaining capacity: 10%
- Utilization status: ✅ OK (green)

**Project List (Left Sidebar):**
Each project shows:
- Name
- Required hours
- Status badge:
  - ✅ Viable (green) - 100%+ effective hours available
  - ⚠️ At Risk (yellow) - 80-99% effective hours
  - ❌ Not Viable (red) - <80% effective hours
- Staffing percentage: "87% staffed"
- Click to view details

---

### 5. Capacity Analysis View
**Screen:** Dashboard with visualizations and insights

**Sections:**

**A. Overall Summary**
- Total people: X
- Total projects: X
- Over-committed people: X (with warning badge)
- Under-staffed projects: X

**B. Per-Person Capacity**
- List/cards for each person showing:
  - Name
  - Available hours
  - Allocated hours
  - Utilization % (with progress bar)
  - Visual indicator: green (<90%), yellow (90-100%), red (>100%)
  - List of assignments

**C. Per-Project Staffing**
- List/cards for each project showing:
  - Name
  - Required hours
  - Calculated effective hours (with productivity factors applied)
  - Allocated hours (raw, before productivity factor)
  - Staffing % (effective hours / required hours × 100)
  - Visual indicator: 
    - ✅ Green (≥100%) - Fully staffed or over-staffed
    - ⚠️ Yellow (80-99%) - At risk, nearly sufficient
    - ❌ Red (<80%) - Not viable, significantly under-staffed
  - List of assigned people with calculated allocations
  - Shortfall amount if under-staffed: "Needs 120 more effective hours"

**D. Timeline Visualization**
- Gantt-style chart
- Rows: People or Projects (toggle view)
- Bars: Assignments with color coding
- Hover: Show details (project, allocation, dates)

**E. Warnings & Alerts**
- List of over-commitments:
  - Person name
  - Total allocation %
  - Conflicting assignments
  - Suggested actions

---

## Implementation Phases

### Phase 1: Project Setup & Infrastructure
**Goal:** Working Tauri + React application with database

**Tasks:**
1. Initialize Tauri project with React template
2. Configure TypeScript, Tailwind CSS
3. Set up SQLite database in Rust
4. Create database schema and migrations
5. Implement basic Tauri commands (test with one entity)
6. Set up routing in React
7. Create basic app layout (header, sidebar)

**Deliverable:** Empty app shell with database connectivity

---

### Phase 2: Core Data Management
**Goal:** CRUD operations for all entities

**Tasks:**
1. Implement all Tauri commands (CRUD for all entities)
2. Create TypeScript types matching Rust structs
3. Build People Management page:
   - PersonList component
   - PersonForm component
   - AbsenceForm component
4. Build Projects Management page:
   - ProjectList component
   - ProjectForm component
5. Build Planning Period Setup page
6. Add form validation (Zod schemas)
7. Test all CRUD operations

**Deliverable:** Fully functional data management screens

---

### Phase 3: Assignment Logic & Optimization
**Goal:** Create assignments and implement capacity optimization algorithm

**Tasks:**
1. Implement assignment creation interface:
   - Assignment form (person, project, productivity factor, dates)
   - Assignment list/matrix view
   - Pin/unpin allocation functionality
2. Build simple proportional optimization algorithm in Rust:
   - Calculate available capacity per person (considering absences)
   - Calculate total required hours per project
   - Distribute capacity proportionally among assigned people
   - Detect over-commitments and infeasible projects
3. Implement "Calculate Optimal Allocations" command:
   - Run optimization algorithm
   - Store calculated allocations in database
   - Return results with feasibility status
4. Build Assignment Dashboard page
5. Implement real-time warnings in UI:
   - Over-committed people
   - Infeasible projects
   - Shortfall calculations
6. Add assignment deletion capability
7. Add pin/unpin allocation functionality

**Deliverable:** Working assignment system with basic optimization

---

### Phase 4: Capacity Analysis & Visualization
**Goal:** Insights and visual representations

**Tasks:**
1. Implement capacity calculation commands in Rust
2. Build Capacity Analysis page:
   - Summary cards
   - Person capacity list/cards
   - Project staffing list/cards with feasibility status
3. Integrate Recharts:
   - Bar charts for capacity utilization
   - Comparison charts: required vs. allocated vs. effective hours
   - Stacked bar charts for project allocations
4. Build timeline/Gantt visualization:
   - Timeline component showing calculated allocations over time
   - Person/project toggle
   - Interactive tooltips with productivity factors and effective hours
5. Create warning/alert components:
   - Project feasibility alerts
   - Under-staffing shortfall displays
   - Optimization suggestions
6. Add color coding throughout UI
7. **[NEW]** Implement advanced constraint solver:
   - Integrate Rust optimization library (e.g., good_lp)
   - Replace proportional algorithm with constraint-based solver
   - Support multi-objective optimization
   - Handle complex scenarios with pinned allocations

**Deliverable:** Complete capacity analysis dashboard with advanced optimization

---

### Phase 5: Polish & Export
**Goal:** Production-ready application

**Tasks:**
1. Implement export functionality:
   - Export planning data to JSON
   - Export reports to CSV
2. Implement import functionality:
   - Import planning data from JSON
3. Add print/PDF report generation (optional)
4. Error handling and user feedback:
   - Toast notifications
   - Error boundaries
   - Loading states
5. UI/UX refinements:
   - Responsive design
   - Keyboard shortcuts
   - Dark mode (optional)
6. Performance optimization:
   - Database query optimization
   - React rendering optimization
7. Testing:
   - Unit tests for calculations
   - Integration tests for Tauri commands
8. Documentation:
   - User guide
   - Developer documentation

**Deliverable:** Production-ready application

---

## Open Questions & Decisions Needed

### 1. Weekend Handling
**Question:** Should the system automatically exclude weekends when calculating working days, or should this be configurable?

**Options:**
- A: Always assume 5-day work week (Monday-Friday)
- B: Make it configurable per planning period
- C: Make it configurable per person

**Recommendation:** Start with option A (5-day week), add flexibility later if needed.

---

### 2. Holiday Calendar
**Question:** Should there be a global holiday calendar (e.g., "US Federal Holidays") that applies to everyone, or only per-person absences?

**Options:**
- A: Only per-person absences (current design)
- B: Global holiday calendar + per-person absences
- C: Multiple holiday calendars (regional) + per-person absences

**Recommendation:** Start with option A, add global holidays in Phase 5 if needed.

---

### 4. Optimization Algorithm Complexity
**Question:** How sophisticated should the initial optimization algorithm be?

**Options:**
- A: Simple proportional distribution (Phase 3 MVP)
  - Easy to implement and understand
  - Works well for straightforward scenarios
  - May not find optimal solutions in complex cases
  
- B: Advanced constraint solver from start (Phase 3)
  - More powerful and flexible
  - Handles complex scenarios better
  - More complex to implement and debug
  - Requires optimization library integration

**Decision:** Start with Option A in Phase 3, upgrade to Option B in Phase 4

**Impact:** Affects Phase 3 implementation timeline and technical complexity

---

### 5. Visualization Priorities
**Question:** Which visualizations are most critical for decision-making?

**Options (rank by importance):**
- Bar charts showing hours allocated vs. available per person
- Timeline/Gantt showing when people work on what projects
- Pie charts showing percentage breakdown of person's time
- Table views with detailed numbers
- Stacked bar charts showing project composition (which people)

**Recommendation:** Focus on top 2-3 for Phase 4, add others in Phase 5.

---

### 6. Date Granularity
**Question:** Should assignments and absences support:
- Full day precision only (simpler)
- Hour precision (more accurate but complex)

**Recommendation:** Start with full day precision, add hour precision later if needed.

---

## Technical Considerations

### Optimization Algorithm Implementation

**Phase 3 - Simple Proportional Algorithm:**
```rust
fn calculate_proportional_allocation(
    projects: Vec<Project>,
    assignments: Vec<Assignment>,
    people: Vec<Person>,
) -> OptimizationResult {
    // For each project, calculate total required hours
    // For each assignment to that project, calculate available capacity
    // Distribute proportionally based on available capacity
    // Flag projects where total available < required
}
```

**Phase 4 - Constraint Solver:**
- Use Rust optimization library: `good_lp` or `coin_cbc`
- Formulate as Linear Programming problem
- Variables: allocation percentages for each assignment
- Objective: Minimize sum of project shortfalls
- Constraints: person capacity limits, pinned allocations
- Solver finds optimal solution or reports infeasibility

### Performance Considerations:
- Optimization runs on-demand (user clicks button)
- Cache results in database with timestamp
- Invalidate cache when assignments/projects/people change
- For large datasets (100+ people, 50+ projects), consider:
  - Background processing
  - Progress indicators
  - Incremental re-optimization

### Data Integrity:
- Calculated allocations are derived data
- Store for performance and historical tracking
- Include `last_calculated_at` timestamp
- UI indicates when calculations are stale

---

## Next Steps

1. **Review this plan** - Confirm the overall approach and architecture
2. **Answer open questions** - Make decisions on the items above
3. **Prioritize features** - Confirm MVP scope (Phases 1-3 vs. including Phase 4)
4. **Technology choices** - Confirm UI library preference (shadcn/ui vs. Mantine)
5. **Begin implementation** - Start with Phase 1 once plan is approved

---

## Appendix: Example Scenarios

### Scenario 1: Simple Planning with Optimization
**Setup:**
- Planning period: Jan 1 - Mar 31 (13 weeks)
- 2 people: 
  - Alice (40h/week, no absences) → 520h available
  - Bob (30h/week, no absences) → 390h available
- 2 projects: 
  - Project X (400h required, Jan 1 - Mar 31)
  - Project Y (300h required, Jan 1 - Mar 31)

**User Actions:**
1. Creates assignments:
   - Alice to Project X (productivity: 0.8)
   - Alice to Project Y (productivity: 0.7)
   - Bob to Project X (productivity: 0.5)
   - Bob to Project Y (productivity: 0.6)
2. Clicks "Calculate Optimal Allocations"

**System Calculations:**
Available effective capacity:
- Alice on X: 520h × 0.8 = 416h max
- Alice on Y: 520h × 0.7 = 364h max
- Bob on X: 390h × 0.5 = 195h max
- Bob on Y: 390h × 0.6 = 234h max

Optimization result (proportional distribution):
- Project X needs 400h total:
  - Alice: 52% → 270.4h allocated × 0.8 = 216h effective
  - Bob: 48% → 187.2h allocated × 0.5 = 94h effective
  - Total: 310h effective (77.5% staffed) ❌ NOT VIABLE
  
- Project Y needs 300h total:
  - Alice: 48% → 249.6h allocated × 0.7 = 175h effective
  - Bob: 52% → 202.8h allocated × 0.6 = 122h effective
  - Total: 297h effective (99% staffed) ⚠️ AT RISK

**Results Displayed:**
- Alice: 100% allocated (52% to X + 48% to Y)
- Bob: 100% allocated (48% to X + 52% to Y)
- Project X: ❌ NOT VIABLE - Shortfall: 90h (needs 29% more capacity)
- Project Y: ⚠️ AT RISK - Nearly sufficient

**Action Required:** 
- Assign additional person to Project X, OR
- Improve productivity factors, OR
- Reduce Project X scope, OR
- Extend Project X timeline

---

### Scenario 2: Time-Bounded Assignment
**Setup:**
- Planning period: Jan 1 - Jun 30 (26 weeks)
- 1 person: Carol (40h/week)
- 3 projects: A, B, C

**Assignments:**
- Carol to Project A: 100%, Jan 1 - Feb 28
- Carol to Project B: 50%, Mar 1 - Apr 30
- Carol to Project C: 50%, Mar 1 - Jun 30

**Results:**
- Jan-Feb: Carol 100% allocated to A
- Mar-Apr: Carol 100% allocated (50% B + 50% C)
- May-Jun: Carol 50% allocated to C (50% available)

**Status:** No over-commitment, Carol has capacity in May-Jun

---

### Scenario 3: Over-Commitment Warning
**Setup:**
- Planning period: Jan 1 - Dec 31 (52 weeks)
- 1 person: David (40h/week, 10 vacation days)
- Multiple projects with overlapping assignments

**Assignments:**
- Project 1: 60%, Jan 1 - Jun 30
- Project 2: 50%, Apr 1 - Sep 30

**Results:**
- Jan-Mar: 60% allocated (OK)
- Apr-Jun: 110% allocated (WARNING: Over-committed!)
- Jul-Sep: 50% allocated (OK)

**Action:** Adjust allocation percentages or shift dates
