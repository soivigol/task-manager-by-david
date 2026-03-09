'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Priority, RecurrenceType, Task } from '@/types/app.types'
import { calcNextDue } from '@/lib/recurrence'

export async function getTasks() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createTask(formData: {
  title: string
  status_id: string
  client_id?: string | null
  due_date?: string | null
  priority?: Priority
  quick_notes?: string | null
  description?: Record<string, unknown> | null
  parent_id?: string | null
  recurrence_type?: RecurrenceType | null
  recurrence_interval?: number | null
  recurrence_days?: number | null
  recurrence_weekdays?: number[] | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Get max sort_order within the status group
  const { data: existing } = await supabase
    .from('tasks')
    .select('sort_order')
    .eq('user_id', user.id)
    .eq('status_id', formData.status_id)
    .is('parent_id', formData.parent_id ? null : null)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title: formData.title,
      status_id: formData.status_id,
      client_id: formData.client_id ?? null,
      due_date: formData.due_date || null,
      priority: formData.priority ?? 'normal',
      quick_notes: formData.quick_notes ?? null,
      description: formData.description ?? null,
      parent_id: formData.parent_id ?? null,
      sort_order: nextOrder,
      recurrence_type: formData.recurrence_type ?? null,
      recurrence_interval: formData.recurrence_interval ?? null,
      recurrence_days: formData.recurrence_days ?? null,
      recurrence_weekdays: formData.recurrence_weekdays ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/tasks')
  return data
}

export async function updateTask(
  id: string,
  updates: {
    title?: string
    status_id?: string
    client_id?: string | null
    due_date?: string | null
    priority?: Priority
    quick_notes?: string | null
    description?: Record<string, unknown> | null
    recurrence_type?: RecurrenceType | null
    recurrence_interval?: number | null
    recurrence_days?: number | null
    recurrence_weekdays?: number[] | null
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/tasks')
  return data
}

export async function deleteTask(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/tasks')
}

export async function changeTaskStatus(id: string, newStatusId: string): Promise<{ task: Task; toastMessage: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Get max sort_order in the new status group
  const { data: existing } = await supabase
    .from('tasks')
    .select('sort_order')
    .eq('user_id', user.id)
    .eq('status_id', newStatusId)
    .is('parent_id', null)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('tasks')
    .update({ status_id: newStatusId, sort_order: nextOrder })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  const task = data as Task
  let toastMessage: string | null = null

  // Recurrence clone logic: when moving a recurring parent task to a closed status
  const { data: newStatus } = await supabase
    .from('statuses')
    .select('is_closed')
    .eq('id', newStatusId)
    .single()

  if (
    newStatus?.is_closed &&
    task.recurrence_type &&
    !task.parent_id
  ) {
    const nextDue = calcNextDue(task.due_date, {
      recurrence_type: task.recurrence_type,
      recurrence_interval: task.recurrence_interval,
      recurrence_days: task.recurrence_days,
      recurrence_weekdays: task.recurrence_weekdays,
    })

    // If no due_date and recurrence can't compute next, use today
    const effectiveDue = nextDue ?? new Date().toISOString().split('T')[0]

    // Find first non-closed status by sort_order
    const { data: openStatus } = await supabase
      .from('statuses')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_closed', false)
      .order('sort_order', { ascending: true })
      .limit(1)
      .single()

    if (openStatus) {
      // Get max sort_order in the open status group for the new task
      const { data: openExisting } = await supabase
        .from('tasks')
        .select('sort_order')
        .eq('user_id', user.id)
        .eq('status_id', openStatus.id)
        .is('parent_id', null)
        .order('sort_order', { ascending: false })
        .limit(1)

      const newSortOrder = (openExisting?.[0]?.sort_order ?? -1) + 1

      // Insert cloned task
      const { data: clonedTask, error: cloneError } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: task.title,
          status_id: openStatus.id,
          client_id: task.client_id,
          due_date: effectiveDue,
          priority: task.priority,
          description: task.description,
          parent_id: null,
          sort_order: newSortOrder,
          total_tracked_minutes: 0,
          quick_notes: null,
          recurrence_type: task.recurrence_type,
          recurrence_interval: task.recurrence_interval,
          recurrence_days: task.recurrence_days,
          recurrence_weekdays: task.recurrence_weekdays,
        })
        .select()
        .single()

      if (cloneError) throw new Error(cloneError.message)

      // Clone subtasks from the original task
      const { data: subtasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('parent_id', id)
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true })

      if (subtasks && subtasks.length > 0) {
        const clonedSubtasks = subtasks.map((sub, idx) => ({
          user_id: user.id,
          title: sub.title,
          status_id: openStatus.id,
          client_id: sub.client_id,
          due_date: sub.due_date,
          priority: sub.priority as Priority,
          description: sub.description,
          parent_id: clonedTask.id,
          sort_order: idx,
          total_tracked_minutes: 0,
          quick_notes: null,
          recurrence_type: null,
          recurrence_interval: null,
          recurrence_days: null,
          recurrence_weekdays: null,
        }))

        const { error: subError } = await supabase
          .from('tasks')
          .insert(clonedSubtasks)

        if (subError) throw new Error(subError.message)
      }

      // Format the due date for the toast message
      const dueDate = new Date(effectiveDue + 'T00:00:00')
      const formatted = dueDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      })
      toastMessage = `Recurring task created → due ${formatted}`
    }
  }

  revalidatePath('/tasks')
  return { task, toastMessage }
}

export async function reorderTasks(statusId: string, orderedIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('tasks')
      .update({ sort_order: i })
      .eq('id', orderedIds[i])
      .eq('user_id', user.id)
      .eq('status_id', statusId)

    if (error) throw new Error(error.message)
  }

  revalidatePath('/tasks')
}
