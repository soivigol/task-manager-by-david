import { renderToBuffer } from '@react-pdf/renderer'
import type { ReportData } from '@/lib/api/reports'
import { ReportPDFDocument } from '@/components/reports/ReportPDFDocument'
import { formatReportPeriodLabel } from '@/lib/report-dates'

export async function renderReportPDFBuffer(report: ReportData) {
  const periodLabel = formatReportPeriodLabel(report.startDate, report.endDate)

  return renderToBuffer(
    <ReportPDFDocument report={report} periodLabel={periodLabel} />
  )
}
