import { useEffect, useState, type ReactNode } from 'react'
import { API_URL } from '@/lib/api'
import { BrandLogo } from '@/components/drive/BrandLogo'

/**
 * Waits for the backend server to become available before rendering children.
 * Shows a minimal branded loading screen while polling /health.
 * If the server is already running (e.g. page refresh), this resolves instantly.
 */
export function ServerHealthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    let cancelled = false
    const startTime = Date.now()

    // Update elapsed time every second for tiered status messages
    const interval = setInterval(() => {
      if (!cancelled) setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    async function poll() {
      while (!cancelled && Date.now() - startTime < 30_000) {
        try {
          const res = await fetch(`${API_URL}/health`, {
            signal: AbortSignal.timeout(2000),
          })
          if (res.ok) {
            if (!cancelled) setReady(true)
            return
          }
        } catch {}
        // Poll every 400ms for snappy response once server is up
        await new Promise((r) => setTimeout(r, 400))
      }
    }

    poll()
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  if (ready) return <>{children}</>

  // Tiered status message — non-technical, reassuring
  const statusMessage =
    elapsed < 5
      ? 'Mempersiapkan...'
      : elapsed < 15
      ? 'Sedang menyiapkan server...'
      : elapsed < 30
      ? 'Menunggu koneksi server...'
      : 'Server belum dapat dihubungi. Periksa koneksi, lalu coba lagi.'

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#F8FAFD] dark:bg-[#131314] transition-opacity duration-300">
      {/* Logo with subtle pulse animation */}
      <div className="mb-5 animate-[healthgate-pulse_2s_ease-in-out_infinite]">
        <BrandLogo className="h-16 w-16" />
      </div>

      {/* App name */}
      <h1 className="text-[22px] font-normal tracking-tight text-[#1F1F1F] dark:text-[#E3E3E3] mb-3">
        9Drive
      </h1>

      {/* Status message */}
      <p role={elapsed >= 30 ? 'alert' : 'status'} className="px-6 text-center text-sm text-[#444746] dark:text-[#C4C7C5] mb-6">
        {statusMessage}
      </p>

      {/* Material 3 linear progress indicator (indeterminate) */}
      <div className="w-48 h-1 rounded-full bg-[#E0E3E7] dark:bg-[#36373A] overflow-hidden">
        <div className="h-full w-1/3 rounded-full bg-[#0B57D0] dark:bg-[#A8C7FA] animate-[healthgate-progress_1.5s_ease-in-out_infinite]" />
      </div>

      {/* Timeout hint after 30s */}
      {elapsed >= 30 && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 rounded-full bg-[#0B57D0] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0842A0] active:scale-95 transition-all dark:bg-[#A8C7FA] dark:text-[#001D35] dark:hover:bg-[#D3E3FD]"
        >
          Muat Ulang
        </button>
      )}
    </div>
  )
}
