'use client'

import { useState } from 'react'
import type { ClientWithStats } from '@/lib/api/clients'
import { markOveragePaid } from '@/lib/api/clients'
import { PrepaidMeter } from './PrepaidMeter'
import { fmt } from '@/lib/utils'

interface ClientCardProps {
  client: ClientWithStats
  onOveragePaid: (clientId: string) => void
}

export function ClientCard({ client, onOveragePaid }: ClientCardProps) {
  const [markingPaid, setMarkingPaid] = useState(false)

  const hasPrepaid = client.prepaid_total_minutes > 0
  const isNegative = client.prepaid_remaining_minutes < 0

  const handleMarkPaid = async () => {
    if (markingPaid) return
    setMarkingPaid(true)
    try {
      await markOveragePaid(client.id)
      onOveragePaid(client.id)
    } catch {
      // silently fail
    } finally {
      setMarkingPaid(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 p-4 mb-2 hover:shadow-sm transition-shadow">
      {/* Header: name + total tracked */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span
            className="w-[10px] h-[10px] rounded"
            style={{ backgroundColor: client.color }}
          />
          <h3 className="text-[13px] font-semibold text-gray-800">
            {client.name}
          </h3>
          <span className="text-[10px] text-gray-400">
            {client.task_count} task{client.task_count !== 1 ? 's' : ''}
          </span>
        </div>
        <span className="text-[13px] font-mono font-semibold text-gray-700">
          {fmt(client.total_tracked_minutes)}
        </span>
      </div>

      {/* Prepaid section */}
      {hasPrepaid && (
        <div className="mt-1">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-gray-500 font-medium">Prepaid</span>
            <div className="flex items-center gap-1.5">
              <span
                className={`font-semibold ${
                  isNegative ? 'text-red-500' : 'text-cyan-600'
                }`}
              >
                {fmt(client.prepaid_remaining_minutes)} /{' '}
                {fmt(client.prepaid_total_minutes)}
              </span>
              {isNegative && (
                <button
                  onClick={handleMarkPaid}
                  disabled={markingPaid}
                  className="text-[9px] bg-red-50 text-red-600 px-1 py-0.5 rounded hover:bg-red-100 font-semibold disabled:opacity-50"
                >
                  {markingPaid ? '...' : 'Mark paid'}
                </button>
              )}
            </div>
          </div>
          <PrepaidMeter
            total={client.prepaid_total_minutes}
            remaining={client.prepaid_remaining_minutes}
          />
        </div>
      )}

      {/* Task list */}
      {client.tasks.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-0.5">
          {client.tasks.slice(0, 5).map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between text-[11px]"
            >
              <span className="text-gray-600 truncate mr-2">{t.title}</span>
              <span className="text-gray-400 font-mono shrink-0">
                {fmt(t.total_tracked_minutes)}
              </span>
            </div>
          ))}
          {client.tasks.length > 5 && (
            <p className="text-[10px] text-gray-400">
              +{client.tasks.length - 5} more
            </p>
          )}
        </div>
      )}
    </div>
  )
}
