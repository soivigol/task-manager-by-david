'use client'

import { useCallback } from 'react'
import type { Status } from '@/types/app.types'
import { useAppStore } from '@/lib/store/app-store'
import { changeTaskStatus } from '@/lib/api/tasks'

interface StatusPickerProps {
  currentStatusId: string
  taskId: string
  statuses: Status[]
  pos: { x: number; y: number }
}

export function StatusPicker({
  currentStatusId,
  taskId,
  statuses,
  pos,
}: StatusPickerProps) {
  const closePicker = useAppStore((s) => s.closePicker)
  const updateTaskOptimistic = useAppStore((s) => s.updateTaskOptimistic)
  const addToast = useAppStore((s) => s.addToast)

  const handleChange = useCallback(
    async (newStatusId: string) => {
      if (newStatusId === currentStatusId) {
        closePicker()
        return
      }

      // Optimistic update
      updateTaskOptimistic(taskId, { status_id: newStatusId })
      closePicker()

      try {
        const result = await changeTaskStatus(taskId, newStatusId)
        if (result.toastMessage) {
          addToast(result.toastMessage, 'success')
        }
      } catch (err) {
        // Revert on error
        updateTaskOptimistic(taskId, { status_id: currentStatusId })
        addToast(
          err instanceof Error ? err.message : 'Failed to change status',
          'error'
        )
      }
    },
    [taskId, currentStatusId, closePicker, updateTaskOptimistic, addToast]
  )

  return (
    <div
      className="fixed z-[300] bg-white rounded-lg shadow-xl border border-gray-200 py-1"
      style={{ top: pos.y, left: pos.x, minWidth: 145 }}
      onClick={(e) => e.stopPropagation()}
    >
      {statuses.map((s) => (
        <button
          key={s.id}
          onClick={() => handleChange(s.id)}
          className={`w-full flex items-center gap-2 px-3 py-[5px] text-[12px] hover:bg-gray-50 ${
            s.id === currentStatusId ? 'bg-gray-50 font-semibold' : ''
          }`}
        >
          <span
            className="w-[9px] h-[9px] rounded-full shrink-0"
            style={{ backgroundColor: s.color }}
          />
          <span className="text-gray-700">{s.name}</span>
          {s.id === currentStatusId && (
            <span className="ml-auto text-gray-400 text-[10px]">&#10003;</span>
          )}
        </button>
      ))}
    </div>
  )
}
