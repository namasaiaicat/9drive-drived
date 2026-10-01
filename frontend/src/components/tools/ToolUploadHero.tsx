import { type DragEvent, useRef, useState } from 'react'
import { Cloud, Plus, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  title: string
  description: string
  acceptedFormats?: string[]
  accept?: string
  icon?: React.ComponentType<{ className?: string; size?: number }>
  iconColor?: string
  maxSizeText?: string
  multiple?: boolean
  disabled?: boolean
  onFilesSelected: (files: File[]) => void
  onOpenDrivePicker?: () => void
  className?: string
}

export function ToolUploadHero({
  title,
  description,
  acceptedFormats = [],
  accept,
  icon: IconComponent,
  iconColor = '#0B57D0',
  maxSizeText = 'Hingga 2 GB per berkas',
  multiple = false,
  disabled = false,
  onFilesSelected,
  onOpenDrivePicker,
  className = '',
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current += 1
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setIsDragging(false)

    if (disabled) return
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      onFilesSelected(multiple ? droppedFiles : [droppedFiles[0]])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      onFilesSelected(multiple ? files : [files[0]])
      e.target.value = ''
    }
  }

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center p-8 sm:p-12 rounded-3xl border-2 border-dashed transition-all duration-200 select-none text-center cursor-pointer group ${
        isDragging
          ? 'border-[#0B57D0] bg-[#C2E7FF]/20 dark:border-[#A8C7FA] dark:bg-[#004A77]/30 scale-[1.005]'
          : 'border-[#E0E3E7] bg-white hover:border-[#0B57D0] hover:bg-[#F8FAFD] dark:border-[#36373A] dark:bg-[#1E1F20] dark:hover:border-[#A8C7FA] dark:hover:bg-[#28292A]'
      } ${className}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleFileInput}
        disabled={disabled}
        className="hidden"
      />

      {/* Hero Icon */}
      <div
        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-200 ${
          isDragging ? 'scale-110' : 'group-hover:scale-105'
        } bg-[#F0F4F9] dark:bg-[#28292A]`}
        style={{ color: iconColor }}
      >
        {IconComponent ? (
          <IconComponent size={36} />
        ) : (
          <Upload className="w-8 h-8 text-[#0B57D0] dark:text-[#A8C7FA]" />
        )}
      </div>

      {/* Headline & Description */}
      <h2 className="text-base sm:text-lg font-medium text-[#1F1F1F] dark:text-[#E3E3E3] max-w-md leading-snug group-hover:text-[#0B57D0] dark:group-hover:text-[#A8C7FA] transition-colors">
        {isDragging ? 'Lepaskan berkas di sini untuk langsung memproses' : title}
      </h2>

      <p className="text-xs sm:text-sm text-[#444746] dark:text-[#C4C7C5] mt-1.5 max-w-sm leading-relaxed">
        {description}
      </p>

      <span className="text-[11px] text-[#747775] dark:text-[#8E918F] mt-2 block">
        Klik di mana saja atau seret berkas ke kotak ini
      </span>

      {/* Dual Action Buttons (Material 3 Google Blue Pill + Outlined 9Drive) */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
        <Button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            fileInputRef.current?.click()
          }}
          disabled={disabled}
          className="h-11 px-6 rounded-full text-xs sm:text-sm font-medium bg-[#0B57D0] hover:bg-[#0842A0] text-white shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Pilih dari Perangkat</span>
        </Button>

        {onOpenDrivePicker && (
          <Button
            type="button"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              onOpenDrivePicker()
            }}
            disabled={disabled}
            className="h-11 px-6 rounded-full text-xs sm:text-sm font-medium border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] text-[#1F1F1F] dark:text-[#E3E3E3] hover:bg-[#F0F4F9] dark:hover:bg-[#28292A] transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Cloud className="w-4 h-4 text-[#0B57D0] dark:text-[#A8C7FA]" />
            <span>Pilih dari 9Drive</span>
          </Button>
        )}
      </div>

      {/* Supported Formats Badge Chips & Limits Footer */}
      {(acceptedFormats.length > 0 || maxSizeText) && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-6 pt-5 border-t border-[#E0E3E7]/60 dark:border-[#36373A]/60 w-full max-w-md">
          {acceptedFormats.map((fmt) => (
            <span
              key={fmt}
              className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F0F4F9] text-[#444746] dark:bg-[#28292A] dark:text-[#C4C7C5]"
            >
              {fmt}
            </span>
          ))}
          {maxSizeText && (
            <span className="text-[11px] text-[#747775] dark:text-[#8E918F] ml-1">
              • {maxSizeText}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
