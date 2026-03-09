'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store/app-store'
import { addTimeEntry } from '@/lib/api/time-entries'
import { ClockIcon, XIcon } from '@/components/ui/Icons'

interface TimePopupProps {
  taskId: string
  taskTitle: string
  onClose: () => void
}

export function TimePopup({ taskId, taskTitle, onClose }: TimePopupProps) {
  const updateTaskOptimistic = useAppStore((s) => s.updateTaskOptimistic)
  const tasks = useAppStore((s) => s.tasks)
  const addToast = useAppStore((s) => s.addToast)

  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(() => {
    const now = new Date()
    return now.toISOString().split('T')[0]
  })
  const [saving, setSaving] = useState(false)

  const hoursRef = useRef<HTMLInputElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  // Auto-focus hours input on open
  useEffect(() => {
    hoursRef.current?.focus()
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay to avoid the same click that opened the popup from closing it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler)
    }
  }, [onClose])

  const handleSave = useCallback(async () => {
    const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0)
    if (totalMinutes <= 0 || saving) return

    setSaving(true)

    // Optimistic update
    const currentTask = tasks.find((t) => t.id === taskId)
    const currentTotal = currentTask?.total_tracked_minutes ?? 0
    updateTaskOptimistic(taskId, {
      total_tracked_minutes: currentTotal + totalMinutes,
    })

    onClose()

    try {
      await addTimeEntry(taskId, totalMinutes, description || null, date)
      addToast('Time entry added', 'success')
    } catch (err) {
      // Revert optimistic update
      updateTaskOptimistic(taskId, {
        total_tracked_minutes: currentTotal,
      })
      const message =
        err instanceof Error ? err.message : 'Failed to add time entry'
      addToast(message, 'error')
    }
  }, [hours, minutes, saving, tasks, taskId, updateTaskOptimistic, onClose, description, date, addToast])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/15" />
      <div
        ref={popupRef}
        className="relative bg-white rounded-xl shadow-2xl border border-gray-100 p-5 w-[340px]"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13px] font-semibold text-gray-800 flex items-center gap-1.5">
            <ClockIcon size={13} /> Add Time
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XIcon />
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mb-3 truncate">{taskTitle}</p>

        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <label className="block text-[10px] text-gray-500 mb-1 font-medium">
              HOURS
            </label>
            <input
              ref={hoursRef}
              type="number"
              min="0"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="0"
              className="w-full border border-gray-200 rounded-lg px-2.5 py-[7px] text-[13px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] text-gray-500 mb-1 font-medium">
              MINUTES
            </label>
            <input
              type="number"
              min="0"
              max="59"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="0"
              className="w-full border border-gray-200 rounded-lg px-2.5 py-[7px] text-[13px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] text-gray-500 mb-1 font-medium">
              DATE
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-1.5 py-[7px] text-[11px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-[10px] text-gray-500 mb-1 font-medium">
            DESCRIPTION
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What did you work on?"
            className="w-full border border-gray-200 rounded-lg px-2.5 py-[7px] text-[13px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#1a1a2e] text-white rounded-lg py-[8px] text-[12px] font-medium hover:bg-[#252540] transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Time Entry'}
        </button>
      </div>
    </div>
  )
}
