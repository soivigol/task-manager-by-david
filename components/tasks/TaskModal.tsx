'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { Priority, RecurrenceType } from '@/types/app.types'
import { useAppStore } from '@/lib/store/app-store'
import { createTask, updateTask, deleteTask } from '@/lib/api/tasks'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TrashIcon, XIcon, RepeatIcon } from '@/components/ui/Icons'

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
]

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

type RecurrenceOption = 'none' | RecurrenceType

interface TaskFormData {
  title: string
  status_id: string
  client_id: string | null
  due_date: string
  priority: Priority
  quick_notes: string
  description: string
  recurrence_type: RecurrenceOption
  recurrence_interval: number
  recurrence_days: number
  recurrence_weekdays: number[]
}

export function TaskModal() {
  const isOpen = useAppStore((s) => s.isTaskModalOpen)
  const selectedTaskId = useAppStore((s) => s.selectedTaskId)
  const isNewTask = useAppStore((s) => s.isNewTask)
  const defaultStatusId = useAppStore((s) => s.defaultStatusId)
  const parentTaskId = useAppStore((s) => s.parentTaskId)
  const tasks = useAppStore((s) => s.tasks)
  const statuses = useAppStore((s) => s.statuses)
  const clients = useAppStore((s) => s.clients)
  const closeTaskModal = useAppStore((s) => s.closeTaskModal)
  const addTaskOptimistic = useAppStore((s) => s.addTaskOptimistic)
  const updateTaskOptimistic = useAppStore((s) => s.updateTaskOptimistic)
  const removeTaskOptimistic = useAppStore((s) => s.removeTaskOptimistic)
  const addToast = useAppStore((s) => s.addToast)

  const existingTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId)
    : null

  const parentTask = parentTaskId
    ? tasks.find((t) => t.id === parentTaskId)
    : existingTask?.parent_id
      ? tasks.find((t) => t.id === existingTask.parent_id)
      : null

  const isSubtask = !!parentTaskId || !!existingTask?.parent_id

  const defaultStatus =
    defaultStatusId ??
    parentTask?.status_id ??
    statuses.find((s) => !s.is_closed)?.id ??
    statuses[0]?.id ??
    ''

  const [form, setForm] = useState<TaskFormData>({
    title: '',
    status_id: defaultStatus,
    client_id: null,
    due_date: '',
    priority: 'normal',
    quick_notes: '',
    description: '',
    recurrence_type: 'none',
    recurrence_interval: 1,
    recurrence_days: 14,
    recurrence_weekdays: [],
  })

  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  // Initialize form when modal opens
  useEffect(() => {
    if (!isOpen) return

    if (existingTask) {
      setForm({
        title: existingTask.title,
        status_id: existingTask.status_id,
        client_id: existingTask.client_id,
        due_date: existingTask.due_date ?? '',
        priority: existingTask.priority,
        quick_notes: existingTask.quick_notes ?? '',
        description:
          existingTask.description != null
            ? typeof existingTask.description === 'string'
              ? (existingTask.description as string)
              : ''
            : '',
        recurrence_type: existingTask.recurrence_type ?? 'none',
        recurrence_interval: existingTask.recurrence_interval ?? 1,
        recurrence_days: existingTask.recurrence_days ?? 14,
        recurrence_weekdays: existingTask.recurrence_weekdays ?? [],
      })
    } else {
      setForm({
        title: '',
        status_id: defaultStatus,
        client_id: null,
        due_date: '',
        priority: 'normal',
        quick_notes: '',
        description: '',
        recurrence_type: 'none',
        recurrence_interval: 1,
        recurrence_days: 14,
        recurrence_weekdays: [],
      })
    }

    setShowConfirm(false)
    setSaving(false)

    // Focus title after a tick
    setTimeout(() => titleRef.current?.focus(), 50)
  }, [isOpen, existingTask, defaultStatus])

  const setField = useCallback(
    <K extends keyof TaskFormData>(key: K, value: TaskFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const toggleWeekday = useCallback((day: number) => {
    setForm((prev) => {
      const current = prev.recurrence_weekdays
      const next = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort((a, b) => a - b)
      return { ...prev, recurrence_weekdays: next }
    })
  }, [])

  const buildRecurrenceFields = (): {
    recurrence_type: RecurrenceType | null
    recurrence_interval: number | null
    recurrence_days: number | null
    recurrence_weekdays: number[] | null
  } => {
    if (form.recurrence_type === 'none' || isSubtask) {
      return {
        recurrence_type: null,
        recurrence_interval: null,
        recurrence_days: null,
        recurrence_weekdays: null,
      }
    }

    switch (form.recurrence_type) {
      case 'weekly':
      case 'monthly':
        return {
          recurrence_type: form.recurrence_type,
          recurrence_interval: form.recurrence_interval,
          recurrence_days: null,
          recurrence_weekdays: null,
        }
      case 'custom_days':
        return {
          recurrence_type: form.recurrence_type,
          recurrence_interval: null,
          recurrence_days: form.recurrence_days,
          recurrence_weekdays: null,
        }
      case 'custom_weekdays': {
        const weekdays =
          form.recurrence_weekdays.length > 0
            ? form.recurrence_weekdays
            : null
        return {
          recurrence_type: weekdays ? form.recurrence_type : null,
          recurrence_interval: null,
          recurrence_days: null,
          recurrence_weekdays: weekdays,
        }
      }
      default:
        return {
          recurrence_type: null,
          recurrence_interval: null,
          recurrence_days: null,
          recurrence_weekdays: null,
        }
    }
  }

  const handleSave = async () => {
    if (!form.title.trim() || saving) return
    setSaving(true)

    const recurrence = buildRecurrenceFields()

    try {
      if (isNewTask) {
        const taskData = {
          title: form.title.trim(),
          status_id: isSubtask && parentTask ? parentTask.status_id : form.status_id,
          client_id: form.client_id || null,
          due_date: form.due_date || null,
          priority: form.priority,
          quick_notes: form.quick_notes || null,
          description: null as Record<string, unknown> | null,
          parent_id: parentTaskId ?? null,
          ...recurrence,
        }

        const created = await createTask(taskData)
        addTaskOptimistic(created)
        addToast('Task created', 'success')
      } else if (selectedTaskId) {
        const updates = {
          title: form.title.trim(),
          status_id: isSubtask ? undefined : form.status_id,
          client_id: form.client_id || null,
          due_date: form.due_date || null,
          priority: form.priority,
          quick_notes: form.quick_notes || null,
          ...recurrence,
        }

        updateTaskOptimistic(selectedTaskId, {
          title: updates.title,
          ...(updates.status_id ? { status_id: updates.status_id } : {}),
          client_id: updates.client_id,
          due_date: updates.due_date,
          priority: updates.priority,
          quick_notes: updates.quick_notes,
          recurrence_type: recurrence.recurrence_type,
          recurrence_interval: recurrence.recurrence_interval,
          recurrence_days: recurrence.recurrence_days,
          recurrence_weekdays: recurrence.recurrence_weekdays,
        })

        await updateTask(selectedTaskId, updates)
        addToast('Task updated', 'success')
      }
      closeTaskModal()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save task'
      addToast(message, 'error')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedTaskId) return
    setShowConfirm(false)
    removeTaskOptimistic(selectedTaskId)
    closeTaskModal()

    try {
      await deleteTask(selectedTaskId)
      addToast('Task deleted', 'success')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete task'
      addToast(message, 'error')
    }
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
  }

  if (!isOpen) return null

  const modalTitle = isNewTask
    ? isSubtask
      ? 'New Subtask'
      : 'New Task'
    : 'Edit Task'

  const headerRight = (
    <>
      {!isNewTask && selectedTaskId && (
        <button
          onClick={() => setShowConfirm(true)}
          className="text-gray-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
          title="Delete task"
        >
          <TrashIcon />
        </button>
      )}
      <button
        onClick={closeTaskModal}
        className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <XIcon />
      </button>
    </>
  )

  const footer = (
    <>
      <button
        onClick={closeTaskModal}
        className="px-3 py-[6px] text-[12px] text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={handleSave}
        disabled={!form.title.trim() || saving}
        className="px-4 py-[6px] text-[12px] font-medium text-white bg-[#1a1a2e] rounded-lg hover:bg-[#252540] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving...' : isNewTask ? 'Create' : 'Save'}
      </button>
    </>
  )

  return (
    <>
      <Modal
        title={modalTitle}
        onClose={closeTaskModal}
        headerRight={headerRight}
        footer={footer}
      >
        <div className="px-5 py-4 space-y-3">
          {/* Subtask parent info */}
          {isSubtask && parentTask && (
            <p className="text-[10px] text-gray-400">
              Parent: {parentTask.title}
            </p>
          )}

          {/* Title */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
              Title
            </label>
            <input
              ref={titleRef}
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              onKeyDown={handleTitleKeyDown}
              placeholder="Task name..."
              className="w-full border border-gray-200 rounded-lg px-3 py-[7px] text-[13px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
          </div>

          {/* Status + Client row */}
          <div className="grid grid-cols-2 gap-3">
            {!isSubtask && (
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                  Status
                </label>
                <select
                  value={form.status_id}
                  onChange={(e) => setField('status_id', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-[7px] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                >
                  {statuses.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                Client
              </label>
              <select
                value={form.client_id ?? ''}
                onChange={(e) =>
                  setField('client_id', e.target.value || null)
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-[7px] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
              >
                <option value="">No client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date + Priority row */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                Due Date
              </label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setField('due_date', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-[7px] text-[13px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) =>
                  setField('priority', e.target.value as Priority)
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-[7px] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recurrence section - only for non-subtask tasks */}
          {!isSubtask && (
            <div className="bg-gray-50/70 rounded-xl p-3 border border-gray-100">
              <label className="text-[10px] font-semibold text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                <RepeatIcon size={10} /> Recurrence
              </label>
              <select
                value={form.recurrence_type}
                onChange={(e) =>
                  setField(
                    'recurrence_type',
                    e.target.value as RecurrenceOption
                  )
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-[7px] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 mb-2"
              >
                <option value="none">No repeat</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom_days">Every X days</option>
                <option value="custom_weekdays">
                  Specific days of the week
                </option>
              </select>

              {(form.recurrence_type === 'weekly' ||
                form.recurrence_type === 'monthly') && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[11px] text-gray-500">Every</span>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={form.recurrence_interval}
                    onChange={(e) =>
                      setField(
                        'recurrence_interval',
                        parseInt(e.target.value) || 1
                      )
                    }
                    className="w-[50px] border border-gray-200 rounded-lg px-2 py-[5px] text-[13px] text-center bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  />
                  <span className="text-[11px] text-gray-500">
                    {form.recurrence_type === 'weekly'
                      ? 'week(s)'
                      : 'month(s)'}
                  </span>
                </div>
              )}

              {form.recurrence_type === 'custom_days' && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[11px] text-gray-500">Every</span>
                  <input
                    type="number"
                    min="1"
                    value={form.recurrence_days}
                    onChange={(e) =>
                      setField(
                        'recurrence_days',
                        parseInt(e.target.value) || 1
                      )
                    }
                    className="w-[50px] border border-gray-200 rounded-lg px-2 py-[5px] text-[13px] text-center bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  />
                  <span className="text-[11px] text-gray-500">days</span>
                </div>
              )}

              {form.recurrence_type === 'custom_weekdays' && (
                <div className="flex gap-[5px] mt-1">
                  {WEEKDAY_LABELS.map((day, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleWeekday(i)}
                      className={`w-[38px] h-[30px] rounded-full text-[11px] font-semibold transition-all ${
                        form.recurrence_weekdays.includes(i)
                          ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/20'
                          : 'bg-white text-gray-500 border border-gray-200 hover:border-cyan-300 hover:text-cyan-600'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              )}

              {form.recurrence_type !== 'none' && (
                <p className="text-[10px] text-cyan-600 mt-2 flex items-center gap-1">
                  <RepeatIcon size={9} /> When marked as done, a new task is
                  created with the next due date.
                </p>
              )}
            </div>
          )}

          {/* Quick Notes */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
              Quick Notes
            </label>
            <input
              value={form.quick_notes}
              onChange={(e) => setField('quick_notes', e.target.value)}
              placeholder="Quick note..."
              className="w-full border border-gray-200 rounded-lg px-3 py-[7px] text-[13px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              rows={4}
              placeholder="Detailed description..."
              className="w-full border border-gray-200 rounded-lg px-3 py-[7px] text-[13px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      {showConfirm && selectedTaskId && (
        <ConfirmDialog
          title="Delete task?"
          message={`Are you sure you want to delete "${form.title}"?`}
          note="Any subtasks and time entries will also be permanently deleted."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}
