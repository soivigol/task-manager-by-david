'use client'

import { useEffect, useCallback, useRef } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  headerRight?: React.ReactNode
  footer?: React.ReactNode
  size?: 'default' | 'small'
}

export function Modal({
  title,
  onClose,
  children,
  headerRight,
  footer,
  size = 'default',
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleEsc)
    // Prevent body scroll when modal is open
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = prev
    }
  }, [handleEsc])

  // Focus the content on mount
  useEffect(() => {
    contentRef.current?.focus()
  }, [])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  const maxW = size === 'small' ? 'max-w-[420px]' : 'max-w-[540px]'

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[400] flex items-center justify-center"
    >
      <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-[1px]" />
      <div
        ref={contentRef}
        tabIndex={-1}
        className={`relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full ${maxW} max-h-[84vh] flex flex-col mx-4 outline-none`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">{title}</h2>
          <div className="flex items-center gap-0.5">
            {headerRight}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
