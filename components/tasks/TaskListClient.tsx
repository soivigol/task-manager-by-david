'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import type { Task, Status, Client } from '@/types/app.types'
import { useAppStore } from '@/lib/store/app-store'
import { StatusGroup } from './StatusGroup'
import { StatusPicker } from './StatusPicker'
import { TaskModal } from './TaskModal'
import { TimePopup } from './TimePopup'
import { ToastContainer } from '@/components/ui/Toast'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { reorderTasks } from '@/lib/api/tasks'

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

  const reorderTasksOptimistic = useAppStore((s) => s.reorderTasksOptimistic)

  const [timePop, setTimePop] = useState<{ taskId: string; taskTitle: string } | null>(null)

  const handleTimeClick = useCallback((taskId: string, taskTitle: string) => {
    setTimePop({ taskId, taskTitle })
  }, [])

  // Require 5px movement before drag activates — prevents accidental drags on clicks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

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

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const activeId = active.id as string
      const overId = over.id as string

      // Find which status group the active task belongs to
      const activeTask = tasks.find((t) => t.id === activeId && !t.parent_id)
      const overTask = tasks.find((t) => t.id === overId && !t.parent_id)
      if (!activeTask || !overTask) return

      // Only allow reorder within the same status group
      if (activeTask.status_id !== overTask.status_id) return

      const statusId = activeTask.status_id
      const groupTasks = tasksByStatus[statusId] ?? []
      const oldIndex = groupTasks.findIndex((t) => t.id === activeId)
      const newIndex = groupTasks.findIndex((t) => t.id === overId)
      if (oldIndex === -1 || newIndex === -1) return

      const reordered = arrayMove(groupTasks, oldIndex, newIndex)
      const orderedIds = reordered.map((t) => t.id)

      // Optimistic update
      reorderTasksOptimistic(statusId, orderedIds)

      // Persist to server
      reorderTasks(statusId, orderedIds).catch(() => {
        // On error, revert by re-setting from original order
        const revertIds = groupTasks.map((t) => t.id)
        reorderTasksOptimistic(statusId, revertIds)
      })
    },
    [tasks, tasksByStatus, reorderTasksOptimistic]
  )

  if (statuses.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400 text-[13px]">
        No statuses configured. Go to Settings to add statuses.
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
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
            onTimeClick={handleTimeClick}
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

        <TaskModal />

        {timePop && (
          <TimePopup
            taskId={timePop.taskId}
            taskTitle={timePop.taskTitle}
            onClose={() => setTimePop(null)}
          />
        )}

        <ToastContainer />
      </div>
    </DndContext>
  )
}
