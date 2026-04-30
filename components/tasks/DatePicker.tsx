'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { ChevronIcon } from '@/components/ui/Icons'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface DatePickerProps {
  currentDate: string | null
  pos: { x: number; y: number }
  onSelect: (date: string) => void
  onClose: () => void
}

export function DatePicker({ currentDate, pos, onSelect, onClose }: DatePickerProps) {
  const parsed = currentDate ? new Date(currentDate + 'T00:00:00') : new Date()
  const [viewYear, setViewYear] = useState(parsed.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed.getMonth())
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDay = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7 // Mon=0

  const prevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1)
      setViewMonth(11)
    } else {
      setViewMonth((m) => m - 1)
    }
  }, [viewMonth])

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1)
      setViewMonth(0)
    } else {
      setViewMonth((m) => m + 1)
    }
  }, [viewMonth])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  const rows: React.ReactNode[] = []
  let day = 1
  for (let r = 0; r < 6 && day <= daysInMonth; r++) {
    const cells: React.ReactNode[] = []
    for (let c = 0; c < 7; c++) {
      if ((r === 0 && c < firstDay) || day > daysInMonth) {
        cells.push(<div key={`${r}-${c}`} className="w-[30px] h-[28px]" />)
      } else {
        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const isSelected = dateStr === currentDate
        const isToday = dateStr === todayStr
        cells.push(
          <button
            key={dateStr}
            onClick={() => onSelect(dateStr)}
            className={`w-[30px] h-[28px] rounded text-[11px] font-medium transition-colors ${
              isSelected
                ? 'bg-[#1a1a2e] dark:bg-gray-700 text-white'
                : isToday
                  ? 'text-cyan-600 dark:text-cyan-400 font-bold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {day}
          </button>
        )
        day++
      }
    }
    rows.push(
      <div key={r} className="flex">
        {cells}
      </div>
    )
  }

  return (
    <div
      ref={pickerRef}
      className="fixed z-[300] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3"
      style={{ top: pos.y, left: pos.x }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Month/Year header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={prevMonth}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-0.5 transition-colors"
        >
          <ChevronIcon size={10} />
        </button>
        <span className="text-[12px] font-semibold text-gray-800 dark:text-gray-200">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-0.5 transition-colors rotate-180"
        >
          <ChevronIcon size={10} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="flex mb-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="w-[30px] h-[20px] flex items-center justify-center text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      {rows}
    </div>
  )
}
