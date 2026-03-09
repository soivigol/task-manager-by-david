'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Priority } from '@/types/app.types'

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

export async function changeTaskStatus(id: string, newStatusId: string) {
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

  // Recurrence logic will be added in Phase 7
  revalidatePath('/tasks')
  return { task: data, toastMessage: null }
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
