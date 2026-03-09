'use client'

interface PrepaidMeterProps {
  total: number
  remaining: number
}

export function PrepaidMeter({ total, remaining }: PrepaidMeterProps) {
  if (total <= 0) return null

  const used = total - remaining
  const pct = Math.min(100, (used / total) * 100)
  const isNegative = remaining < 0

  // Color: cyan (normal) -> amber (>80% used) -> red (overage/negative)
  const barColor = isNegative
    ? 'bg-red-400'
    : pct > 80
      ? 'bg-amber-400'
      : 'bg-cyan-400'

  return (
    <div className="h-[5px] bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${barColor}`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  )
}
