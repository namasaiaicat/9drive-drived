import { WifiOff, RefreshCw } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

interface OfflineScreenProps {
  onRetry?: () => void
  title?: string
  description?: string
}

export function OfflineScreen({ onRetry, title, description }: OfflineScreenProps) {
  const { language } = useLanguage()

  const defaultTitle = language === 'id' ? 'Tidak Ada Koneksi Internet' : 'No Internet Connection'
  const defaultDesc =
    language === 'id'
      ? '9Drive memerlukan koneksi internet aktif untuk berkomunikasi dengan Google Drive dan cloud storage. Silakan periksa atau nyalakan kembali Wi-Fi / jaringan internet Anda.'
      : '9Drive requires an active internet connection to communicate with Google Drive and cloud storage. Please check or reconnect your Wi-Fi or mobile network.'

  return (
    <div className="flex min-h-[400px] w-full flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#FCE8E6] text-[#C5221F] shadow-sm dark:bg-[#3C1E1E] dark:text-[#F28B82]">
        <WifiOff className="h-10 w-10 animate-pulse" />
      </div>

      <h2 className="text-xl font-semibold tracking-tight text-[#1F1F1F] dark:text-[#E3E3E3]">
        {title || defaultTitle}
      </h2>

      <p className="mt-2.5 max-w-md text-sm text-[#747775] dark:text-[#8E918F] leading-relaxed">
        {description || defaultDesc}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRetry || (() => window.location.reload())}
          className="inline-flex items-center gap-2 rounded-full bg-[#0B57D0] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#0842A0] hover:shadow active:scale-95 dark:bg-[#A8C7FA] dark:text-[#001D35] dark:hover:bg-[#D3E3FD]"
        >
          <RefreshCw className="h-4 w-4" />
          <span>{language === 'id' ? 'Coba Hubungkan Kembali' : 'Try Reconnecting'}</span>
        </button>
      </div>
    </div>
  )
}
