# Dev Task — Development Plan v4

## 1. Decisions Made

| Question | Decision |
|---|---|
| Multi/Single user | **Single-user** — no teams/workspaces |
| Prepaid overage | **Allow negative**. "Mark as paid" resets to 0 |
| Multiple prepaid packages | **No** — one per client, indefinite validity |
| Priority column | **Visible** in list as color dot |
| Subtask status | **Inherits parent** group, no independent grouping |
| Reports | **Filterable by client** |
| Timer | **Manual only** |
| New task / subtask | Opens **modal** |
| Recurring tasks | **Yes** — weekly, monthly, every X days, or specific weekdays |
| Recurring clone status | **OPEN** by default |
| Recurring subtasks | **Cloned** with 0 time tracked |
| Recurring time tracked | **Resets to 0** |

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS |
| State | Zustand |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Rich Editor | Tiptap |
| PDF Export | @react-pdf/renderer |
| Deployment | Vercel |

---

## 3. Database Schema

### `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `statuses`
```sql
CREATE TABLE statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `clients`
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  prepaid_total_minutes INTEGER NOT NULL DEFAULT 0,
  prepaid_remaining_minutes INTEGER NOT NULL DEFAULT 0, -- can go negative
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `tasks`
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  status_id UUID NOT NULL REFERENCES statuses(id),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description JSONB,                       -- Tiptap JSON
  due_date DATE,
  priority TEXT CHECK (priority IN ('urgent','high','normal','low')) DEFAULT 'normal',
  quick_notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  total_tracked_minutes INTEGER DEFAULT 0,
  
  -- Recurrence
  recurrence_type TEXT CHECK (recurrence_type IN ('weekly','monthly','custom_days','custom_weekdays')),
  recurrence_interval INTEGER DEFAULT 1,   -- every X weeks/months
  recurrence_days INTEGER,                 -- for custom_days: every X days
  recurrence_weekdays INTEGER[],           -- for custom_weekdays: [0,2,4] = Mon,Wed,Fri
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT check_subtask_depth CHECK (
    parent_id IS NULL OR
    NOT EXISTS (SELECT 1 FROM tasks t WHERE t.id = parent_id AND t.parent_id IS NOT NULL)
  )
);

CREATE INDEX idx_tasks_user_status ON tasks(user_id, status_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_tasks_sort ON tasks(user_id, status_id, sort_order);
```

### `time_entries`
```sql
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  minutes INTEGER NOT NULL,
  description TEXT,
  tracked_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_time_entries_task ON time_entries(task_id);
CREATE INDEX idx_time_entries_date ON time_entries(user_id, tracked_date);
```

### Triggers
```sql
-- Update task.total_tracked_minutes
CREATE OR REPLACE FUNCTION update_task_tracked_minutes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tasks SET total_tracked_minutes = (
    SELECT COALESCE(SUM(minutes), 0) FROM time_entries
    WHERE task_id = COALESCE(NEW.task_id, OLD.task_id)
  ), updated_at = now()
  WHERE id = COALESCE(NEW.task_id, OLD.task_id);
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_time_entry_change
AFTER INSERT OR UPDATE OR DELETE ON time_entries
FOR EACH ROW EXECUTE FUNCTION update_task_tracked_minutes();

-- Deduct from client prepaid (allows negative)
CREATE OR REPLACE FUNCTION deduct_prepaid()
RETURNS TRIGGER AS $$
DECLARE v_client_id UUID;
BEGIN
  SELECT client_id INTO v_client_id FROM tasks WHERE id = NEW.task_id;
  IF v_client_id IS NOT NULL THEN
    UPDATE clients SET prepaid_remaining_minutes = prepaid_remaining_minutes - NEW.minutes
    WHERE id = v_client_id AND prepaid_total_minutes > 0;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prepaid_deduct
AFTER INSERT ON time_entries
FOR EACH ROW EXECUTE FUNCTION deduct_prepaid();
```

### RLS
```sql
CREATE POLICY "own_data" ON tasks FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
-- Same pattern for all tables
```

---

## 4. ER Diagram

```
profiles ─┬── statuses (1:N)
           ├── clients (1:N)
           ├── tasks (1:N)
           └── time_entries (1:N)

clients ──── tasks (1:N)
statuses ─── tasks (1:N)
tasks ───┬── tasks/subtasks (1:N, max 1 level)
         └── time_entries (1:N)
```

---

## 5. Recurring Tasks — Logic

### Recurrence Types:
| Type | Config | Example |
|---|---|---|
| `weekly` | interval: N | Every 2 weeks |
| `monthly` | interval: N | Every 1 month |
| `custom_days` | days: N | Every 14 days |
| `custom_weekdays` | weekdays: [0-6] | Mon=0, Tue=1 ... Sun=6 |

### Next due calculation:
```
weekly:          due_date + (7 × interval) days
monthly:         due_date + interval months
custom_days:     due_date + X days
custom_weekdays: find next selected weekday after current due_date
```

### Flow:
```
1. User creates "Monthly maintenance Banks" with recurrence: monthly, interval: 1
2. Due date: 2026-02-06
3. User completes task → changes status to DONE (is_closed = true)
4. System auto-creates NEW task:
   - Same title, client, priority, description, recurrence settings
   - Due date: 2026-03-06 (original + 1 month)
   - Status: OPEN (first non-closed status)
   - Time tracked: 0 (fresh)
   - Subtasks: cloned with 0 time
5. Original task stays in DONE for historical record
6. Toast notification confirms creation
```

### Weekday Example:
```
Task: "Weekly admin & bookkeeping", weekdays: [0, 4] (Mon, Fri)
Current due: Monday Feb 9
→ Mark as done
→ New task due: Friday Feb 13 (next selected weekday)
→ Mark as done again
→ New task due: Monday Feb 16
```

### Implementation:
- **Frontend**: Server action `changeTaskStatus` checks recurrence + is_closed
- **Backend**: Clone logic in server action (no cron needed)
- **Toast**: Animated notification confirming new task created

---

## 6. API Layer

| Module | Key Functions |
|---|---|
| `tasks.ts` | `getTasks()`, `createTask()`, `updateTask()`, `deleteTask()`, `changeStatus()` (handles recurrence clone), `reorderTasks()` |
| `subtasks.ts` | `getSubtasks()`, `createSubtask()` |
| `time-entries.ts` | `addTimeEntry()`, `getTimeEntries()`, `deleteTimeEntry()` |
| `statuses.ts` | CRUD + reorder |
| `clients.ts` | CRUD + `markOveragePaid()` |
| `reports.ts` | `getReport(type, dateRange, clientFilter?)` |

---

## 7. App Structure

```
/app
  layout.tsx → root layout
  page.tsx → redirect
  /login/page.tsx
  /dashboard
    layout.tsx → sidebar + header
    page.tsx → task list
  /clients/page.tsx
  /reports/page.tsx
  /settings/page.tsx

/components
  /tasks
    TaskList.tsx, TaskRow.tsx (CSS Grid)
    TaskModal.tsx → create + edit + recurrence + weekday picker
    TimePopup.tsx, StatusPicker.tsx
    RecurringToast.tsx
  /ui → SearchBar, RichEditor, Modal
  /clients → ClientCard, PrepaidMeter
  /reports → ReportGenerator, ReportPDF
```

---

## 8. Development Phases

### Phase 1 — Foundation (Week 1)
- [ ] Project setup: Next.js + Tailwind + Supabase
- [ ] DB migrations (all tables + triggers + RLS)
- [ ] Auth: login, middleware, session
- [ ] Layout: sidebar, header, routing

### Phase 2 — Core Task Management (Week 2)
- [ ] Settings: Status CRUD, Client CRUD
- [ ] Task list with CSS Grid alignment
- [ ] Create/Edit task via modal
- [ ] Status picker
- [ ] Priority color dot column
- [ ] Subtasks (1 level, expand/collapse)
- [ ] Add subtask button → modal
- [ ] Search bar

### Phase 3 — Time Tracking + Prepaid (Week 3)
- [ ] Time popup (hours + minutes + description + date)
- [ ] Display formatting (Xh Ym)
- [ ] Prepaid deduction (allow negative)
- [ ] "Mark as paid" on client cards

### Phase 4 — Recurring Tasks (Week 3-4)
- [ ] Recurrence fields in task modal (weekly/monthly/custom_days/custom_weekdays)
- [ ] Weekday picker UI
- [ ] Clone logic when status → done (is_closed)
- [ ] Next due date calculation (all 4 types)
- [ ] Subtask cloning
- [ ] Recurrence badge in task list
- [ ] Toast notification

### Phase 5 — DnD + Ordering (Week 4)
- [ ] @dnd-kit integration within status groups
- [ ] Persist sort_order

### Phase 6 — Rich Editor + Task Detail (Week 4-5)
- [ ] Tiptap in task modal
- [ ] Time entries list inside modal

### Phase 7 — Reports + PDF (Week 5-6)
- [ ] Report page with date range picker
- [ ] Client filter
- [ ] @react-pdf/renderer export

### Phase 8 — Polish + Deploy (Week 6)
- [ ] Loading states, optimistic updates
- [ ] Error handling, keyboard shortcuts
- [ ] Deploy: Vercel + Supabase prod
