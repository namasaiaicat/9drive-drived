import { Loader2 } from 'lucide-react'

type Props = {
  title?: string
  message?: string
  icon?: React.ComponentType<{ className?: string; size?: number }>
  iconColor?: string
  progressPercent?: number
}

export function ToolProcessingCard({
  title = 'Sedang Memproses Berkas...',
  message = 'Mohon tunggu sebentar, berkas Anda sedang diproses langsung di browser secara aman.',
  icon: IconComponent,
  iconColor = '#0B57D0',
  progressPercent,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center p-12 sm:p-16 rounded-3xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] text-center space-y-5 animate-pulse max-w-2xl mx-auto w-full my-6 shadow-xs">
      <div
        className="w-16 h-16 rounded-2xl bg-[#EDF2FC] dark:bg-[#28292A] flex items-center justify-center transition-transform"
        style={{ color: iconColor }}
      >
        {IconComponent ? (
          <IconComponent size={32} />
        ) : (
          <Loader2 className="w-8 h-8 animate-spin" />
        )}
      </div>

      <div className="space-y-1.5 max-w-md">
        <h3 className="text-base sm:text-lg font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-[#444746] dark:text-[#C4C7C5] leading-relaxed">
          {message}
        </p>
      </div>

      {/* Google M3 Animated Linear Progress Bar */}
      <div className="w-full max-w-sm h-1.5 rounded-full bg-[#E0E3E7] dark:bg-[#36373A] overflow-hidden">
        {typeof progressPercent === 'number' ? (
          <div
            className="h-full bg-[#0B57D0] rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        ) : (
          <div className="h-full bg-[#0B57D0] rounded-full w-2/5 animate-[progress_1.4s_ease-in-out_infinite]" />
        )}
      </div>
    </div>
  )
}
