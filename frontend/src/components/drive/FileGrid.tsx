import { MoreVertical, UserPlus } from 'lucide-react'
import type { MouseEvent } from 'react'
import { FileIcon } from '@/components/drive/FileIcon'
import type { FileItem } from '@/data/drive-data'
import { cn } from '@/lib/utils'

export type FileSizeScale = 'xs' | 'sm' | 'md' | 'lg'

export function FileGrid({
  files,
  selectedFileIds = new Set<string>(),
  sizeScale = 'md',
  onFileContextMenu,
  onToggleFile,
  onFileDoubleClick,
  onShare,
}: {
  files: FileItem[]
  selectedFileIds?: Set<string>
  sizeScale?: FileSizeScale
  onFileContextMenu?: (event: MouseEvent<HTMLElement>, file: FileItem) => void
  onToggleFile?: (file: FileItem) => void
  onFileDoubleClick?: (file: FileItem) => void
  onShare?: (file: FileItem) => void
}) {
  return (
    <div
      className={cn(
        'mt-3 grid gap-3',
        sizeScale === 'xs'
          ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
          : sizeScale === 'sm'
          ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
          : sizeScale === 'lg'
          ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3'
          : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4'
      )}
    >
      {files.map((file) => {
        const selected = selectedFileIds.has(file.id ?? '')
        return (
          <div
            key={file.id ?? file.name}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData('text/plain', file.id ?? '')
              event.dataTransfer.effectAllowed = 'move'
            }}
            onClick={() => onToggleFile?.(file)}
            onDoubleClick={() => onFileDoubleClick?.(file)}
            onContextMenu={(event) => onFileContextMenu?.(event, file)}
            className={cn(
              'group relative flex flex-col rounded-2xl border transition-all duration-200 ease-[cubic-bezier(0.05,0.7,0.1,1.0)] cursor-pointer select-none overflow-hidden hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]',
              selected
                ? 'border-[#0B57D0] bg-[#C2E7FF]/30 shadow-sm dark:border-[#A8C7FA] dark:bg-[#004A77]/30'
                : 'border-[#E0E3E7] bg-white hover:border-[#747775]/40 hover:bg-[#F0F4F9] dark:border-[#36373A] dark:bg-[#1E1F20] dark:hover:border-[#747775]/60 dark:hover:bg-[#28292A]'
            )}
          >
            {/* Header: File icon, name, and menu */}
            <div className="flex items-center gap-2.5 p-3 pb-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded accent-[#0B57D0] cursor-pointer"
                checked={selected}
                onChange={() => onToggleFile?.(file)}
                onClick={(event) => event.stopPropagation()}
                aria-label={`Select ${file.name}`}
              />
              <FileIcon kind={file.kind} className="h-5 w-5 shrink-0" />
              <h3
                className="flex-1 truncate text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]"
                title={file.name}
              >
                {file.name}
              </h3>
              {onShare && (
                <button
                  type="button"
                  title="Share"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#444746] opacity-0 transition-opacity hover:bg-black/5 group-hover:opacity-100 dark:text-[#C4C7C5] dark:hover:bg-white/10"
                  onClick={(event) => {
                    event.stopPropagation()
                    onShare(file)
                  }}
                  aria-label={`Share ${file.name}`}
                >
                  <UserPlus className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#444746] opacity-0 transition-opacity hover:bg-black/5 group-hover:opacity-100 dark:text-[#C4C7C5] dark:hover:bg-white/10"
                onClick={(event) => {
                  event.stopPropagation()
                  onFileContextMenu?.(event, file)
                }}
                aria-label={`Open ${file.name} menu`}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>

            {/* Preview Box */}
            <div className="mx-3 mb-2.5 flex h-28 items-center justify-center rounded-xl bg-[#F0F4F9] dark:bg-[#28292A] overflow-hidden">
              <FileIcon kind={file.kind} className="h-12 w-12 opacity-80" />
            </div>

            {/* Card Footer: Metadata */}
            <div className="flex items-center justify-between px-3.5 pb-3 text-xs text-[#444746] dark:text-[#C4C7C5]">
              <span>{file.size}</span>
              <span>{file.date}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
