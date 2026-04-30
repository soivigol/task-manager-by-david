'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store/app-store'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((s) => s.theme)
  const hydrateFromStorage = useAppStore((s) => s.hydrateFromStorage)

  useEffect(() => {
    hydrateFromStorage()
  }, [hydrateFromStorage])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return <>{children}</>
}
