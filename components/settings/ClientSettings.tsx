'use client'

import { useState } from 'react'
import type { Client } from '@/types/app.types'
import { createClientAction, updateClient, deleteClient } from '@/lib/api/clients'
import { TrashIcon } from '@/components/ui/Icons'
import { fmt } from '@/lib/utils'

interface ClientSettingsProps {
  initialClients: Client[]
}

export function ClientSettings({ initialClients }: ClientSettingsProps) {
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6b7280')
  const [newPrepaid, setNewPrepaid] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!newName.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const prepaidMinutes = (parseInt(newPrepaid) || 0) * 60
      const created = await createClientAction({
        name: newName.trim(),
        color: newColor,
        prepaid_total_minutes: prepaidMinutes,
      })
      setClients(prev => [...prev, created])
      setNewName('')
      setNewPrepaid('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this client? Tasks will keep their data but lose the client assignment.')) return
    setError(null)
    try {
      await deleteClient(id)
      setClients(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client')
    }
  }

  const startEdit = (client: Client) => {
    setEditingId(client.id)
    setEditName(client.name)
  }

  const saveEdit = async (id: string) => {
    if (!editName.trim()) {
      setEditingId(null)
      return
    }
    try {
      const updated = await updateClient(id, { name: editName.trim() })
      setClients(prev => prev.map(c => c.id === id ? updated : c))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client')
    }
    setEditingId(null)
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-lg">{error}</div>
      )}

      {clients.map(client => (
        <div key={client.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
          <span
            className="w-3 h-3 rounded shrink-0"
            style={{ backgroundColor: client.color }}
          />
          {editingId === client.id ? (
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={() => saveEdit(client.id)}
              onKeyDown={e => {
                if (e.key === 'Enter') saveEdit(client.id)
                if (e.key === 'Escape') setEditingId(null)
              }}
              autoFocus
              className="flex-1 text-[12px] font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
          ) : (
            <button
              onClick={() => startEdit(client)}
              className="flex-1 text-left text-[12px] font-medium text-gray-700 dark:text-gray-300 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors"
            >
              {client.name}
            </button>
          )}
          {client.prepaid_total_minutes > 0 && (
            <span className="text-[9px] bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 px-1 py-0.5 rounded font-semibold">
              {fmt(client.prepaid_remaining_minutes)}/{fmt(client.prepaid_total_minutes)}
            </span>
          )}
          <button
            onClick={() => handleDelete(client.id)}
            className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <TrashIcon />
          </button>
        </div>
      ))}

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
          placeholder="Client name..."
          className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-[6px] text-[12px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
        <input
          value={newPrepaid}
          onChange={e => setNewPrepaid(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Prep. h"
          className="w-[60px] border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-[6px] text-[12px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
        <button
          onClick={handleAdd}
          disabled={loading || !newName.trim()}
          className="bg-[#1a1a2e] dark:bg-gray-700 text-white px-2.5 py-[6px] rounded-lg text-[11px] font-medium hover:bg-[#252540] dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}
