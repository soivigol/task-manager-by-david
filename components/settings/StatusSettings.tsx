'use client'

import { useState, useRef } from 'react'
import type { Status } from '@/types/app.types'
import { createStatus, updateStatus, deleteStatus } from '@/lib/api/statuses'
import { TrashIcon } from '@/components/ui/Icons'

interface StatusSettingsProps {
  initialStatuses: Status[]
  taskCountByStatus: Record<string, number>
}

export function StatusSettings({ initialStatuses, taskCountByStatus }: StatusSettingsProps) {
  const [statuses, setStatuses] = useState<Status[]>(initialStatuses)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6b7280')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const editRef = useRef<HTMLInputElement>(null)

  const handleAdd = async () => {
    if (!newName.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const created = await createStatus({ name: newName.trim(), color: newColor })
      setStatuses(prev => [...prev, created])
      setNewName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create status')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this status?')) return
    setError(null)
    try {
      const result = await deleteStatus(id)
      if (result.error) {
        setError(result.error)
        return
      }
      setStatuses(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete status')
    }
  }

  const startEdit = (status: Status) => {
    setEditingId(status.id)
    setEditName(status.name)
    setTimeout(() => editRef.current?.focus(), 50)
  }

  const saveEdit = async (id: string) => {
    if (!editName.trim()) {
      setEditingId(null)
      return
    }
    try {
      const updated = await updateStatus(id, { name: editName.trim() })
      setStatuses(prev => prev.map(s => s.id === id ? updated : s))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    }
    setEditingId(null)
  }

  const toggleClosed = async (status: Status) => {
    try {
      const updated = await updateStatus(status.id, { is_closed: !status.is_closed })
      setStatuses(prev => prev.map(s => s.id === status.id ? updated : s))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="text-[11px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
      )}

      {statuses.map(status => {
        const taskCount = taskCountByStatus[status.id] ?? 0
        return (
          <div key={status.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: status.color }}
            />
            {editingId === status.id ? (
              <input
                ref={editRef}
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={() => saveEdit(status.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveEdit(status.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                className="flex-1 text-[12px] font-medium text-gray-700 bg-white border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
              />
            ) : (
              <button
                onClick={() => startEdit(status)}
                className="flex-1 text-left text-[12px] font-medium text-gray-700 hover:text-cyan-700 transition-colors"
              >
                {status.name}
              </button>
            )}
            <button
              onClick={() => toggleClosed(status)}
              className={`text-[9px] px-1 py-0.5 rounded font-semibold cursor-pointer transition-colors ${
                status.is_closed
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
              }`}
            >
              {status.is_closed ? 'CLOSED' : 'OPEN'}
            </button>
            <button
              onClick={() => handleDelete(status.id)}
              disabled={taskCount > 0}
              className={`transition-colors ${
                taskCount > 0
                  ? 'text-gray-200 cursor-not-allowed'
                  : 'text-gray-300 hover:text-red-500'
              }`}
              title={taskCount > 0 ? `${taskCount} task(s) using this status` : 'Delete status'}
            >
              <TrashIcon />
            </button>
          </div>
        )
      })}

      <div className="flex items-center gap-2 pt-1">
        <input
          type="color"
          value={newColor}
          onChange={e => setNewColor(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border-0"
        />
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="New status..."
          className="flex-1 border border-gray-200 rounded-lg px-2.5 py-[6px] text-[12px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
        />
        <button
          onClick={handleAdd}
          disabled={loading || !newName.trim()}
          className="bg-[#1a1a2e] text-white px-2.5 py-[6px] rounded-lg text-[11px] font-medium hover:bg-[#252540] disabled:opacity-50 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}
