'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getStatuses() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('statuses')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createStatus(formData: {
  name: string
  color: string
  is_closed?: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Get max sort_order
  const { data: existing } = await supabase
    .from('statuses')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('statuses')
    .insert({
      user_id: user.id,
      name: formData.name.toUpperCase(),
      color: formData.color,
      is_closed: formData.is_closed ?? false,
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/settings')
  return data
}

export async function updateStatus(
  id: string,
  updates: { name?: string; color?: string; is_closed?: boolean }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const updateData: Record<string, unknown> = {}
  if (updates.name !== undefined) updateData.name = updates.name.toUpperCase()
  if (updates.color !== undefined) updateData.color = updates.color
  if (updates.is_closed !== undefined) updateData.is_closed = updates.is_closed

  const { data, error } = await supabase
    .from('statuses')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/settings')
  return data
}

export async function deleteStatus(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Check if any tasks reference this status
  const { count } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('status_id', id)
    .eq('user_id', user.id)

  if (count && count > 0) {
    return { error: 'Cannot delete status with existing tasks' }
  }

  const { error } = await supabase
    .from('statuses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings')
  return { error: null }
}

export async function reorderStatuses(orderedIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Update sort_order for each status
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('statuses')
      .update({ sort_order: i })
      .eq('id', orderedIds[i])
      .eq('user_id', user.id)

    if (error) throw new Error(error.message)
  }

  revalidatePath('/settings')
  revalidatePath('/tasks')
}
