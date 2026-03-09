'use client'

import { Modal } from './Modal'

interface ConfirmDialogProps {
  title: string
  message: string
  note?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  note,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      size="small"
      footer={
        <>
          <button
            onClick={onCancel}
            className="px-3 py-[6px] text-[12px] text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-[6px] text-[12px] font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="px-5 py-4">
        <p className="text-[13px] text-gray-700">{message}</p>
        {note && (
          <p className="text-[11px] text-gray-400 mt-2">{note}</p>
        )}
      </div>
    </Modal>
  )
}
