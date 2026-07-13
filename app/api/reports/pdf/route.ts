import { createClient } from '@/lib/supabase/server'
import type { ReportData } from '@/lib/api/reports'
import { formatReportFilename } from '@/lib/report-dates'
import { renderReportPDFBuffer } from '@/lib/reports/render-report-pdf'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  let report: ReportData
  try {
    report = (await request.json()) as ReportData
  } catch {
    return new Response('Invalid request body', { status: 400 })
  }

  if (!report?.startDate || !report?.endDate || !Array.isArray(report.clients)) {
    return new Response('Invalid report data', { status: 400 })
  }

  try {
    const buffer = await renderReportPDFBuffer(report)
    const filename = formatReportFilename(report.startDate, report.endDate)

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to generate PDF'
    return new Response(message, { status: 500 })
  }
}
