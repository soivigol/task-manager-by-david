'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getClients() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createClientAction(formData: {
  name: string
  color: string
  prepaid_total_minutes?: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const prepaidMinutes = formData.prepaid_total_minutes ?? 0

  const { data, error } = await supabase
    .from('clients')
    .insert({
      user_id: user.id,
      name: formData.name,
      color: formData.color,
      prepaid_total_minutes: prepaidMinutes,
      prepaid_remaining_minutes: prepaidMinutes,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/settings')
  return data
}

export async function updateClient(
  id: string,
  updates: { name?: string; color?: string; prepaid_total_minutes?: number }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const updateData: Record<string, unknown> = {}
  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.color !== undefined) updateData.color = updates.color
  if (updates.prepaid_total_minutes !== undefined) {
    updateData.prepaid_total_minutes = updates.prepaid_total_minutes
  }

  const { data, error } = await supabase
    .from('clients')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/settings')
  return data
}

export async function deleteClient(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings')
  revalidatePath('/tasks')
}

export interface ClientWithStats {
  id: string
  user_id: string
  name: string
  color: string
  prepaid_total_minutes: number
  prepaid_remaining_minutes: number
  created_at: string
  updated_at: string
  task_count: number
  total_tracked_minutes: number
  tasks: { id: string; title: string; total_tracked_minutes: number }[]
}

export async function getClientsWithStats(): Promise<ClientWithStats[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Get all clients
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  if (clientsError) throw new Error(clientsError.message)
  if (!clients) return []

  // Get all tasks with their tracked time grouped by client
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title, client_id, total_tracked_minutes')
    .eq('user_id', user.id)
    .not('client_id', 'is', null)

  if (tasksError) throw new Error(tasksError.message)

  const tasksByClient: Record<string, { id: string; title: string; total_tracked_minutes: number }[]> = {}
  for (const task of tasks ?? []) {
    if (!task.client_id) continue
    if (!tasksByClient[task.client_id]) tasksByClient[task.client_id] = []
    tasksByClient[task.client_id].push({
      id: task.id,
      title: task.title,
      total_tracked_minutes: task.total_tracked_minutes,
    })
  }

  return clients.map((c) => {
    const clientTasks = tasksByClient[c.id] ?? []
    const totalTracked = clientTasks.reduce((sum, t) => sum + (t.total_tracked_minutes || 0), 0)
    return {
      ...c,
      task_count: clientTasks.length,
      total_tracked_minutes: totalTracked,
      tasks: clientTasks,
    }
  })
}

export async function markOveragePaid(clientId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Only reset if currently negative
  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('prepaid_remaining_minutes')
    .eq('id', clientId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !client) throw new Error('Client not found')
  if (client.prepaid_remaining_minutes >= 0) return

  const { error } = await supabase
    .from('clients')
    .update({ prepaid_remaining_minutes: 0 })
    .eq('id', clientId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/clients')
}
