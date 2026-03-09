import { getClientsWithStats } from '@/lib/api/clients'
import { ClientsPageClient } from '@/components/clients/ClientsPageClient'

export default async function ClientsPage() {
  const clients = await getClientsWithStats()

  return <ClientsPageClient initialClients={clients} />
}
