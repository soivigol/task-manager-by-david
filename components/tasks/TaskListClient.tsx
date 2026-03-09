'use client'

import { useEffect, useMemo } from 'react'
import type { Task, Status, Client } from '@/types/app.types'
import { useAppStore } from '@/lib/store/app-store'
import { StatusGroup } from './StatusGroup'
import { StatusPicker } from './StatusPicker'

interface TaskListClientProps {
  initialTasks: Task[]
  initialStatuses: Status[]
  initialClients: Client[]
}

export function TaskListClient({
  initialTasks,
  initialStatuses,
  initialClients,
}: TaskListClientProps) {
  const setTasks = useAppStore((s) => s.setTasks)
  const setStatuses = useAppStore((s) => s.setStatuses)
  const setClients = useAppStore((s) => s.setClients)
  const tasks = useAppStore((s) => s.tasks)
  const statuses = useAppStore((s) => s.statuses)
  const clients = useAppStore((s) => s.clients)
  const search = useAppStore((s) => s.search)
  const picker = useAppStore((s) => s.picker)
  const closePicker = useAppStore((s) => s.closePicker)

  // Populate store on mount / when server data changes
  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks, setTasks])

  useEffect(() => {
    setStatuses(initialStatuses)
  }, [initialStatuses, setStatuses])

  useEffect(() => {
    setClients(initialClients)
  }, [initialClients, setClients])

  // Build subtasks map and group top-level tasks by status
  const { tasksByStatus, subtasksMap } = useMemo(() => {
    const topLevel = tasks.filter((t) => !t.parent_id)
    const sMap: Record<string, Task[]> = {}
    tasks
      .filter((t) => t.parent_id)
      .forEach((t) => {
        const pid = t.parent_id!
        if (!sMap[pid]) sMap[pid] = []
        sMap[pid].push(t)
      })

    // Sort subtasks by sort_order
    Object.values(sMap).forEach((arr) => arr.sort((a, b) => a.sort_order - b.sort_order))

    const byStatus: Record<string, Task[]> = {}
    for (const status of statuses) {
      byStatus[status.id] = topLevel
        .filter((t) => t.status_id === status.id)
        .sort((a, b) => a.sort_order - b.sort_order)
    }

    return { tasksByStatus: byStatus, subtasksMap: sMap }
  }, [tasks, statuses])

  // Close picker on outside click
  useEffect(() => {
    if (!picker) return
    const handler = () => closePicker()
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [picker, closePicker])

  if (statuses.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400 text-[13px]">
        No statuses configured. Go to Settings to add statuses.
      </div>
    )
  }

  return (
    <div className="px-3 py-2">
      {statuses.map((status) => (
        <StatusGroup
          key={status.id}
          status={status}
          tasks={tasksByStatus[status.id] ?? []}
          subtasksMap={subtasksMap}
          clients={clients}
          statuses={statuses}
          search={search}
        />
      ))}

      {picker && (
        <StatusPicker
          currentStatusId={picker.currentStatusId}
          taskId={picker.taskId}
          statuses={statuses}
          pos={{ x: picker.x, y: picker.y }}
        />
      )}
    </div>
  )
}
