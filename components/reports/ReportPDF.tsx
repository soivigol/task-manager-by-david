'use client'

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
} from '@react-pdf/renderer'
import type { ReportData } from '@/lib/api/reports'

// Register DM Sans font for PDF
Font.register({
  family: 'DM Sans',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAop1hTmf3ZGMZpg.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAkJ1hTmf3ZGMZpg.ttf',
      fontWeight: 600,
    },
    {
      src: 'https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAuZ1hTmf3ZGMZpg.ttf',
      fontWeight: 700,
    },
  ],
})

function fmtPdf(minutes: number): string {
  if (!minutes) return '—'
  const h = Math.floor(Math.abs(minutes) / 60)
  const r = Math.abs(minutes) % 60
  let s = ''
  if (h > 0) s += h + 'h'
  if (r > 0) s += (s ? ' ' : '') + r + 'm'
  return minutes < 0 ? '-' + s : s
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'DM Sans',
    fontSize: 10,
    color: '#1f2937',
  },
  header: {
    marginBottom: 24,
    borderBottom: '2px solid #1a1a2e',
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
  },
  clientSection: {
    marginBottom: 16,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
    borderBottom: '1px solid #e5e7eb',
    marginBottom: 4,
  },
  clientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clientDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  clientName: {
    fontSize: 11,
    fontWeight: 600,
  },
  clientTotal: {
    fontSize: 11,
    fontWeight: 700,
    fontFamily: 'Courier',
  },
  taskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 14,
    paddingVertical: 1,
  },
  taskTitle: {
    fontSize: 9,
    color: '#4b5563',
  },
  taskTime: {
    fontSize: 9,
    color: '#9ca3af',
    fontFamily: 'Courier',
  },
  prepaid: {
    paddingLeft: 14,
    fontSize: 8,
    marginTop: 2,
  },
  prepaidPositive: {
    color: '#0891b2',
  },
  prepaidNegative: {
    color: '#ef4444',
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '2px solid #111827',
    paddingTop: 8,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: 700,
  },
  grandTotalValue: {
    fontSize: 11,
    fontWeight: 700,
    fontFamily: 'Courier',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 7,
    color: '#9ca3af',
  },
})

interface ReportPDFDocumentProps {
  report: ReportData
  monthLabel: string
}

function ReportPDFDocument({ report, monthLabel }: ReportPDFDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Dev Task — Time Report
          </Text>
          <Text style={styles.headerSubtitle}>{monthLabel}</Text>
        </View>

        {/* Client sections */}
        {report.clients.map((cl) => (
          <View key={cl.id} style={styles.clientSection}>
            <View style={styles.clientHeader}>
              <View style={styles.clientNameRow}>
                <View
                  style={[styles.clientDot, { backgroundColor: cl.color }]}
                />
                <Text style={styles.clientName}>{cl.name}</Text>
              </View>
              <Text style={styles.clientTotal}>
                {fmtPdf(cl.totalMinutes)}
              </Text>
            </View>

            {cl.tasks.map((t) => (
              <View key={t.id} style={styles.taskRow}>
                <Text style={styles.taskTitle}>{t.title}</Text>
                <Text style={styles.taskTime}>
                  {fmtPdf(t.totalMinutes)}
                </Text>
              </View>
            ))}

            {cl.prepaid_total_minutes > 0 && (
              <Text
                style={[
                  styles.prepaid,
                  cl.prepaid_remaining_minutes < 0
                    ? styles.prepaidNegative
                    : styles.prepaidPositive,
                ]}
              >
                Prepaid: {fmtPdf(cl.prepaid_remaining_minutes)} /{' '}
                {fmtPdf(cl.prepaid_total_minutes)}
              </Text>
            )}
          </View>
        ))}

        {/* Grand total */}
        {report.clients.length > 0 && (
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>TOTAL</Text>
            <Text style={styles.grandTotalValue}>
              {fmtPdf(report.grandTotal)}
            </Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by Dev Task
        </Text>
      </Page>
    </Document>
  )
}

export async function generateReportPDF(
  report: ReportData,
  monthLabel: string
) {
  const blob = await pdf(
    <ReportPDFDocument report={report} monthLabel={monthLabel} />
  ).toBlob()

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `dev-task-report-${monthLabel.replace(/\s+/g, '-').toLowerCase()}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
