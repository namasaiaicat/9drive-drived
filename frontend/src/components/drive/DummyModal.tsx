import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DummyModal({
  open,
  title,
  description,
  children,
  onClose,
  className,
}: {
  open: boolean
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
  className?: string
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Subtle Material Scrim */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] animate-m3-scrim"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Material 3 Dialog Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          'relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-[28px] border border-[#E0E3E7] bg-white p-6 shadow-2xl animate-m3-dialog sm:max-w-lg dark:border-[#36373A] dark:bg-[#1E1F20]',
          className
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="modal-title" className="text-xl font-normal text-[#1F1F1F] dark:text-[#E3E3E3]">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-[#444746] dark:text-[#C4C7C5]">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10 transition-transform duration-200 hover:rotate-90 active:scale-90"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}
