'use client'

import { useState } from 'react'
import type { ClientWithStats } from '@/lib/api/clients'
import { ClientCard } from './ClientCard'

interface ClientsPageClientProps {
  initialClients: ClientWithStats[]
}

export function ClientsPageClient({ initialClients }: ClientsPageClientProps) {
  const [clients, setClients] = useState(initialClients)

  const handleOveragePaid = (clientId: string) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId ? { ...c, prepaid_remaining_minutes: 0 } : c
      )
    )
  }

  if (clients.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400 text-[13px]">
        No clients yet. Go to Settings to add clients.
      </div>
    )
  }

  return (
    <div className="p-4 max-w-[640px]">
      {clients.map((client) => (
        <ClientCard
          key={client.id}
          client={client}
          onOveragePaid={handleOveragePaid}
        />
      ))}
    </div>
  )
}
