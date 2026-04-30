'use client'

import { useState, useCallback } from 'react'
import { getReport } from '@/lib/api/reports'
import type { ReportData } from '@/lib/api/reports'
import type { Client } from '@/types/app.types'
import { fmt } from '@/lib/utils'
import { ReportsIcon, ChevronIcon } from '@/components/ui/Icons'

interface ReportViewProps {
  initialReport: ReportData
  clients: Client[]
}

function getMonthRange(year: number, month: number) {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function ReportView({ initialReport, clients }: ReportViewProps) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [report, setReport] = useState<ReportData>(initialReport)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = useCallback(
    async (y: number, m: number, cid: string) => {
      setLoading(true)
      setError(null)
      try {
        const { start, end } = getMonthRange(y, m)
        const data = await getReport(
          start,
          end,
          cid === 'all' ? undefined : cid
        )
        setReport(data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load report'
        )
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const handlePrevMonth = useCallback(() => {
    let newMonth = month - 1
    let newYear = year
    if (newMonth < 0) {
      newMonth = 11
      newYear = year - 1
    }
    setMonth(newMonth)
    setYear(newYear)
    fetchReport(newYear, newMonth, clientFilter)
  }, [month, year, clientFilter, fetchReport])

  const handleNextMonth = useCallback(() => {
    let newMonth = month + 1
    let newYear = year
    if (newMonth > 11) {
      newMonth = 0
      newYear = year + 1
    }
    setMonth(newMonth)
    setYear(newYear)
    fetchReport(newYear, newMonth, clientFilter)
  }, [month, year, clientFilter, fetchReport])

  const handleClientChange = useCallback(
    (cid: string) => {
      setClientFilter(cid)
      fetchReport(year, month, cid)
    },
    [year, month, fetchReport]
  )

  const handleExportPDF = useCallback(async () => {
    // Dynamic import to avoid SSR issues with @react-pdf/renderer
    const { generateReportPDF } = await import(
      '@/components/reports/ReportPDF'
    )
    const monthLabel = `${MONTH_NAMES[month]} ${year}`
    await generateReportPDF(report, monthLabel)
  }, [report, month, year])

  return (
    <div className="p-4 max-w-[640px]">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/80 dark:border-gray-800 p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">
              Time Report
            </h2>
            {/* Month selector */}
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={handlePrevMonth}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-0.5"
                title="Previous month"
              >
                <ChevronIcon size={10} />
              </button>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium min-w-[110px] text-center">
                {MONTH_NAMES[month]} {year}
              </p>
              <button
                onClick={handleNextMonth}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-0.5 rotate-180"
                title="Next month"
              >
                <ChevronIcon size={10} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={clientFilter}
              onChange={(e) => handleClientChange(e.target.value)}
              className="text-[11px] border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-[4px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            >
              <option value="all">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1 bg-[#1a1a2e] dark:bg-gray-700 text-white text-[11px] font-medium px-2.5 py-[4px] rounded-lg hover:bg-[#252540] dark:hover:bg-gray-600 transition-colors"
            >
              <ReportsIcon size={12} /> PDF
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 py-4 text-center">
            Loading...
          </p>
        )}

        {/* Error state */}
        {!loading && error && (
          <p className="text-[11px] text-red-500 py-4 text-center">
            {error}
          </p>
        )}

        {/* Report content */}
        {!loading && report.clients.length === 0 && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 py-4 text-center">
            No time logged for this period
          </p>
        )}

        {!loading &&
          report.clients.map((cl) => (
            <div key={cl.id} className="mb-3">
              {/* Client header */}
              <div className="flex items-center justify-between py-1.5 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-[8px] h-[8px] rounded"
                    style={{ backgroundColor: cl.color }}
                  />
                  <span className="text-[12px] font-semibold text-gray-800 dark:text-gray-200">
                    {cl.name}
                  </span>
                </div>
                <span className="text-[12px] font-mono font-bold text-gray-700 dark:text-gray-300">
                  {fmt(cl.totalMinutes)}
                </span>
              </div>

              {/* Tasks */}
              {cl.tasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-0.5 pl-4 text-[11px]"
                >
                  <span className="text-gray-600 dark:text-gray-400">{t.title}</span>
                  <span className="text-gray-400 dark:text-gray-500 font-mono">
                    {fmt(t.totalMinutes)}
                  </span>
                </div>
              ))}

              {/* Prepaid balance */}
              {cl.prepaid_total_minutes > 0 && (
                <div
                  className={`pl-4 pt-0.5 text-[10px] ${
                    cl.prepaid_remaining_minutes < 0
                      ? 'text-red-500'
                      : 'text-cyan-600 dark:text-cyan-400'
                  }`}
                >
                  Prepaid: {fmt(cl.prepaid_remaining_minutes)} /{' '}
                  {fmt(cl.prepaid_total_minutes)}
                </div>
              )}
            </div>
          ))}

        {/* Grand total */}
        {!loading && report.clients.length > 0 && (
          <div className="flex items-center justify-between pt-3 mt-1 border-t-2 border-gray-900 dark:border-gray-100">
            <span className="text-[12px] font-bold text-gray-900 dark:text-gray-100">TOTAL</span>
            <span className="text-[12px] font-mono font-bold text-gray-900 dark:text-gray-100">
              {fmt(report.grandTotal)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
