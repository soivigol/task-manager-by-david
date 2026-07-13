export const REPORT_PERIOD_OPTIONS = [
  { value: 1, label: 'Last month' },
  { value: 2, label: 'Last 2 months' },
  { value: 3, label: 'Last 3 months' },
  { value: 6, label: 'Last 6 months' },
  { value: 12, label: 'Last 12 months' },
] as const

export type ReportPeriodMonths =
  (typeof REPORT_PERIOD_OPTIONS)[number]['value']

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function getReportDateRange(
  months: ReportPeriodMonths,
  referenceDate = new Date()
): { startDate: string; endDate: string } {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()

  const lastDay = new Date(year, month + 1, 0).getDate()
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const startMonthDate = new Date(year, month - (months - 1), 1)
  const startYear = startMonthDate.getFullYear()
  const startMonth = startMonthDate.getMonth()
  const startDate = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-01`

  return { startDate, endDate }
}

export function formatReportPeriodLabel(
  startDate: string,
  endDate: string
): string {
  const [startYear, startMonth] = startDate.split('-').map(Number)
  const [endYear, endMonth] = endDate.split('-').map(Number)

  if (startYear === endYear && startMonth === endMonth) {
    return `${MONTH_NAMES[startMonth - 1]} ${startYear}`
  }

  if (startYear === endYear) {
    return `${MONTH_NAMES[startMonth - 1]} – ${MONTH_NAMES[endMonth - 1]} ${startYear}`
  }

  return `${MONTH_NAMES[startMonth - 1]} ${startYear} – ${MONTH_NAMES[endMonth - 1]} ${endYear}`
}

export function formatReportFilename(startDate: string, endDate: string): string {
  return `dev-task-report-${startDate}-to-${endDate}.pdf`
}

export function formatReportEntryDate(date: string): string {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}
