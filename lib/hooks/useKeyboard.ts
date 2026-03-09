'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store/app-store'

/**
 * Global keyboard shortcuts:
 * - Esc: close any open modal/popup (modal, StatusPicker, TimePopup)
 * - Ctrl+N / Cmd+N: open New Task modal (prevents browser default)
 */
export function useKeyboard() {
  const openTaskModal = useAppStore((s) => s.openTaskModal)
  const closePicker = useAppStore((s) => s.closePicker)
  const picker = useAppStore((s) => s.picker)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Ctrl+N / Cmd+N → open New Task modal
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        openTaskModal()
        return
      }

      // Esc → close picker if open
      // (Modal and TimePopup already handle Esc internally)
      if (e.key === 'Escape' && picker) {
        closePicker()
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [openTaskModal, closePicker, picker])
}
