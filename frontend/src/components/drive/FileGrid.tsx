import { MoreVertical, UserPlus } from 'lucide-react'
import type { MouseEvent } from 'react'
import { FileIcon } from '@/components/drive/FileIcon'
import { FileThumbnail } from '@/components/drive/FileThumbnail'
import type { FileItem } from '@/data/drive-data'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/api'

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
              'group relative flex flex-col rounded-2xl border transition-colors cursor-pointer select-none overflow-hidden',
              selected
                ? 'border-[#0B57D0] bg-[#C2E7FF] text-[#001D35] dark:border-[#A8C7FA] dark:bg-[#004A77] dark:text-[#C2E7FF]'
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
              <button type="button" onClick={(event) => { event.stopPropagation(); onFileDoubleClick?.(file) }}
                className="min-h-11 min-w-0 flex-1 truncate text-left text-sm font-normal text-[#1F1F1F] dark:text-[#E3E3E3]"
                title={file.name}
              >
                {file.name}
              </button>
              {onShare && (
                <button
                  type="button"
                  title="Share"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10"
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
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10"
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
            <FileThumbnail file={file} />
            <p className="truncate px-3.5 pb-2 text-xs text-[#444746] dark:text-[#C4C7C5]" title={[file.accountEmail, file.folderName].filter(Boolean).join(' / ')}>{[file.accountEmail, file.folderName].filter(Boolean).join(' / ')}</p>

            {/* Card Footer: Metadata */}
            <div className="flex items-center justify-between px-3.5 pb-3 text-xs text-[#444746] dark:text-[#C4C7C5]">
              <span>{file.size}</span>
              <span>{file.updatedAt ? formatDate(file.updatedAt) : file.date}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
