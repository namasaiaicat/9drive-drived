import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastItem {
  id: string
  message: string
  type: ToastType
  duration?: number
  action?: ToastAction
}

export interface ToastOptions {
  duration?: number
  action?: ToastAction
}

interface ToastContextType {
  toast: {
    success: (message: string, options?: ToastOptions) => void
    error: (message: string, options?: ToastOptions) => void
    info: (message: string, options?: ToastOptions) => void
    custom: (message: string, type: ToastType, options?: ToastOptions) => void
  }
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const addToast = useCallback(
    (rawMessage: string, type: ToastType = 'info', options?: ToastOptions) => {
      let message = rawMessage
      if (typeof message === 'string') {
        if (/failed to fetch|network\s*error|net::err|load failed/i.test(message)) {
          message = 'Gagal menghubungkan, tunggu sebentar...'
        }
      }

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const duration = options?.duration ?? (type === 'error' || options?.action ? 0 : 8000)

      const newToast: ToastItem = {
        id,
        message,
        type,
        duration,
        action: options?.action,
      }

      setToasts((prev) => {
        // Prevent duplicate toasts with the same message (e.g. multiple connection errors)
        if (prev.some((t) => t.message === message && t.type === type)) {
          return prev
        }
        // Keep max 3 active toasts at once to prevent clutter
        const next = [...prev, newToast]
        return next.slice(-3)
      })

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id)
        }, duration)
      }
    },
    [dismissToast]
  )

  const toast = useMemo(
    () => ({
      success: (message: string, options?: ToastOptions) => addToast(message, 'success', options),
      error: (message: string, options?: ToastOptions) => addToast(message, 'error', options),
      info: (message: string, options?: ToastOptions) => addToast(message, 'info', options),
      custom: (message: string, type: ToastType, options?: ToastOptions) =>
        addToast(message, type, options),
    }),
    [addToast]
  )

  return (
    <ToastContext.Provider value={{ toast, dismissToast }}>
      {children}
      {/* Floating Toast Container at Bottom Right */}
      <aside
        aria-live="polite"
        className="fixed inset-x-3 bottom-3 z-[90] flex max-h-[50dvh] flex-col items-end gap-2.5 overflow-y-auto pointer-events-none sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[420px]"
      >
        {toasts.map((item) => {
          return (
            <div
              key={item.id}
              role="status"
              className={cn(
                'pointer-events-auto flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-xs sm:text-sm font-normal shadow-2xl transition-all duration-200 select-none animate-m3-dialog',
                'bg-[#1E1F20] text-white border border-white/10 dark:bg-[#E3E3E3] dark:text-[#1E1F20] dark:border-black/5'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {item.type === 'success' && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#81C995] dark:text-[#137333]" />
                )}
                {item.type === 'error' && (
                  <AlertCircle className="h-4 w-4 shrink-0 text-[#F28B82] dark:text-[#C5221F]" />
                )}
                {item.type === 'info' && (
                  <Info className="h-4 w-4 shrink-0 text-[#8AB4F8] dark:text-[#1A73E8]" />
                )}
                <span className="break-words leading-snug">
                  {item.message}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-1">
                {item.action && (
                  <button
                    type="button"
                    onClick={() => {
                      item.action?.onClick()
                      dismissToast(item.id)
                    }}
                    className="text-[#8AB4F8] hover:underline font-medium text-xs dark:text-[#0B57D0]"
                  >
                    {item.action.label}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => dismissToast(item.id)}
                  aria-label="Close notification"
                  className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10 dark:hover:bg-black/10 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </aside>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
