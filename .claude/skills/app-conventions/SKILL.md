---
name: app-conventions
description: >
  Dev Task project conventions: data model, store shape, naming patterns, and
  component patterns. Use when adding new components, server actions, or pages.
  Reference when unsure about where to put code, how to name things, or how
  data flows through the app.
---

# Dev Task — App Conventions

## Data Flow Pattern

```
Supabase DB
  ↓ (server component loads on page visit)
Server Component (app/(dashboard)/[page]/page.tsx)
  ↓ props
Client Component (components/tasks/TaskListClient.tsx)
  ↓ initializes
Zustand Store (lib/store/app-store.ts)
  ↕ reads/writes
UI Components (TaskRow, TaskModal, etc.)
  ↓ user action
Server Action (lib/api/tasks.ts)
  ↓ updates DB
  ↓ returns result
Client updates Zustand store optimistically
```

## File Naming

| What | Pattern | Example |
|------|---------|---------|
| Page | `app/(dashboard)/[route]/page.tsx` | `tasks/page.tsx` |
| Layout | `app/(dashboard)/layout.tsx` | |
| Client component | `PascalCase.tsx` | `TaskRow.tsx` |
| Server action file | `camelCase.ts` in `lib/api/` | `tasks.ts` |
| Utility function | `camelCase` export | `calcNextDue()` |
| Type interface | `PascalCase` | `Task`, `Client`, `Status` |

## Task Object Shape

```typescript
interface Task {
  id: string
  user_id: string
  parent_id: string | null      // null = top-level task
  status_id: string
  client_id: string | null
  title: string
  description: object | null    // Tiptap JSON
  due_date: string | null       // "YYYY-MM-DD"
  priority: 'urgent' | 'high' | 'normal' | 'low'
  quick_notes: string
  sort_order: number
  total_tracked_minutes: number  // Read-only — maintained by DB trigger
  recurrence_type: 'weekly' | 'monthly' | 'custom_days' | 'custom_weekdays' | null
  recurrence_interval: number    // 1 = every 1 week/month
  recurrence_days: number | null
  recurrence_weekdays: number[] | null  // [0-6], Mon=0 Sun=6
  created_at: string
  updated_at: string
}
```

## CSS Grid — Task Row

Always use this exact template for task rows and status group headers:

```typescript
const GRID = 'minmax(0, 1fr) 96px 30px 78px 78px 86px'
// Col 1: Task name (title, status dot, controls)
// Col 2: Due date (right-aligned, 96px)
// Col 3: Priority dot (centered, 30px)
// Col 4: Time tracked (centered, 78px)
// Col 5: Client badge (centered, 78px)
// Col 6: Quick notes input (right-aligned, 86px)
```

## Subtask Indentation

Subtask rows indent by `pl-[50px]` in the name column (Col 1).
Parent rows use `pl-[2px]` in Col 1.

## Priority Colors

```typescript
const PRIORITY_MAP = {
  urgent: '#ef4444',
  high:   '#f97316',
  normal: '#3b82f6',
  low:    '#9ca3af',
}
```

## Time Formatting

```typescript
// fmt(minutes: number | null): string
fmt(0)    // "—"
fmt(90)   // "1h 30m"
fmt(30)   // "30m"
fmt(60)   // "1h"
fmt(-30)  // "-30m"  (negative = overage)
```

## Creating a Server Action

```typescript
// lib/api/example.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'

export async function doSomething(param: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)

  if (error) throw error
  return data
}
```

## Creating a New Page

```typescript
// app/(dashboard)/example/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExampleClient from '@/components/example/ExampleClient'

export default async function ExamplePage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase.from('table').select('*').eq('user_id', user.id)

  return <ExampleClient initialData={data ?? []} />
}
```

## Toast Notifications

Use the Zustand store to show toasts:

```typescript
const { setToast } = useAppStore()
setToast('Task deleted successfully')
// Auto-clears after 3.5s
```

## Recurrence Shorthand (Task List Badges)

| recurrence_type | Display |
|----------------|---------|
| weekly, interval=1 | "Weekly" |
| weekly, interval=2 | "Every 2w" |
| monthly, interval=1 | "Monthly" |
| monthly, interval=3 | "Every 3mo" |
| custom_days, days=14 | "Every 14d" |
| custom_weekdays, [0,4] | "Mon, Fri" |
