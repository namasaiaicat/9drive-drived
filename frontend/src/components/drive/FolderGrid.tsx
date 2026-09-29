import { MoreVertical } from 'lucide-react'
import type { MouseEvent } from 'react'
import { cn } from '@/lib/utils'
import type { FolderItem } from '@/data/drive-data'
import { FolderVisual } from '@/components/drive/FolderVisual'

export type FolderSizeScale = 'xs' | 'sm' | 'md' | 'lg'

export function FolderGrid({
  items,
  mobileTwoColumns = false,
  sizeScale = 'md',
  onFolderMenu,
  onFolderOpen,
  onDropItem,
}: {
  items: FolderItem[]
  mobileTwoColumns?: boolean
  sizeScale?: FolderSizeScale
  onFolderMenu?: (event: MouseEvent<HTMLElement>, folder: FolderItem) => void
  onFolderOpen?: (folder: FolderItem) => void
  onDropItem?: (fileId: string, folderId: string) => void
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
          : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4',
        mobileTwoColumns && 'grid-cols-2'
      )}
    >
      {items.map((folder) => (
        <div
          key={folder.id || folder.name}
          onClick={() => onFolderOpen?.(folder)}
          onContextMenu={(event) => onFolderMenu?.(event, folder)}
          onDragOver={(event) => {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
          }}
          onDragEnter={(event) => {
            event.currentTarget.classList.add('bg-[#C2E7FF]/50', 'border-[#0B57D0]')
          }}
          onDragLeave={(event) => {
            event.currentTarget.classList.remove('bg-[#C2E7FF]/50', 'border-[#0B57D0]')
          }}
          onDrop={(event) => {
            event.preventDefault()
            event.currentTarget.classList.remove('bg-[#C2E7FF]/50', 'border-[#0B57D0]')
            const fileId = event.dataTransfer.getData('text/plain')
            if (fileId && folder.id) onDropItem?.(fileId, folder.id)
          }}
          className="group relative flex h-12 items-center gap-3 rounded-xl border border-[#E0E3E7] bg-[#F8FAFD] px-3.5 transition-all duration-200 ease-[cubic-bezier(0.05,0.7,0.1,1.0)] hover:-translate-y-0.5 hover:shadow-sm hover:border-[#747775]/40 hover:bg-[#F0F4F9] active:scale-[0.98] dark:border-[#36373A] dark:bg-[#28292A] dark:hover:border-[#747775]/60 dark:hover:bg-[#333537] cursor-pointer select-none"
        >
          <div className="shrink-0 flex items-center justify-center">
            <FolderVisual folder={folder} className="h-6 w-6" />
          </div>

          <span
            className="flex-1 truncate text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]"
            title={folder.name}
          >
            {folder.name}
          </span>

          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#444746] opacity-0 transition-opacity hover:bg-black/5 group-hover:opacity-100 dark:text-[#C4C7C5] dark:hover:bg-white/10"
            onClick={(event) => {
              event.stopPropagation()
              onFolderMenu?.(event, folder)
            }}
            aria-label={`Open ${folder.name} menu`}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
