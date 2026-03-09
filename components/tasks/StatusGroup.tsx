'use client'

import { useState, useMemo } from 'react'
import type { Task, Status, Client } from '@/types/app.types'
import { useAppStore } from '@/lib/store/app-store'
import { TaskRow } from './TaskRow'
import { ChevronIcon, PlusIcon } from '@/components/ui/Icons'
import { fmt } from '@/lib/utils'

const GRID = 'minmax(0, 1fr) 96px 30px 78px 78px 86px'

interface StatusGroupProps {
  status: Status
  tasks: Task[]
  subtasksMap: Record<string, Task[]>
  clients: Client[]
  statuses: Status[]
  search: string
  onTimeClick: (taskId: string, taskTitle: string) => void
}

export function StatusGroup({
  status,
  tasks,
  subtasksMap,
  clients,
  statuses,
  search,
  onTimeClick,
}: StatusGroupProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const openTaskModal = useAppStore((s) => s.openTaskModal)

  const filtered = useMemo(() => {
    if (!search) return tasks
    const q = search.toLowerCase()
    return tasks.filter((t) => t.title.toLowerCase().includes(q))
  }, [tasks, search])

  const total = filtered.reduce((sum, t) => sum + (t.total_tracked_minutes || 0), 0)

  return (
    <div className="mb-0.5">
      {/* Status header */}
      <div
        className="flex items-center gap-2 h-[30px] pl-2 cursor-pointer select-none hover:bg-gray-50/80 rounded transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span
          className="text-gray-400 transition-transform duration-150"
          style={{ transform: collapsed ? 'rotate(-90deg)' : '' }}
        >
          <ChevronIcon down size={10} />
        </span>
        <span
          className="text-[10px] font-bold tracking-wide px-[7px] py-[2px] rounded text-white leading-none"
          style={{ backgroundColor: status.color }}
        >
          {status.name}
        </span>
        <span className="text-[10px] text-gray-400 font-medium">{filtered.length}</span>
        {total > 0 && <span className="text-[10px] text-gray-400">{fmt(total)}</span>}
      </div>

      {!collapsed && (
        <>
          {/* Column headers */}
          <div
            className="grid items-center h-[22px] text-[9px] font-bold text-gray-400 uppercase tracking-[0.06em] border-b border-gray-200/50"
            style={{ gridTemplateColumns: GRID }}
          >
            <div className="pl-[60px]">Name</div>
            <div className="text-right pr-2">Due date</div>
            <div />
            <div className="text-center">Time</div>
            <div className="text-center">Client</div>
            <div className="text-right pr-2">Notes</div>
          </div>

          {/* Task rows */}
          {filtered.map((task) => {
            const subs = subtasksMap[task.id] ?? []
            const isExp = expanded[task.id] ?? false
            return (
              <div key={task.id}>
                <TaskRow
                  task={task}
                  clients={clients}
                  statuses={statuses}
                  isSubtask={false}
                  hasSubtasks={subs.length > 0}
                  expanded={isExp}
                  onToggle={() =>
                    setExpanded((prev) => ({ ...prev, [task.id]: !prev[task.id] }))
                  }
                  onTimeClick={onTimeClick}
                />
                {isExp &&
                  subs.map((sub) => (
                    <TaskRow
                      key={sub.id}
                      task={sub}
                      clients={clients}
                      statuses={statuses}
                      isSubtask={true}
                      hasSubtasks={false}
                      expanded={false}
                      onToggle={() => {}}
                      onTimeClick={onTimeClick}
                    />
                  ))}
              </div>
            )
          })}

          {/* Add task button */}
          <button
            onClick={() => openTaskModal(undefined, status.id)}
            className="flex items-center gap-1 text-gray-400 hover:text-gray-600 text-[11px] py-1.5 pl-[60px] transition-colors w-full text-left"
          >
            <PlusIcon size={10} /> Add Task
          </button>
        </>
      )}
    </div>
  )
}
