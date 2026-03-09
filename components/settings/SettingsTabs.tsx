'use client'

import { useState } from 'react'
import type { Status, Client } from '@/types/app.types'
import { StatusSettings } from './StatusSettings'
import { ClientSettings } from './ClientSettings'

interface SettingsTabsProps {
  statuses: Status[]
  clients: Client[]
  taskCountByStatus: Record<string, number>
}

export function SettingsTabs({ statuses, clients, taskCountByStatus }: SettingsTabsProps) {
  const [tab, setTab] = useState<'statuses' | 'clients'>('statuses')

  return (
    <div className="max-w-[460px]">
      <div className="flex border-b border-gray-200 mb-4">
        {(['statuses', 'clients'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-[11px] font-semibold capitalize tracking-wide transition-colors ${
              tab === t
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'statuses' && (
        <StatusSettings
          initialStatuses={statuses}
          taskCountByStatus={taskCountByStatus}
        />
      )}
      {tab === 'clients' && (
        <ClientSettings initialClients={clients} />
      )}
    </div>
  )
}
