'use client'

import { useState, useCallback } from 'react'
import { getReport } from '@/lib/api/reports'
import type { ReportData } from '@/lib/api/reports'
import type { Client } from '@/types/app.types'
import { fmt } from '@/lib/utils'
import {
  REPORT_PERIOD_OPTIONS,
  formatReportEntryDate,
  formatReportFilename,
  formatReportPeriodLabel,
  getReportDateRange,
  type ReportPeriodMonths,
} from '@/lib/report-dates'
import { useAppStore } from '@/lib/store/app-store'
import { ReportsIcon } from '@/components/ui/Icons'

interface ReportViewProps {
  initialReport: ReportData
  clients: Client[]
}

export function ReportView({ initialReport, clients }: ReportViewProps) {
  const addToast = useAppStore((s) => s.addToast)
  const [periodMonths, setPeriodMonths] = useState<ReportPeriodMonths>(1)
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [report, setReport] = useState<ReportData>(initialReport)
  const [loading, setLoading] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const periodLabel = formatReportPeriodLabel(report.startDate, report.endDate)

  const fetchReport = useCallback(
    async (months: ReportPeriodMonths, cid: string) => {
      setLoading(true)
      setError(null)
      try {
        const { startDate, endDate } = getReportDateRange(months)
        const data = await getReport(
          startDate,
          endDate,
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

  const handlePeriodChange = useCallback(
    (months: ReportPeriodMonths) => {
      setPeriodMonths(months)
      fetchReport(months, clientFilter)
    },
    [clientFilter, fetchReport]
  )

  const handleClientChange = useCallback(
    (cid: string) => {
      setClientFilter(cid)
      fetchReport(periodMonths, cid)
    },
    [periodMonths, fetchReport]
  )

  const handleExportPDF = useCallback(async () => {
    setExportingPdf(true)
    try {
      const response = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = formatReportFilename(report.startDate, report.endDate)
      document.body.appendChild(link)
      link.click()
      setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }, 100)

      addToast('PDF downloaded', 'success')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to generate PDF'
      addToast(message, 'error')
    } finally {
      setExportingPdf(false)
    }
  }, [report, addToast])

  return (
    <div className="p-4 max-w-[640px]">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/80 dark:border-gray-800 p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">
              Time Report
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-1">
              {periodLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={periodMonths}
              onChange={(e) =>
                handlePeriodChange(Number(e.target.value) as ReportPeriodMonths)
              }
              className="text-[11px] border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-[4px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            >
              {REPORT_PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
              disabled={exportingPdf || loading || report.clients.length === 0}
              className="flex items-center gap-1 bg-[#1a1a2e] dark:bg-gray-700 text-white text-[11px] font-medium px-2.5 py-[4px] rounded-lg hover:bg-[#252540] dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ReportsIcon size={12} />
              {exportingPdf ? 'Exporting...' : 'PDF'}
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

              {/* Time entries */}
              {cl.tasks
                .flatMap((t) =>
                  t.entries.map((entry) => ({
                    ...entry,
                    title: t.title,
                  }))
                )
                .sort((a, b) => a.tracked_date.localeCompare(b.tracked_date))
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="grid grid-cols-[52px_minmax(0,1fr)_48px] gap-2 items-center py-0.5 pl-4 text-[11px]"
                  >
                    <span className="text-gray-400 dark:text-gray-500 font-mono">
                      {formatReportEntryDate(entry.tracked_date)}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 truncate">
                      {entry.title}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500 font-mono text-right">
                      {fmt(entry.minutes)}
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
