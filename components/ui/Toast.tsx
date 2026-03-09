'use client'

import { useEffect, useRef } from 'react'
import { useAppStore } from '@/lib/store/app-store'
import { XIcon } from '@/components/ui/Icons'

const AUTO_DISMISS_MS = 3500

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[500] flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} id={t.id} message={t.message} type={t.type} />
      ))}
    </div>
  )
}

function ToastItem({
  id,
  message,
  type,
}: {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}) {
  const removeToast = useAppStore((s) => s.removeToast)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      removeToast(id)
    }, AUTO_DISMISS_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [id, removeToast])

  const bgColor =
    type === 'error'
      ? 'bg-red-600'
      : type === 'success'
        ? 'bg-[#1a1a2e]'
        : 'bg-gray-700'

  return (
    <div
      className={`${bgColor} text-white text-[13px] px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-3 animate-toast-in max-w-[380px]`}
    >
      <span className="flex-1">{message}</span>
      <button
        onClick={() => removeToast(id)}
        className="shrink-0 text-white/70 hover:text-white transition-colors"
      >
        <XIcon size={12} />
      </button>
    </div>
  )
}
