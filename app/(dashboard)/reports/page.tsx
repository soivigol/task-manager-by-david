import { getReport } from '@/lib/api/reports'
import { getClients } from '@/lib/api/clients'
import { getReportDateRange } from '@/lib/report-dates'
import { ReportView } from '@/components/reports/ReportView'

export default async function ReportsPage() {
  const { startDate, endDate } = getReportDateRange(1)

  const [initialReport, clients] = await Promise.all([
    getReport(startDate, endDate),
    getClients(),
  ])

  return <ReportView initialReport={initialReport} clients={clients} />
}
