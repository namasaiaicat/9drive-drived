import { type DragEvent, useRef } from 'react'
import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  Cloud,
  FileText,
  ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react'
import { formatBytes } from '@/lib/api'
import { Button } from '@/components/ui/button'

export type BatchItem = {
  id: string
  file: File
  status: 'idle' | 'processing' | 'completed' | 'error'
  progress?: number
  statusMessage?: string
  resultBlob?: Blob
  thumbnailUrl?: string
}

type Props = {
  items: BatchItem[]
  onAddFiles: (files: File[]) => void
  onRemoveItem: (id: string) => void
  onReorder?: (items: BatchItem[]) => void
  onClear: () => void
  onOpenDrivePicker: () => void
  accept?: string
  allowReorder?: boolean
  disabled?: boolean
}

export function BatchFileQueue({
  items,
  onAddFiles,
  onRemoveItem,
  onReorder,
  onClear,
  onOpenDrivePicker,
  accept,
  allowReorder = false,
  disabled = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    if (disabled) return
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      onAddFiles(droppedFiles)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(Array.from(e.target.files))
      e.target.value = ''
    }
  }

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (!onReorder) return
    const newItems = [...items]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newItems.length) return
    const temp = newItems[index]
    newItems[index] = newItems[targetIndex]
    newItems[targetIndex] = temp
    onReorder(newItems)
  }

  return (
    <div className="space-y-3.5">
      {/* Upload Drop Zone + Drive Action */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="flex flex-col items-center justify-center p-6 border border-dashed border-[#E0E3E7] dark:border-[#36373A] rounded-2xl bg-[#F8FAFD] dark:bg-[#1E1F20] hover:border-[#0B57D0] transition-colors text-center"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="w-10 h-10 rounded-full bg-[#EDF2FC] dark:bg-[#28292A] text-[#0B57D0] dark:text-[#A8C7FA] flex items-center justify-center mb-2.5">
          <Upload className="w-5 h-5" />
        </div>

        <h3 className="text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3] mb-1">
          Tarik & lepaskan berkas ke sini, atau pilih dari sumber
        </h3>
        <p className="text-xs text-[#747775] dark:text-[#8E918F] mb-4">
          Mendukung banyak file sekaligus untuk diproses secara batch
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <Button
            type="button"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="h-9 px-4 text-xs font-medium rounded-full bg-[#0B57D0] hover:bg-[#0B57D0]/90 text-white shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Unggah dari Perangkat
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenDrivePicker}
            disabled={disabled}
            className="h-9 px-4 text-xs font-medium rounded-full border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#28292A] text-[#1F1F1F] dark:text-[#E3E3E3] hover:bg-[#F0F4F9] dark:hover:bg-[#333537]"
          >
            <Cloud className="w-3.5 h-3.5 mr-1.5 text-[#0B57D0] dark:text-[#A8C7FA]" />
            Ambil dari 9Drive
          </Button>
        </div>
      </div>

      {/* Queue Header & Clear */}
      {items.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
              Daftar Antrean ({items.length})
            </span>
            <span className="text-xs text-[#747775] dark:text-[#8E918F]">
              Total: {formatBytes(items.reduce((sum, item) => sum + item.file.size, 0))}
            </span>
          </div>

          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="text-xs text-[#B3261E] dark:text-[#F2B8B5] hover:underline flex items-center gap-1 font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Kosongkan antrean</span>
          </button>
        </div>
      )}

      {/* List of Queue Items */}
      {items.length > 0 && (
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {items.map((item, index) => {
            const isImage = item.file.type.startsWith('image/')
            const isPdf = item.file.type.includes('pdf') || item.file.name.toLowerCase().endsWith('.pdf')

            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#1E1F20] border border-[#E0E3E7] dark:border-[#36373A]"
              >
                {/* Thumbnail / Icon + Name */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#F0F4F9] dark:bg-[#28292A] flex items-center justify-center shrink-0 border border-[#E0E3E7]/60 dark:border-[#36373A]/60">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : isImage ? (
                      <ImageIcon className="w-5 h-5 text-[#0B57D0]" />
                    ) : isPdf ? (
                      <FileText className="w-5 h-5 text-[#D93025]" />
                    ) : (
                      <FileText className="w-5 h-5 text-[#747775]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3] truncate">
                      {item.file.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[#747775] dark:text-[#8E918F]">
                        {formatBytes(item.file.size)}
                      </span>
                      {item.statusMessage && (
                        <span className="text-xs text-[#0B57D0] dark:text-[#A8C7FA] truncate">
                          • {item.statusMessage}
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {item.status === 'processing' && item.progress !== undefined && (
                      <div className="w-full h-1 bg-[#E0E3E7] dark:bg-[#36373A] rounded-full overflow-hidden mt-1.5">
                        <div
                          className="h-full bg-[#0B57D0] transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Badge + Reorder & Delete */}
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {/* Status Indicator */}
                  {item.status === 'idle' && (
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      Siap
                    </span>
                  )}
                  {item.status === 'processing' && (
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#C2E7FF] text-[#001D35] dark:bg-[#004A77] dark:text-[#C2E7FF] flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {item.progress ?? 0}%
                    </span>
                  )}
                  {item.status === 'completed' && (
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#E6F4EA] text-[#0F9D58] dark:bg-[#0F9D58]/20 dark:text-[#6DD58C] flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Selesai
                    </span>
                  )}
                  {item.status === 'error' && (
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#FCE8E6] text-[#D93025] dark:bg-[#D93025]/20 dark:text-[#F2B8B5] flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      Gagal
                    </span>
                  )}

                  {/* Reorder Buttons */}
                  {allowReorder && onReorder && items.length > 1 && (
                    <div className="flex items-center gap-0.5 border-l border-[#E0E3E7] dark:border-[#36373A] pl-1 ml-1">
                      <button
                        type="button"
                        onClick={() => moveItem(index, 'up')}
                        disabled={index === 0 || disabled}
                        className="p-1 rounded text-[#747775] hover:bg-[#F0F4F9] dark:hover:bg-[#28292A] disabled:opacity-30"
                        title="Geser ke atas"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(index, 'down')}
                        disabled={index === items.length - 1 || disabled}
                        className="p-1 rounded text-[#747775] hover:bg-[#F0F4F9] dark:hover:bg-[#28292A] disabled:opacity-30"
                        title="Geser ke bawah"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    disabled={disabled}
                    className="p-1.5 rounded-full text-[#747775] hover:text-[#B3261E] hover:bg-[#F0F4F9] dark:hover:bg-[#28292A] transition-colors"
                    title="Hapus dari antrean"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
