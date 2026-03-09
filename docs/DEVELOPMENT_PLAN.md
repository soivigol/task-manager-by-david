# Dev Task — Development Plan

## Project Overview

**Dev Task** is a single-user task management and time-tracking web application
built for a freelancer managing work across multiple clients. It features
status-based task grouping, manual time tracking, client prepaid-hour balances
(supporting negative), recurring task automation, subtasks, and PDF reports.
Stack: Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL
+ Auth + RLS), Zustand, @dnd-kit, Tiptap, @react-pdf/renderer. Deployed to
Vercel.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript strict |
| Styling | Tailwind CSS, DM Sans font |
| State | Zustand |
| Backend/DB | Supabase (PostgreSQL + Auth + RLS) |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Rich Editor | Tiptap |
| PDF Export | @react-pdf/renderer |
| Deployment | Vercel + Supabase Cloud |

---

## Database Schema

### `profiles`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, FK → auth.users(id) ON DELETE CASCADE | |
| full_name | text | NOT NULL | |
| avatar_url | text | nullable | |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | default now() | |

### `statuses`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default gen_random_uuid() | |
| user_id | uuid | NOT NULL, FK → profiles(id) ON DELETE CASCADE | |
| name | text | NOT NULL | Stored UPPERCASE |
| color | text | NOT NULL | Hex color string |
| sort_order | integer | NOT NULL default 0 | |
| is_closed | boolean | default false | Closing a task to this status triggers recurrence |
| created_at | timestamptz | default now() | |

### `clients`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default gen_random_uuid() | |
| user_id | uuid | NOT NULL, FK → profiles(id) ON DELETE CASCADE | |
| name | text | NOT NULL | |
| color | text | NOT NULL default '#6b7280' | Hex color |
| prepaid_total_minutes | integer | NOT NULL default 0 | 0 = no prepaid plan |
| prepaid_remaining_minutes | integer | NOT NULL default 0 | Can go negative |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | default now() | |

### `tasks`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default gen_random_uuid() | |
| user_id | uuid | NOT NULL, FK → profiles(id) ON DELETE CASCADE | |
| parent_id | uuid | nullable, FK → tasks(id) ON DELETE CASCADE | Subtask parent |
| status_id | uuid | NOT NULL, FK → statuses(id) | |
| client_id | uuid | nullable, FK → clients(id) ON DELETE SET NULL | |
| title | text | NOT NULL | |
| description | jsonb | nullable | Tiptap JSON |
| due_date | date | nullable | |
| priority | text | CHECK IN ('urgent','high','normal','low') default 'normal' | |
| quick_notes | text | nullable | Inline editable field |
| sort_order | integer | NOT NULL default 0 | Within status group |
| total_tracked_minutes | integer | default 0 | Maintained by trigger |
| recurrence_type | text | CHECK IN ('weekly','monthly','custom_days','custom_weekdays') | nullable |
| recurrence_interval | integer | default 1 | Every N weeks/months |
| recurrence_days | integer | nullable | For custom_days: every N days |
| recurrence_weekdays | integer[] | nullable | For custom_weekdays: [0-6] Mon=0..Sun=6 |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | default now() | |

**Constraint:** `parent_id IS NULL OR NOT EXISTS (SELECT 1 FROM tasks t WHERE t.id = parent_id AND t.parent_id IS NOT NULL)` — max 1 level deep

**Indexes:**
- `idx_tasks_user_status` on (user_id, status_id)
- `idx_tasks_parent` on (parent_id) WHERE parent_id IS NOT NULL
- `idx_tasks_sort` on (user_id, status_id, sort_order)

### `time_entries`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default gen_random_uuid() | |
| task_id | uuid | NOT NULL, FK → tasks(id) ON DELETE CASCADE | |
| user_id | uuid | NOT NULL, FK → profiles(id) ON DELETE CASCADE | |
| minutes | integer | NOT NULL | |
| description | text | nullable | |
| tracked_date | date | NOT NULL default CURRENT_DATE | |
| created_at | timestamptz | default now() | |

**Indexes:**
- `idx_time_entries_task` on (task_id)
- `idx_time_entries_date` on (user_id, tracked_date)

### Triggers

- **`trg_time_entry_change`**: After INSERT/UPDATE/DELETE on time_entries → updates `tasks.total_tracked_minutes` via SUM.
- **`trg_prepaid_deduct`**: After INSERT on time_entries → deducts minutes from `clients.prepaid_remaining_minutes` if `prepaid_total_minutes > 0`. Allows negative.

### RLS Policies

- All tables: `own_data` — `user_id = auth.uid()` for SELECT, INSERT, UPDATE, DELETE.
- Profiles: read/update own row only.

---

## API Design

All data operations use Next.js Server Actions in `lib/api/`. No REST endpoints
needed — Supabase client called server-side with session from cookies.

### Tasks

| Function | Description |
|----------|-------------|
| `getTasks()` | Fetch all tasks + subtasks for current user, ordered by sort_order |
| `createTask(data)` | Insert task, auto sort_order at end of status group |
| `updateTask(id, data)` | Update task fields |
| `deleteTask(id)` | Delete task + cascades to subtasks and time_entries |
| `changeTaskStatus(id, newStatusId)` | Update status; if is_closed + has recurrence → clone new task with next due date |
| `reorderTasks(statusId, orderedIds)` | Batch update sort_order within a status group |

### Subtasks

| Function | Description |
|----------|-------------|
| `createSubtask(parentId, data)` | Insert subtask with parent_id; status_id mirrors parent |

### Time Entries

| Function | Description |
|----------|-------------|
| `addTimeEntry(taskId, minutes, description, date)` | Insert; trigger updates task.total_tracked_minutes and client prepaid |
| `getTimeEntries(taskId)` | List all entries for a task, newest first |
| `deleteTimeEntry(id)` | Delete; trigger recalculates total |

### Statuses

| Function | Description |
|----------|-------------|
| `getStatuses()` | All statuses for current user, ordered by sort_order |
| `createStatus(data)` | Insert |
| `updateStatus(id, data)` | Update name/color/is_closed |
| `deleteStatus(id)` | Delete (fails if tasks reference it — handle gracefully) |
| `reorderStatuses(orderedIds)` | Batch update sort_order |

### Clients

| Function | Description |
|----------|-------------|
| `getClients()` | All clients for current user |
| `createClient(data)` | Insert |
| `updateClient(id, data)` | Update name/color/prepaid |
| `deleteClient(id)` | Delete (tasks.client_id → SET NULL via FK) |
| `markOveragePaid(id)` | Set prepaid_remaining_minutes = 0 where currently < 0 |

### Reports

| Function | Description |
|----------|-------------|
| `getReport(dateRange, clientId?)` | Aggregate time_entries by client and task for date range |

---

## File Structure

```
dev-task/
├── app/
│   ├── layout.tsx                    # Root layout: DM Sans font, providers
│   ├── page.tsx                      # Redirect: /dashboard or /login
│   ├── login/
│   │   └── page.tsx                  # Login form (email + password, no register)
│   ├── (dashboard)/                  # Route group: auth-protected
│   │   ├── layout.tsx                # Sidebar + header shell
│   │   ├── page.tsx                  # Redirect to /tasks
│   │   ├── tasks/
│   │   │   └── page.tsx              # Task list page (server component)
│   │   ├── clients/
│   │   │   └── page.tsx              # Clients page
│   │   ├── reports/
│   │   │   └── page.tsx              # Reports page
│   │   └── settings/
│   │       └── page.tsx              # Settings page (statuses + clients CRUD)
│   └── globals.css                   # Tailwind base styles
├── components/
│   ├── ui/
│   │   ├── Modal.tsx                 # Base modal wrapper
│   │   ├── Toast.tsx                 # Toast notification system
│   │   ├── ConfirmDialog.tsx         # Destructive action confirmation
│   │   └── Icons.tsx                 # All SVG icons as components
│   ├── tasks/
│   │   ├── TaskListClient.tsx        # Client wrapper (Zustand, drag & drop)
│   │   ├── StatusGroup.tsx           # Collapsible status section
│   │   ├── TaskRow.tsx               # Single task row (CSS Grid)
│   │   ├── TaskModal.tsx             # Create + edit task modal
│   │   ├── TimePopup.tsx             # Add time entry popup
│   │   ├── StatusPicker.tsx          # Status change dropdown
│   │   └── RecurringBadge.tsx        # Recurrence label badge
│   ├── clients/
│   │   ├── ClientCard.tsx            # Client card with prepaid meter
│   │   └── PrepaidMeter.tsx          # Progress bar + mark paid
│   ├── reports/
│   │   ├── ReportView.tsx            # Report table component
│   │   └── ReportPDF.tsx             # react-pdf document
│   ├── settings/
│   │   ├── StatusSettings.tsx        # Status CRUD panel
│   │   └── ClientSettings.tsx        # Client CRUD panel
│   └── layout/
│       ├── Sidebar.tsx               # Dark sidebar navigation
│       └── Header.tsx                # Top bar with search + new task button
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # createBrowserClient (anon key)
│   │   ├── server.ts                 # createServerClient (cookies)
│   │   └── middleware.ts             # updateSession helper
│   ├── api/
│   │   ├── tasks.ts                  # Server actions: task CRUD + recurrence
│   │   ├── time-entries.ts           # Server actions: time tracking
│   │   ├── statuses.ts               # Server actions: status CRUD
│   │   ├── clients.ts                # Server actions: client CRUD
│   │   └── reports.ts                # Server actions: report query
│   ├── store/
│   │   └── app-store.ts              # Zustand: tasks, statuses, clients, UI state
│   ├── recurrence.ts                 # calcNextDue(), recurrenceLabel()
│   └── utils.ts                      # fmt(), fmtDate(), uid(), cn()
├── types/
│   ├── database.types.ts             # Generated: supabase gen types typescript
│   └── app.types.ts                  # Task, Client, Status, TimeEntry interfaces
├── middleware.ts                      # Auth guard: redirect to /login if no session
├── supabase/
│   └── migrations/
│       └── 001_initial.sql           # All tables, indexes, triggers, RLS
├── public/
├── .env.local.example                # NEXT_PUBLIC_SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## Recurring Tasks Logic

### Recurrence Types

| Type | Config | Next Due Calculation |
|------|--------|---------------------|
| `weekly` | interval: N | due_date + (7 × N) days |
| `monthly` | interval: N | due_date + N months |
| `custom_days` | days: N | due_date + N days |
| `custom_weekdays` | weekdays: [0-6] | next selected weekday after current due_date (Mon=0...Sun=6) |

### Clone Flow (when status → is_closed)

1. Calculate nextDue from current due_date + recurrence config
2. Find first non-closed status (default OPEN)
3. Create new task: same title, client, priority, description, recurrence — fresh time, status=OPEN
4. Clone subtasks with parent_id = new task id, time reset to 0
5. Original task stays in closed status (historical record)
6. Show toast: "Recurring task created → due [date]"

---

## Phase 1 — Scaffolding & Auth

**Duration:** 1–2 days
**Goal:** Working Next.js app with Supabase, database schema, login page, and auth middleware.
**Depends on:** Nothing

### Steps

#### 1.1 — Project Initialization
- `npx create-next-app@latest dev-task --typescript --tailwind --app --no-src-dir`
- Install dependencies: `@supabase/supabase-js @supabase/ssr zustand`
- Add font: `npm install --save next/font` (DM Sans from Google Fonts)
- Configure `tailwind.config.ts`: add DM Sans as sans font family
- Configure `next.config.ts`: minimal config
- Create `.env.local` from `.env.local.example`

#### 1.2 — Supabase Setup
- Create Supabase project (dev environment)
- Write `supabase/migrations/001_initial.sql`:
  - All 5 tables with constraints and indexes
  - `update_task_tracked_minutes` trigger + function
  - `deduct_prepaid` trigger + function
  - RLS enabled on all tables with `own_data` policy
- Run migration: `supabase db push` or via Supabase dashboard SQL editor
- Create `lib/supabase/client.ts` — `createBrowserClient`
- Create `lib/supabase/server.ts` — `createServerClient` with cookie helpers
- Create `lib/supabase/middleware.ts` — `updateSession`

#### 1.3 — Auth Middleware
- Create `middleware.ts` at project root:
  - Refresh session on every request
  - If no session and path is not `/login`: redirect to `/login`
  - If session and path is `/login`: redirect to `/tasks`
  - Protect all routes under `(dashboard)`
- Generate types: `supabase gen types typescript > types/database.types.ts`

#### 1.4 — Login Page
- Create `app/login/page.tsx`:
  - Email + password form (no register link)
  - Show "Invalid credentials" on error
  - Redirect to `/tasks` on success
  - Clean minimal design matching the app's dark/light aesthetic
  - "Dev Task" logo/name at top
- Create `app/page.tsx`: server component that checks session → redirect

### Success Criteria
- [ ] `npm run dev` starts without errors
- [ ] Visiting `/tasks` unauthenticated redirects to `/login`
- [ ] Login with valid Supabase credentials redirects to `/tasks`
- [ ] Login with wrong credentials shows error message
- [ ] Session persists on page refresh
- [ ] All 5 tables exist in Supabase with correct columns, indexes, triggers, RLS
- [ ] TypeScript compiles without errors

---

## Phase 2 — Layout & Navigation

**Duration:** 1 day
**Goal:** App shell with sidebar, header, and route structure. Zustand store initialized.
**Depends on:** Phase 1

### Steps

#### 2.1 — Dashboard Layout
- Create `app/(dashboard)/layout.tsx`:
  - Flex layout: 46px dark sidebar + main content area
  - Load user data (profile) from Supabase server-side
  - Pass user to client components
- Create `components/layout/Sidebar.tsx`:
  - Dark background `#1a1a2e`
  - "D" logo at top (gradient cyan)
  - Nav icons: Tasks, Clients, Reports (with active state)
  - Bottom: Settings icon, Logout button
  - Active page indicator (white/12% background)
- Create `components/layout/Header.tsx`:
  - White bar 44px height
  - Left: "Dev Task" title + page badge
  - Right (tasks page): search bar + New Task button

#### 2.2 — Page Shells
- Create `app/(dashboard)/page.tsx` → redirect to `/tasks`
- Create `app/(dashboard)/tasks/page.tsx` — placeholder "Tasks"
- Create `app/(dashboard)/clients/page.tsx` — placeholder "Clients"
- Create `app/(dashboard)/reports/page.tsx` — placeholder "Reports"
- Create `app/(dashboard)/settings/page.tsx` — placeholder "Settings"

#### 2.3 — Zustand Store
- Create `lib/store/app-store.ts`:
  - State: `tasks`, `statuses`, `clients`, `search`, `page`
  - UI state: `picker`, `timePop`, `modal`, `toast`
  - Actions: `setTasks`, `setStatuses`, `setClients`, `setSearch`
  - Note: mutations happen via server actions, store is the client cache
- Create `types/app.types.ts`:
  - `Task`, `Subtask`, `Status`, `Client`, `TimeEntry` interfaces

#### 2.4 — Utilities
- Create `lib/utils.ts`: `fmt(minutes)`, `fmtDate(date)`, `cn(...classes)`
- Create `lib/recurrence.ts`: `calcNextDue(date, rec)`, `recurrenceLabel(rec)`
- Create `components/ui/Icons.tsx`: all SVG icons as named exports

### Success Criteria
- [ ] Dark sidebar renders with all 3 nav icons + settings + logout
- [ ] Active page highlights in sidebar
- [ ] Header shows correct title and badge per page
- [ ] Clicking nav items navigates to correct routes
- [ ] Logout button signs out and redirects to `/login`
- [ ] TypeScript compiles without errors

---

## Phase 3 — Settings Page & Task List Foundation

**Duration:** 2 days
**Goal:** Status and client CRUD in settings. Task list renders from Supabase with status groups.
**Depends on:** Phase 2

### Steps

#### 3.1 — Settings: Status CRUD
- Create `lib/api/statuses.ts` server actions: `getStatuses`, `createStatus`, `updateStatus`, `deleteStatus`, `reorderStatuses`
- Create `components/settings/StatusSettings.tsx`:
  - List statuses with color dot, name, is_closed badge
  - Add new status: color picker + name input + "Add" button
  - Delete status with confirmation (only if no tasks reference it)
  - Inline name edit on click

#### 3.2 — Settings: Client CRUD
- Create `lib/api/clients.ts` server actions: `getClients`, `createClient`, `updateClient`, `deleteClient`
- Create `components/settings/ClientSettings.tsx`:
  - List clients with color, name, prepaid balance
  - Add new client: color + name + prepaid hours input
  - Delete client confirmation

#### 3.3 — Task List: Server Data Loading
- Create `lib/api/tasks.ts` server actions: `getTasks`, `createTask`, `updateTask`, `deleteTask`, `changeTaskStatus`, `reorderTasks`
- Update `app/(dashboard)/tasks/page.tsx`:
  - Server component: load tasks, statuses, clients
  - Pass to `TaskListClient` (client component)
- Create `components/tasks/TaskListClient.tsx`:
  - 'use client' — receives initial data, populates Zustand store
  - Renders `StatusGroup` for each status

#### 3.4 — StatusGroup + TaskRow
- CSS Grid column template: `minmax(0, 1fr) 96px 30px 78px 78px 86px`
- Create `components/tasks/StatusGroup.tsx`:
  - Header: chevron + colored status badge + task count + total time
  - Collapsible (click header to toggle)
  - Column headers row (Name, Due date, [priority], Time, Client, Notes)
  - "Add Task" button at bottom
- Create `components/tasks/TaskRow.tsx`:
  - Status dot (click → StatusPicker)
  - Expand/collapse button if has subtasks
  - Title (click → TaskModal edit)
  - Due date (red if past due, "Today"/"Tomorrow" for near dates)
  - Priority color square
  - Time display (click → TimePopup)
  - Client badge
  - Quick notes inline input
  - Add subtask button (+) on hover
  - Drag handle on hover

#### 3.5 — StatusPicker Popup
- Create `components/tasks/StatusPicker.tsx`:
  - Fixed positioned, z-index 300
  - List of all statuses with color dots
  - Check mark on current status
  - Click outside to close

### Success Criteria
- [ ] Settings page shows 2 tabs: Statuses and Clients
- [ ] Can add/delete statuses and clients; changes persist in Supabase
- [ ] Task list loads tasks from Supabase grouped by status
- [ ] Status groups are collapsible
- [ ] Each task row shows all 6 columns with correct data
- [ ] Clicking status dot opens StatusPicker; changing status updates instantly
- [ ] Past-due dates show in red
- [ ] "Today" / "Tomorrow" labels display for near dates
- [ ] TypeScript compiles without errors

---

## Phase 4 — Task Modal (Create + Edit + Delete)

**Duration:** 1–2 days
**Goal:** Full task create/edit modal with all fields including recurrence.
**Depends on:** Phase 3

### Steps

#### 4.1 — Task Modal UI
- Create `components/tasks/TaskModal.tsx`:
  - Overlay with backdrop blur
  - Header: "New Task" / "Edit Task" + delete icon (edit only) + close
  - Fields: Title (autofocus), Status (hidden for subtasks), Client, Due Date, Priority
  - Quick Notes text input
  - Description textarea (Tiptap comes in Phase 8)
  - Footer: Cancel + Create/Save buttons
  - Keyboard: Esc to close, Enter in title to save
- Subtask variant: header shows "New Subtask — Parent: [title]"

#### 4.2 — Recurrence Section (in modal)
- Only shown for non-subtask tasks
- Recurrence type select: None / Weekly / Monthly / Every X days / Specific weekdays
- Conditional UI:
  - Weekly/Monthly: "Every [N] week(s)/month(s)" input
  - Every X days: "Every [N] days" input
  - Specific weekdays: 7-button weekday picker (Mon–Sun, cyan when selected)
- Info line: "When marked as done, a new task is created with the next due date"

#### 4.3 — Delete Confirmation
- Create `components/ui/ConfirmDialog.tsx`:
  - Modal: "Delete task?" warning + note about subtasks
  - Cancel + Delete buttons
  - Destructive button style (red)

#### 4.4 — New Task Button + Add Task from Status
- "New Task" header button → modal with no default status (user picks)
- "Add Task" at bottom of status group → modal pre-filled with that status
- Add Subtask (+) button → modal with parent context

### Success Criteria
- [ ] New Task button opens modal; filling title and saving creates task in Supabase
- [ ] Clicking a task title opens modal pre-filled with all existing data
- [ ] All fields (title, status, client, due date, priority, notes) save correctly
- [ ] Recurrence section shows correct sub-UI for each type
- [ ] Weekday picker toggles days; selected days display in cyan
- [ ] Delete icon opens confirmation dialog; confirming deletes task from Supabase
- [ ] Esc closes modal without saving
- [ ] TypeScript compiles without errors

---

## Phase 5 — Subtasks

**Duration:** 1 day
**Goal:** Subtasks display under parent, expand/collapse, add subtask flow.
**Depends on:** Phase 4

### Steps

#### 5.1 — Subtask Display
- `getTasks()` returns both parent and child tasks in one query
- Build `subtasksMap: Record<string, Task[]>` client-side
- In `StatusGroup`: after each parent task row, if expanded, render subtask rows
- Subtask rows: indented 50px, no expand button, no add-subtask button
- Subtask rows have same columns; status dot reflects parent group's status color

#### 5.2 — Expand/Collapse
- Per-task `expanded` state in `StatusGroup` (or Zustand)
- Chevron on parent row only if `subtasksMap[task.id]?.length > 0`
- Expand shows subtask rows below parent
- Expand state persists within session (reset on page reload is acceptable)

#### 5.3 — Add Subtask
- `+` button on parent task row (visible on hover) triggers modal
- Modal receives `isSubtask=true`, `parentId`, `parentTitle`
- Status field hidden; subtask inherits parent's status
- `createSubtask()` server action: sets `parent_id`, `status_id = parent.status_id`

### Success Criteria
- [ ] Parent tasks with subtasks show expand chevron
- [ ] Expanding shows subtask rows indented and in correct order
- [ ] Clicking + on a parent opens "New Subtask" modal with parent name shown
- [ ] Created subtask appears immediately under parent when expanded
- [ ] Subtask rows display all columns (time shows subtask's own tracked time)
- [ ] Deleting a parent also removes its subtasks (CASCADE)

---

## Phase 6 — Time Tracking + Prepaid

**Duration:** 1–2 days
**Goal:** Time entry popup, tracked time display, client prepaid deduction, Clients page.
**Depends on:** Phase 5

### Steps

#### 6.1 — Time Entry Popup
- Create `components/tasks/TimePopup.tsx`:
  - Hours + Minutes + Date inputs
  - Description field
  - "Save Time Entry" button
  - Click outside to close; Esc to close
  - Auto-focus hours input on open
- `addTimeEntry()` server action: insert → trigger fires → task + client update
- On save: optimistic update to task's `total_tracked_minutes` in Zustand store

#### 6.2 — Time Display in Task Row
- Time column: `fmt(total_tracked_minutes)` — "—" if 0, "1h 30m" format
- Clicking opens TimePopup for that task

#### 6.3 — Time Entries in Task Modal
- In TaskModal, add "Time Entries" section below description
- `getTimeEntries(taskId)` — load when modal opens (edit mode only)
- List entries: date, description, duration
- Delete button per entry → `deleteTimeEntry(id)` → recalculates total

#### 6.4 — Client Prepaid Deduction
- Trigger `trg_prepaid_deduct` handles this automatically on INSERT
- `markOveragePaid(clientId)` server action → set remaining = 0 if negative

#### 6.5 — Clients Page
- Update `app/(dashboard)/clients/page.tsx` with server data loading
- Create `components/clients/ClientCard.tsx`:
  - Client name, color, task count, total tracked time
  - Prepaid section (only if prepaid_total > 0):
    - "Xh Ym / Xh Ym" display
    - Progress bar (cyan → amber if >80% → red if negative)
    - "Mark paid" button (only if remaining < 0)
  - Task list (first 5 + "+N more")
- Create `components/clients/PrepaidMeter.tsx`: reusable meter bar

### Success Criteria
- [ ] Clicking time in task row opens TimePopup
- [ ] Adding time updates task total immediately (optimistic) and persists
- [ ] Time entries list shows in task modal edit view
- [ ] Deleting a time entry recalculates task total
- [ ] Client prepaid balance decreases correctly when time is logged
- [ ] Negative balance shows red; Mark paid button resets to 0
- [ ] Clients page shows all clients with cards and prepaid meters

---

## Phase 7 — Recurring Tasks

**Duration:** 1–2 days
**Goal:** Full recurrence engine: clone on status close, next-due calculation, toast, recurrence badge.
**Depends on:** Phase 6

### Steps

#### 7.1 — changeTaskStatus with Clone Logic
- Update `changeTaskStatus()` server action:
  - If `newStatus.is_closed && task.recurrence_type && !task.parent_id`:
    1. `calcNextDue(task.due_date, task.recurrence)` → nextDue
    2. Find first non-closed status (first by sort_order where is_closed = false)
    3. Insert new task (copy all fields, reset: time=0, notes='', status=open, due=nextDue)
    4. Clone subtasks: copy title/description/priority, parent_id=newTask.id, time=0
    5. Return `{ newTask, message: "Recurring task created → due [date]" }`
  - Server action returns toast data to client

#### 7.2 — calcNextDue Implementation
- `weekly`: add 7 × interval days
- `monthly`: add interval months (same day of month)
- `custom_days`: add recurrence_days days
- `custom_weekdays`: find next selected weekday strictly after current due_date

#### 7.3 — RecurringToast
- Create `components/ui/Toast.tsx` (reusable for all toasts)
- Show animated toast from bottom: "🔁 Recurring task created → due [date]"
- Auto-dismiss after 3.5s; X to close

#### 7.4 — Recurrence Badge in Task Row
- `recurrenceLabel(task)` → compact string: "Weekly", "Monthly", "Mon, Fri", "Every 14d"
- Show as small cyan badge next to title: `<RepeatIcon /> [label]`
- Only shown if task has recurrence

### Success Criteria
- [ ] Moving a recurring task to a closed status creates a new task in OPEN
- [ ] New task has correct next due date for all 4 recurrence types
- [ ] `custom_weekdays` cycles correctly: Mon → Fri → Mon → ...
- [ ] New task's subtasks are cloned with 0 time
- [ ] Toast appears and auto-dismisses after 3.5s
- [ ] Non-recurring tasks show no badge; recurring tasks show compact label
- [ ] Original task remains in closed status

---

## Phase 8 — Drag & Drop + Ordering

**Duration:** 1 day
**Goal:** Drag tasks within a status group to reorder. Sort order persists to Supabase.
**Depends on:** Phase 7

### Steps

#### 8.1 — @dnd-kit Setup
- Install: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- Wrap `TaskListClient` in `DndContext` + `SortableContext` per status group
- Use `useSortable` hook in `TaskRow`

#### 8.2 — Drag Interaction
- Drag handle visible on hover (grip dots icon)
- Drag only within same status group (not across groups)
- Visual feedback: dragged item shows as semi-transparent placeholder
- On drop: optimistic reorder in Zustand store
- Persist: call `reorderTasks(statusId, orderedIds)` server action

#### 8.3 — reorderTasks Server Action
- Accepts array of task IDs in new order
- Batch update: `UPDATE tasks SET sort_order = idx WHERE id = taskId`
- Use a Supabase RPC or iterate (acceptable for small task counts)

### Success Criteria
- [ ] Tasks can be dragged within a status group
- [ ] Drag handle appears on hover, cursor changes to grab
- [ ] Dropped position persists after page reload
- [ ] Dragging does not trigger click handlers (no modal opens)
- [ ] Drag only works within same status group

---

## Phase 9 — Rich Editor + Reports + PDF

**Duration:** 2 days
**Goal:** Tiptap in task modal. Reports page with date filter, client filter, and PDF export.
**Depends on:** Phase 8

### Steps

#### 9.1 — Tiptap Rich Editor
- Install: `npm install @tiptap/react @tiptap/starter-kit`
- Replace description `<textarea>` in `TaskModal` with Tiptap editor
- Store as Tiptap JSON in `tasks.description` (JSONB column)
- Basic toolbar: Bold, Italic, Bullet list, Heading 2
- Render Tiptap JSON in read-only mode (for future task detail view)

#### 9.2 — Reports Page
- Create `lib/api/reports.ts` server action `getReport(startDate, endDate, clientId?)`:
  - Query time_entries joined with tasks and clients for date range
  - Return: by client → by task → list of entries with totals
- Update `app/(dashboard)/reports/page.tsx`:
  - Date range picker: Month selector (default: current month)
  - Client filter dropdown (All / specific client)
  - Summary table: Client → Tasks → Time
  - Total row at bottom
  - Prepaid balance per client in report

#### 9.3 — PDF Export
- Install: `npm install @react-pdf/renderer`
- Create `components/reports/ReportPDF.tsx`:
  - PDF Document with report data
  - Header: "Dev Task — Time Report [Month Year]"
  - Client sections with task breakdown
  - Prepaid balance per client
  - Total row
- Export button: generate PDF blob → trigger download
- Note: `@react-pdf/renderer` must be used in a client component or API route

### Success Criteria
- [ ] Tiptap editor renders in task modal with basic formatting options
- [ ] Description saves as JSON and reloads correctly on reopen
- [ ] Reports page shows correct time totals by client for selected month
- [ ] Client filter shows only selected client's data
- [ ] PDF export downloads a correctly formatted PDF
- [ ] PDF matches the on-screen report data

---

## Phase 10 — Polish + Deploy

**Duration:** 2 days
**Goal:** Loading states, keyboard shortcuts, empty states, error handling, production deploy.
**Depends on:** Phase 9

### Steps

#### 10.1 — Loading States
- Skeleton loader for task list (while initial data loads)
- Spinner on modal save/delete buttons
- Optimistic updates for status changes and quick notes (already partial from earlier)

#### 10.2 — Keyboard Shortcuts
- `Esc`: close any open modal/popup
- `Ctrl+N` / `Cmd+N`: open New Task modal
- `Enter` in task title field: save task
- Document shortcuts in a `useKeyboard` hook

#### 10.3 — Empty States
- Empty status group: "No tasks — Add Task" link
- Empty client list in reports: "No time logged for this period"
- Empty task search: "No tasks match '[search]'"

#### 10.4 — Error Handling
- Server action errors: catch and return `{ error: string }`
- Client: show error toast for failed operations
- Login error: "Invalid email or password" message
- Network error: "Something went wrong, please try again"

#### 10.5 — Production Deploy
- Create Supabase production project (separate from dev)
- Run `001_initial.sql` migration on prod
- Configure Vercel project:
  - Set env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- Deploy to Vercel
- Add production URL to Supabase Auth allowed URLs
- Create initial user via Supabase dashboard (no register page)
- Smoke test all features on production

### Success Criteria
- [ ] Task list shows skeleton while loading
- [ ] Pressing Esc closes modals and popups
- [ ] Pressing Ctrl/Cmd+N opens New Task modal
- [ ] Empty status groups show a friendly "Add Task" prompt
- [ ] Failed server actions show error toast, not console errors
- [ ] App is live on Vercel with production Supabase
- [ ] Login works in production with manually created user
- [ ] All phases 1-9 features work in production
