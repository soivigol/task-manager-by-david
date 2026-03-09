'use server'

import { createClient } from '@/lib/supabase/server'

export interface ReportEntry {
  id: string
  minutes: number
  description: string | null
  tracked_date: string
}

export interface ReportTask {
  id: string
  title: string
  entries: ReportEntry[]
  totalMinutes: number
}

export interface ReportClient {
  id: string
  name: string
  color: string
  prepaid_total_minutes: number
  prepaid_remaining_minutes: number
  tasks: ReportTask[]
  totalMinutes: number
}

export interface ReportData {
  clients: ReportClient[]
  grandTotal: number
  startDate: string
  endDate: string
}

export async function getReport(
  startDate: string,
  endDate: string,
  clientId?: string
): Promise<ReportData> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Fetch time entries in the date range, joined with task and client info
  let query = supabase
    .from('time_entries')
    .select(
      `
      id,
      minutes,
      description,
      tracked_date,
      task_id,
      tasks!inner (
        id,
        title,
        client_id,
        clients (
          id,
          name,
          color,
          prepaid_total_minutes,
          prepaid_remaining_minutes
        )
      )
    `
    )
    .eq('user_id', user.id)
    .gte('tracked_date', startDate)
    .lte('tracked_date', endDate)
    .order('tracked_date', { ascending: true })

  if (clientId) {
    query = query.eq('tasks.client_id', clientId)
  }

  const { data: entries, error } = await query

  if (error) throw new Error(error.message)

  // Group by client -> task -> entries
  const clientMap = new Map<string, ReportClient>()

  for (const entry of entries ?? []) {
    const task = entry.tasks as unknown as {
      id: string
      title: string
      client_id: string | null
      clients: {
        id: string
        name: string
        color: string
        prepaid_total_minutes: number
        prepaid_remaining_minutes: number
      } | null
    }

    const clientInfo = task.clients
    const cid = clientInfo?.id ?? 'no-client'
    const clientName = clientInfo?.name ?? 'No Client'
    const clientColor = clientInfo?.color ?? '#6b7280'

    if (!clientMap.has(cid)) {
      clientMap.set(cid, {
        id: cid,
        name: clientName,
        color: clientColor,
        prepaid_total_minutes: clientInfo?.prepaid_total_minutes ?? 0,
        prepaid_remaining_minutes: clientInfo?.prepaid_remaining_minutes ?? 0,
        tasks: [],
        totalMinutes: 0,
      })
    }

    const client = clientMap.get(cid)!
    let reportTask = client.tasks.find((t) => t.id === task.id)
    if (!reportTask) {
      reportTask = {
        id: task.id,
        title: task.title,
        entries: [],
        totalMinutes: 0,
      }
      client.tasks.push(reportTask)
    }

    reportTask.entries.push({
      id: entry.id,
      minutes: entry.minutes,
      description: entry.description,
      tracked_date: entry.tracked_date,
    })
    reportTask.totalMinutes += entry.minutes
    client.totalMinutes += entry.minutes
  }

  const clientsArray = Array.from(clientMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
  const grandTotal = clientsArray.reduce((sum, c) => sum + c.totalMinutes, 0)

  return {
    clients: clientsArray,
    grandTotal,
    startDate,
    endDate,
  }
}
