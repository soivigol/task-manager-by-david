import { getReport } from '@/lib/api/reports'
import { getClients } from '@/lib/api/clients'
import { ReportView } from '@/components/reports/ReportView'

export default async function ReportsPage() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const [initialReport, clients] = await Promise.all([
    getReport(startDate, endDate),
    getClients(),
  ])

  return <ReportView initialReport={initialReport} clients={clients} />
}
