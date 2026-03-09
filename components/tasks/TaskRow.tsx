'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Task, Status, Client, Priority } from '@/types/app.types'
import { useAppStore } from '@/lib/store/app-store'
import { updateTask } from '@/lib/api/tasks'
import { ChevronIcon, PlusIcon, GripIcon, ClockIcon, RepeatIcon, EditIcon } from '@/components/ui/Icons'
import { fmt, fmtDate } from '@/lib/utils'
import { recurrenceLabel } from '@/lib/recurrence'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const GRID = 'minmax(0, 1fr) 100px 34px 84px 90px 100px'

const PRIORITY_MAP: Record<Priority, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: '#ef4444' },
  high: { label: 'High', color: '#f97316' },
  normal: { label: 'Normal', color: '#3b82f6' },
  low: { label: 'Low', color: '#9ca3af' },
}

interface TaskRowProps {
  task: Task
  clients: Client[]
  statuses: Status[]
  isSubtask: boolean
  hasSubtasks: boolean
  expanded: boolean
  onToggle: () => void
  onTimeClick: (taskId: string, taskTitle: string) => void
  sortableId?: string
}

export function TaskRow({
  task,
  clients,
  statuses,
  isSubtask,
  hasSubtasks,
  expanded,
  onToggle,
  onTimeClick,
  sortableId,
}: TaskRowProps) {
  const openTaskModal = useAppStore((s) => s.openTaskModal)
  const openPicker = useAppStore((s) => s.openPicker)
  const updateTaskOptimistic = useAppStore((s) => s.updateTaskOptimistic)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId ?? task.id,
    disabled: isSubtask,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? 'relative' as const : undefined,
  }

  const [notes, setNotes] = useState(task.quick_notes ?? '')

  // Inline title editing
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(task.title)
  const titleRef = useRef<HTMLInputElement>(null)

  // Inline due date editing
  const [editingDate, setEditingDate] = useState(false)
  const dateRef = useRef<HTMLInputElement>(null)

  // Inline client picker
  const [clientPickerOpen, setClientPickerOpen] = useState(false)
  const clientPickerRef = useRef<HTMLDivElement>(null)

  // Sync title draft when task changes externally
  useEffect(() => {
    if (!editingTitle) setTitleDraft(task.title)
  }, [task.title, editingTitle])

  // Sync notes when task changes externally
  useEffect(() => {
    setNotes(task.quick_notes ?? '')
  }, [task.quick_notes])

  // Focus title input when entering edit mode
  useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus()
      titleRef.current.select()
    }
  }, [editingTitle])

  // Focus and open date picker when entering edit mode
  useEffect(() => {
    if (editingDate && dateRef.current) {
      dateRef.current.showPicker()
    }
  }, [editingDate])

  // Close client picker on outside click
  useEffect(() => {
    if (!clientPickerOpen) return
    const handler = (e: MouseEvent) => {
      if (clientPickerRef.current && !clientPickerRef.current.contains(e.target as Node)) {
        setClientPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [clientPickerOpen])

  const client = clients.find((c) => c.id === task.client_id)
  const status = statuses.find((s) => s.id === task.status_id)
  const p = PRIORITY_MAP[task.priority] ?? PRIORITY_MAP.normal

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isPastDue =
    task.due_date &&
    new Date(task.due_date + 'T00:00:00') < today &&
    !status?.is_closed

  const handleStatusClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      const rect = e.currentTarget.getBoundingClientRect()
      openPicker({
        taskId: task.id,
        currentStatusId: task.status_id,
        x: rect.left,
        y: rect.bottom + 4,
      })
    },
    [openPicker, task.id, task.status_id]
  )

  const handleNotesSave = useCallback(async () => {
    if (notes !== (task.quick_notes ?? '')) {
      updateTaskOptimistic(task.id, { quick_notes: notes || null })
      try {
        await updateTask(task.id, { quick_notes: notes || null })
      } catch {
        setNotes(task.quick_notes ?? '')
      }
    }
  }, [notes, task.id, task.quick_notes, updateTaskOptimistic])

  const handleTitleSave = useCallback(async () => {
    setEditingTitle(false)
    const trimmed = titleDraft.trim()
    if (!trimmed || trimmed === task.title) {
      setTitleDraft(task.title)
      return
    }
    updateTaskOptimistic(task.id, { title: trimmed })
    try {
      await updateTask(task.id, { title: trimmed })
    } catch {
      setTitleDraft(task.title)
      updateTaskOptimistic(task.id, { title: task.title })
    }
  }, [titleDraft, task.id, task.title, updateTaskOptimistic])

  const handleDateChange = useCallback(async (newDate: string) => {
    setEditingDate(false)
    const value = newDate || null
    if (value === task.due_date) return
    updateTaskOptimistic(task.id, { due_date: value })
    try {
      await updateTask(task.id, { due_date: value })
    } catch {
      updateTaskOptimistic(task.id, { due_date: task.due_date })
    }
  }, [task.id, task.due_date, updateTaskOptimistic])

  const handleClientChange = useCallback(async (newClientId: string | null) => {
    setClientPickerOpen(false)
    if (newClientId === task.client_id) return
    updateTaskOptimistic(task.id, { client_id: newClientId })
    try {
      await updateTask(task.id, { client_id: newClientId })
    } catch {
      updateTaskOptimistic(task.id, { client_id: task.client_id })
    }
  }, [task.id, task.client_id, updateTaskOptimistic])

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="group border-b border-gray-100/60 hover:bg-[#f8f9fb] transition-colors"
    >
      <div
        className="grid items-center h-[40px]"
        style={{ gridTemplateColumns: GRID }}
      >
        {/* COL 1: Name */}
        <div
          className={`flex items-center min-w-0 h-full ${
            isSubtask ? 'pl-[50px]' : 'pl-[2px]'
          }`}
        >
          {!isSubtask && (
            <div
              className="w-[16px] shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-grab"
              {...listeners}
            >
              <GripIcon />
            </div>
          )}
          {isSubtask && <div className="w-[16px] shrink-0" />}

          <button
            onClick={handleStatusClick}
            className="w-[22px] shrink-0 flex items-center justify-center"
          >
            <span
              className="w-[10px] h-[10px] rounded-full border-[2px] hover:scale-[1.3] transition-transform"
              style={{
                borderColor: status?.color ?? '#ccc',
                backgroundColor: status?.is_closed ? status.color : 'transparent',
              }}
            />
          </button>

          {!isSubtask && (
            <div className="w-[18px] shrink-0 flex items-center justify-center">
              {hasSubtasks && (
                <button
                  onClick={onToggle}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {expanded ? <ChevronIcon down /> : <ChevronIcon />}
                </button>
              )}
            </div>
          )}

          {editingTitle ? (
            <input
              ref={titleRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave()
                if (e.key === 'Escape') {
                  setTitleDraft(task.title)
                  setEditingTitle(false)
                }
              }}
              className="flex-1 min-w-0 text-[14px] text-gray-800 bg-white border border-gray-200 rounded px-1 py-0.5 pl-1 outline-none focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500"
            />
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="flex-1 min-w-0 text-left text-[14px] text-gray-800 hover:text-cyan-700 truncate pl-1 transition-colors"
            >
              {task.title}
            </button>
          )}

          {!isSubtask && task.recurrence_type && (
            <span className="shrink-0 inline-flex items-center gap-0.5 text-[11px] text-cyan-600 bg-cyan-50 rounded px-1.5 py-[1px] font-medium mr-0.5">
              <RepeatIcon size={9} />
              {recurrenceLabel(task)}
            </span>
          )}

          {/* Open full modal */}
          <button
            onClick={() => openTaskModal(task.id)}
            title="Edit task details"
            className={`shrink-0 mx-0.5 w-[24px] h-[24px] rounded flex items-center justify-center text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 transition-all ${
              editingTitle ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <EditIcon size={13} />
          </button>

          {!isSubtask && (
            <button
              onClick={() => openTaskModal(undefined, task.status_id, task.id)}
              title="Add subtask"
              className="opacity-0 group-hover:opacity-100 shrink-0 mx-0.5 w-[20px] h-[20px] rounded flex items-center justify-center text-gray-300 hover:text-cyan-600 hover:bg-cyan-50 transition-all"
            >
              <PlusIcon size={10} />
            </button>
          )}
        </div>

        {/* COL 2: Due date — click to edit inline */}
        <div className="text-right pr-2 relative">
          {editingDate ? (
            <input
              ref={dateRef}
              type="date"
              defaultValue={task.due_date ?? ''}
              onChange={(e) => handleDateChange(e.target.value)}
              onBlur={() => setEditingDate(false)}
              className="w-full text-[13px] text-gray-600 bg-white border border-gray-200 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500"
            />
          ) : (
            <button
              onClick={() => setEditingDate(true)}
              className={`text-[13px] hover:text-cyan-600 transition-colors ${
                isPastDue ? 'text-red-500 font-medium' : 'text-gray-500'
              }`}
            >
              {fmtDate(task.due_date) || '\u2014'}
            </button>
          )}
        </div>

        {/* COL 3: Priority */}
        <div className="flex items-center justify-center">
          <span
            className="w-[7px] h-[7px] rounded-[2px]"
            style={{ backgroundColor: p.color }}
            title={p.label}
          />
        </div>

        {/* COL 4: Time */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onTimeClick(task.id, task.title)
          }}
          className="flex items-center justify-center gap-1 text-[13px] text-gray-400 hover:text-cyan-600 transition-colors h-full"
        >
          <ClockIcon />
          <span>{fmt(task.total_tracked_minutes)}</span>
        </button>

        {/* COL 5: Client — click to pick inline */}
        <div className="flex items-center justify-center relative" ref={clientPickerRef}>
          <button
            onClick={() => setClientPickerOpen((v) => !v)}
            className="hover:opacity-80 transition-opacity"
          >
            {client ? (
              <span
                className="text-[11px] font-semibold px-[5px] py-[1px] rounded"
                style={{
                  backgroundColor: client.color + '16',
                  color: client.color,
                }}
              >
                {client.name}
              </span>
            ) : (
              <span className="text-gray-300 text-[13px] hover:text-cyan-500 transition-colors">&mdash;</span>
            )}
          </button>

          {clientPickerOpen && (
            <div className="absolute top-full mt-1 right-0 z-[200] bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]">
              <button
                onClick={() => handleClientChange(null)}
                className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-gray-50 transition-colors ${
                  !task.client_id ? 'text-cyan-600 font-medium' : 'text-gray-500'
                }`}
              >
                None
              </button>
              {clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleClientChange(c.id)}
                  className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                    task.client_id === c.id ? 'text-cyan-600 font-medium' : 'text-gray-700'
                  }`}
                >
                  <span
                    className="w-[8px] h-[8px] rounded-full shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* COL 6: Notes */}
        <div className="pr-2">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesSave}
            placeholder="&mdash;"
            className="w-full text-[12px] text-gray-500 bg-transparent border-0 focus:outline-none focus:bg-white focus:ring-1 focus:ring-gray-200 rounded px-1 py-0.5 placeholder:text-gray-300 text-right"
          />
        </div>
      </div>
    </div>
  )
}
