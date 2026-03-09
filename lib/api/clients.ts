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
