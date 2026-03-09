'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TimeEntry } from '@/types/app.types'

export async function addTimeEntry(
  taskId: string,
  minutes: number,
  description: string | null,
  trackedDate: string
): Promise<TimeEntry> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  if (minutes <= 0) throw new Error('Minutes must be greater than 0')

  // Verify the task belongs to the user
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .single()

  if (taskError || !task) throw new Error('Task not found')

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      task_id: taskId,
      user_id: user.id,
      minutes,
      description: description || null,
      tracked_date: trackedDate,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/tasks')
  revalidatePath('/clients')
  return data as TimeEntry
}

export async function getTimeEntries(taskId: string): Promise<TimeEntry[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('task_id', taskId)
    .eq('user_id', user.id)
    .order('tracked_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as TimeEntry[]
}

export async function deleteTimeEntry(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/tasks')
  revalidatePath('/clients')
}
