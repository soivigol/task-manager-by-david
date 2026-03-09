# Dev Task — Technical Documentation

## Overview

Dev Task is a single-user task management and time-tracking app for a freelancer
managing multiple clients. It uses Next.js 14 App Router with Supabase as the
backend. All data operations are Next.js Server Actions. Authentication is
email/password via Supabase Auth. Users are added manually — there is no
registration page.

---

## Architecture Overview

```
Browser
  └── Next.js App (Vercel)
        ├── app/login/page.tsx           → Public
        ├── middleware.ts                → Auth guard (redirect if no session)
        └── app/(dashboard)/            → Protected routes
              ├── tasks/page.tsx         → Server Component: load data
              │     └── TaskListClient  → Client Component: Zustand + DnD
              ├── clients/page.tsx       → Server Component
              ├── reports/page.tsx       → Server Component
              └── settings/page.tsx     → Server Component

lib/
  ├── supabase/client.ts                → Browser Supabase (anon key)
  ├── supabase/server.ts                → Server Supabase (cookies)
  ├── api/*.ts                          → Server Actions (all data mutations)
  └── store/app-store.ts                → Zustand (client-side cache)

Supabase Cloud
  ├── PostgreSQL (profiles, statuses, clients, tasks, time_entries)
  ├── Auth (email/password)
  └── RLS (every table: user_id = auth.uid())
```

---

## Database Reference

### `profiles`

Created automatically when a user signs up via Supabase Auth trigger.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Matches auth.users.id |
| full_name | text | Set by admin when creating user |
| avatar_url | text | Optional |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `statuses`

User-defined workflow stages. `is_closed = true` means moving a recurring task
to this status will trigger creation of the next occurrence.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | |
| user_id | uuid | Owner |
| name | text | Stored UPPERCASE e.g. "OPEN", "TODAY", "DONE" |
| color | text | Hex string e.g. "#22c55e" |
| sort_order | integer | Display order (ascending) |
| is_closed | boolean | true = task is "done" (triggers recurrence) |

**Default statuses (seed on first login):**
- DONE (green, is_closed=true, sort_order=0)
- IN REVIEW (orange, sort_order=1)
- TODAY (orange, sort_order=2)
- OPEN (cyan, sort_order=3)

### `clients`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | |
| user_id | uuid | Owner |
| name | text | e.g. "Banks", "Chavetas" |
| color | text | Hex, used for client badge |
| prepaid_total_minutes | integer | 0 = no prepaid plan |
| prepaid_remaining_minutes | integer | Decremented by `trg_prepaid_deduct`. Can go negative. |

**Prepaid logic:**
- Only tracks prepaid if `prepaid_total_minutes > 0`
- When time is logged: `remaining -= logged_minutes`
- Negative balance = overage. User clicks "Mark paid" to reset remaining to 0.
- `prepaid_total_minutes` is NOT changed by logging or paying — it's the package size.

### `tasks`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | |
| user_id | uuid | Owner |
| parent_id | uuid | null = top-level task; set = subtask |
| status_id | uuid | FK → statuses |
| client_id | uuid | FK → clients (nullable) |
| title | text | |
| description | jsonb | Tiptap JSON or null |
| due_date | date | |
| priority | text | 'urgent' \| 'high' \| 'normal' \| 'low' |
| quick_notes | text | Inline editable short note |
| sort_order | integer | Position within (user_id, status_id) group |
| total_tracked_minutes | integer | Auto-maintained by trigger |
| recurrence_type | text | 'weekly' \| 'monthly' \| 'custom_days' \| 'custom_weekdays' \| null |
| recurrence_interval | integer | For weekly/monthly: every N |
| recurrence_days | integer | For custom_days: every N days |
| recurrence_weekdays | integer[] | For custom_weekdays: [0..6] Mon=0..Sun=6 |

**Subtask constraint:** `parent_id` cannot point to a task that itself has a
`parent_id`. Maximum depth = 1 level.

**Priority colors:**
- urgent: #ef4444 (red)
- high: #f97316 (orange)
- normal: #3b82f6 (blue)
- low: #9ca3af (gray)

### `time_entries`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | |
| task_id | uuid | FK → tasks |
| user_id | uuid | Owner |
| minutes | integer | Duration logged |
| description | text | What was done (optional) |
| tracked_date | date | Default: today |

### Database Triggers

**`trg_time_entry_change`** (AFTER INSERT/UPDATE/DELETE on time_entries):
- Recalculates `tasks.total_tracked_minutes` as SUM of all entries for that task.

**`trg_prepaid_deduct`** (AFTER INSERT on time_entries):
- If the task has a client and client has `prepaid_total_minutes > 0`:
  `UPDATE clients SET prepaid_remaining_minutes = prepaid_remaining_minutes - NEW.minutes`
- Does NOT fire on DELETE (tracked time removal does NOT restore prepaid).

---

## Server Actions Reference

All server actions are in `lib/api/`. They use `createServerClient` from
`lib/supabase/server.ts` and require an active session.

### `lib/api/tasks.ts`

```typescript
getTasks(): Promise<Task[]>
// Returns all tasks for current user, ordered by sort_order
// Includes both parent tasks and subtasks in one array

createTask(data: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'total_tracked_minutes'>): Promise<Task>

updateTask(id: string, data: Partial<Task>): Promise<Task>

deleteTask(id: string): Promise<void>
// Cascades to subtasks and time_entries

changeTaskStatus(id: string, newStatusId: string): Promise<{ toastMessage?: string }>
// If newStatus.is_closed && task.recurrence_type && !task.parent_id:
//   - Creates next recurring task
//   - Returns toastMessage for client display

reorderTasks(statusId: string, orderedIds: string[]): Promise<void>
// Batch updates sort_order for tasks in a status group
```

### `lib/api/time-entries.ts`

```typescript
addTimeEntry(taskId: string, minutes: number, description: string, date: string): Promise<TimeEntry>
getTimeEntries(taskId: string): Promise<TimeEntry[]>
deleteTimeEntry(id: string): Promise<void>
```

### `lib/api/statuses.ts`

```typescript
getStatuses(): Promise<Status[]>
createStatus(data: { name: string; color: string; is_closed: boolean }): Promise<Status>
updateStatus(id: string, data: Partial<Status>): Promise<Status>
deleteStatus(id: string): Promise<{ error?: string }>
// Returns error if tasks reference this status
reorderStatuses(orderedIds: string[]): Promise<void>
```

### `lib/api/clients.ts`

```typescript
getClients(): Promise<Client[]>
createClient(data: { name: string; color: string; prepaid_total_minutes: number }): Promise<Client>
updateClient(id: string, data: Partial<Client>): Promise<Client>
deleteClient(id: string): Promise<void>
// tasks.client_id → SET NULL via FK cascade
markOveragePaid(id: string): Promise<void>
// Sets prepaid_remaining_minutes = 0 WHERE id = id AND prepaid_remaining_minutes < 0
```

### `lib/api/reports.ts`

```typescript
getReport(startDate: string, endDate: string, clientId?: string): Promise<ReportData>
// Returns: { clients: [{ client, tasks: [{ task, entries, totalMinutes }], totalMinutes }], grandTotal }
```

---

## Recurrence Engine

### `lib/recurrence.ts`

```typescript
calcNextDue(dueDateStr: string, task: Pick<Task, 'recurrence_type' | 'recurrence_interval' | 'recurrence_days' | 'recurrence_weekdays'>): string | null

recurrenceLabel(task: Pick<Task, 'recurrence_type' | 'recurrence_interval' | 'recurrence_days' | 'recurrence_weekdays'>): string | null
// Returns: "Weekly", "Monthly", "Every 14d", "Mon, Fri", etc.
```

### Weekday Conversion

JS `Date.getDay()` returns 0=Sun, 1=Mon...6=Sat.
App uses 0=Mon, 1=Tue...6=Sun.
Conversion: `ourDay = (jsDay + 6) % 7`

---

## Zustand Store (`lib/store/app-store.ts`)

```typescript
interface AppStore {
  // Data (mirrors Supabase, updated after server actions)
  tasks: Task[]
  statuses: Status[]
  clients: Client[]

  // UI state
  search: string
  toast: string | null
  picker: { taskId: string; currentStatusId: string; x: number; y: number } | null
  timePop: Task | null
  modal: ModalState | null

  // Actions
  setTasks: (tasks: Task[]) => void
  setStatuses: (statuses: Status[]) => void
  setClients: (clients: Client[]) => void
  setSearch: (s: string) => void
  setToast: (msg: string | null) => void
  setPicker: (p: PickerState | null) => void
  setTimePop: (t: Task | null) => void
  setModal: (m: ModalState | null) => void

  // Optimistic updates (applied immediately, then synced)
  updateTaskOptimistic: (id: string, data: Partial<Task>) => void
  addTaskOptimistic: (task: Task) => void
  removeTaskOptimistic: (id: string) => void
}
```

---

## Auth Flow

- **Login:** `app/login/page.tsx` — `supabase.auth.signInWithPassword()`
- **Session:** Managed by `@supabase/ssr` — stored in cookies, refreshed in middleware
- **Middleware (`middleware.ts`):**
  - Runs on every request except static assets
  - Calls `updateSession()` to refresh cookie
  - If no session: redirect to `/login`
  - If session + on `/login`: redirect to `/tasks`
- **Logout:** `supabase.auth.signOut()` → redirect to `/login`
- **No registration:** Users created in Supabase dashboard → Authentication → Users → Add User

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
# Server-only (never expose to client):
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

---

## CSS Grid Layout

Task rows use a consistent 6-column CSS Grid:

```
minmax(0, 1fr)  96px  30px  78px  78px  86px
│               │     │     │     │     └── Quick Notes
│               │     │     │     └── Client badge
│               │     │     └── Time tracked
│               │     └── Priority dot
│               └── Due date
└── Task name (with status dot, expand, recurrence badge, add subtask)
```

Applied to both `StatusGroup` header row and each `TaskRow` via the same
`GRID` template constant.

---

## Security Model

- **RLS on every table** — `user_id = auth.uid()` enforced at database level
- **Service role key** — server-side only, never in client bundles
- **Server Actions** — all mutations run server-side; client never calls Supabase directly for writes
- **No register page** — users created by admin via Supabase dashboard only
- **Session cookies** — `@supabase/ssr` handles secure, HTTP-only cookies
- **Input validation** — title required, minutes > 0, valid UUIDs for foreign keys
