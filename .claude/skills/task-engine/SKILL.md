---
name: task-engine
description: >
  Dev Task recurring task engine, time tracking logic, and prepaid hours system.
  Use when implementing or modifying changeTaskStatus, calcNextDue, prepaid deduction,
  time entry handling, or anything related to recurring tasks, time tracking, or client billing.
---

# Dev Task — Task Engine Patterns

## Recurring Task: changeTaskStatus Server Action

When a task is moved to a status where `is_closed = true`:

```typescript
// lib/api/tasks.ts
export async function changeTaskStatus(taskId: string, newStatusId: string) {
  // ... get task and newStatus from DB

  // Update the task's status
  await supabase.from('tasks').update({ status_id: newStatusId }).eq('id', taskId)

  // Check if we need to create next recurrence
  if (newStatus.is_closed && task.recurrence_type && !task.parent_id) {
    const nextDue = calcNextDue(task.due_date, task)
    const openStatus = await getFirstOpenStatus(user.id)  // first where is_closed = false

    // Clone task
    const { data: newTask } = await supabase.from('tasks').insert({
      user_id: user.id,
      parent_id: null,
      status_id: openStatus.id,
      client_id: task.client_id,
      title: task.title,
      description: task.description,
      due_date: nextDue,
      priority: task.priority,
      quick_notes: '',
      sort_order: await getMaxSortOrder(user.id, openStatus.id) + 1,
      total_tracked_minutes: 0,
      recurrence_type: task.recurrence_type,
      recurrence_interval: task.recurrence_interval,
      recurrence_days: task.recurrence_days,
      recurrence_weekdays: task.recurrence_weekdays,
    }).select().single()

    // Clone subtasks
    const { data: subtasks } = await supabase
      .from('tasks').select('*').eq('parent_id', taskId)

    for (const [i, sub] of (subtasks ?? []).entries()) {
      await supabase.from('tasks').insert({
        ...sub,
        id: undefined,  // let DB generate
        parent_id: newTask.id,
        status_id: openStatus.id,
        total_tracked_minutes: 0,
        quick_notes: '',
        sort_order: i,
      })
    }

    return { toastMessage: `Recurring task created → due ${fmtDate(nextDue)}` }
  }

  return {}
}
```

## calcNextDue Algorithm

```typescript
// lib/recurrence.ts

// Weekday conversion: JS getDay() = 0(Sun)..6(Sat); App = 0(Mon)..6(Sun)
const jsToOur = (js: number) => (js + 6) % 7  // JS Sun(0) → Our(6)
const ourToJs = (our: number) => (our + 1) % 7

export function calcNextDue(
  dueDateStr: string | null,
  task: { recurrence_type: string | null; recurrence_interval: number; recurrence_days: number | null; recurrence_weekdays: number[] | null }
): string | null {
  if (!dueDateStr || !task.recurrence_type) return null
  const d = new Date(dueDateStr + 'T00:00:00')

  if (task.recurrence_type === 'weekly') {
    d.setDate(d.getDate() + 7 * (task.recurrence_interval || 1))
  }
  else if (task.recurrence_type === 'monthly') {
    d.setMonth(d.getMonth() + (task.recurrence_interval || 1))
  }
  else if (task.recurrence_type === 'custom_days') {
    d.setDate(d.getDate() + (task.recurrence_days || 7))
  }
  else if (task.recurrence_type === 'custom_weekdays' && task.recurrence_weekdays?.length) {
    const sorted = [...task.recurrence_weekdays].sort((a, b) => a - b)
    const currentOur = jsToOur(d.getDay())
    const next = sorted.find(w => w > currentOur)
    if (next !== undefined) {
      d.setDate(d.getDate() + (next - currentOur))
    } else {
      // Wrap: 7 - currentOur + sorted[0]
      d.setDate(d.getDate() + (7 - currentOur + sorted[0]))
    }
  }

  return d.toISOString().split('T')[0]
}
```

### Custom Weekdays Example

Task: weekdays=[0,4] (Mon=0, Fri=4), due_date=2026-02-09 (Monday)
- currentOur = jsToOur(getDay()) = jsToOur(1) = 0 (Monday)
- sorted = [0, 4]
- Find w > 0: found 4 (Friday)
- d.setDate(d.getDate() + (4 - 0)) = Feb 9 + 4 = Feb 13 (Friday) ✓

Next run:
- due_date=2026-02-13 (Friday), currentOur = jsToOur(5) = 4
- sorted = [0, 4], find w > 4: none
- Wrap: 7 - 4 + 0 = 3 days → Feb 13 + 3 = Feb 16 (Monday) ✓

## Prepaid Hours System

### How it works
1. User creates client with `prepaid_total_minutes` (e.g., 1200 = 20 hours)
2. `prepaid_remaining_minutes` starts equal to `prepaid_total_minutes`
3. When time entry inserted → `trg_prepaid_deduct` fires → remaining decreases
4. If remaining goes negative → "overage" state
5. User clicks "Mark paid" → `markOveragePaid()` → remaining = 0

### Key rules
- `prepaid_total_minutes` is NEVER changed by time tracking (it's the package size)
- `prepaid_remaining_minutes` CAN be negative (that's the design — allow overage)
- Deleting a time entry does NOT restore prepaid (only the tracked total trigger recalculates)
- "Mark paid" only works when remaining < 0 (don't allow resetting positive balance)

### PrepaidMeter display states
```
remaining > 0  and pct <= 80: cyan bar  (healthy)
remaining > 0  and pct >  80: amber bar (running low)
remaining <= 0:               red bar   + "Mark paid" button
```
`pct = Math.min(100, ((total - remaining) / total) * 100)`

## Time Format

```typescript
export function fmt(minutes: number | null | undefined): string {
  if (!minutes && minutes !== 0) return '—'
  if (minutes === 0) return '—'
  const neg = minutes < 0
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  let s = ''
  if (h > 0) s += h + 'h'
  if (m > 0) s += (s ? ' ' : '') + m + 'm'
  return neg ? '-' + s : s
}
```

## Date Format

```typescript
// fmtDate uses a "today" reference date — in production use new Date()
export function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr + 'T00:00:00')
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
// Past-due: diff < 0 && !status.is_closed → show in red
```
