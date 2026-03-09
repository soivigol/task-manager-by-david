'use client'

import { useState, useMemo } from 'react'
import type { Task, Status, Client } from '@/types/app.types'
import { useAppStore, type DateFilter } from '@/lib/store/app-store'
import { TaskRow } from './TaskRow'
import { ChevronIcon, PlusIcon } from '@/components/ui/Icons'
import { fmt } from '@/lib/utils'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

const GRID = 'minmax(0, 1fr) 100px 34px 84px 90px 100px'

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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const collapsed = useAppStore((s) => s.collapsedGroups[status.id] ?? false)
  const toggleGroupCollapsed = useAppStore((s) => s.toggleGroupCollapsed)
  const dateFilter = useAppStore((s) => s.dateFilter)
  const openTaskModal = useAppStore((s) => s.openTaskModal)

  const filtered = useMemo(() => {
    let result = tasks

    // Date filter by due_date
    if (dateFilter !== 'all') {
      const now = new Date()
      const cutoff = new Date(now.getFullYear(), now.getMonth() - (dateFilter === '1m' ? 1 : dateFilter === '3m' ? 3 : 6), now.getDate())
      const cutoffStr = cutoff.toISOString().slice(0, 10)
      result = result.filter((t) => !t.due_date || t.due_date >= cutoffStr)
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((t) => t.title.toLowerCase().includes(q))
    }

    return result
  }, [tasks, search, dateFilter])

  const total = filtered.reduce((sum, t) => sum + (t.total_tracked_minutes || 0), 0)

  return (
    <div className="mb-0.5">
      {/* Status header */}
      <div
        className="flex items-center gap-2 h-[36px] pl-2 cursor-pointer select-none hover:bg-gray-50/80 rounded transition-colors"
        onClick={() => toggleGroupCollapsed(status.id)}
      >
        <span
          className="text-gray-400 transition-transform duration-150"
          style={{ transform: collapsed ? 'rotate(-90deg)' : '' }}
        >
          <ChevronIcon down size={10} />
        </span>
        <span
          className="text-[11px] font-bold tracking-wide px-[8px] py-[3px] rounded text-white leading-none"
          style={{ backgroundColor: status.color }}
        >
          {status.name}
        </span>
        <span className="text-[12px] text-gray-400 font-medium">{filtered.length}</span>
        {total > 0 && <span className="text-[12px] text-gray-400">{fmt(total)}</span>}
      </div>

      {!collapsed && (
        <>
          {/* Column headers */}
          <div
            className="grid items-center h-[26px] text-[10px] font-bold text-gray-400 uppercase tracking-[0.06em] border-b border-gray-200/50"
            style={{ gridTemplateColumns: GRID }}
          >
            <div className="pl-[60px]">Name</div>
            <div className="text-right pr-2">Due date</div>
            <div />
            <div className="text-center">Time</div>
            <div className="text-center">Client</div>
            <div className="text-right pr-2">Notes</div>
          </div>

          {/* Empty state when search yields no results in this group */}
          {search && filtered.length === 0 && tasks.length > 0 && (
            <div className="py-3 pl-[60px] text-[12px] text-gray-400">
              No matching tasks
            </div>
          )}

          {/* Empty state when group has no tasks at all */}
          {!search && filtered.length === 0 && (
            <div className="py-3 pl-[60px] text-[12px] text-gray-400">
              No tasks &mdash;{' '}
              <button
                onClick={() => openTaskModal(undefined, status.id)}
                className="text-cyan-600 hover:text-cyan-700 underline underline-offset-2"
              >
                Add Task
              </button>
            </div>
          )}

          {/* Task rows */}
          <SortableContext
            items={filtered.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
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
                    sortableId={task.id}
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
          </SortableContext>

          {/* Add task button */}
          <button
            onClick={() => openTaskModal(undefined, status.id)}
            className="flex items-center gap-1 text-gray-400 hover:text-gray-600 text-[12px] py-2 pl-[60px] transition-colors w-full text-left"
          >
            <PlusIcon size={10} /> Add Task
          </button>
        </>
      )}
    </div>
  )
}
