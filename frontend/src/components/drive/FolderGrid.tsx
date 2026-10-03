import { MoreVertical } from 'lucide-react'
import type { MouseEvent } from 'react'
import { cn } from '@/lib/utils'
import type { FolderItem } from '@/data/drive-data'
import { FolderVisual } from '@/components/drive/FolderVisual'
import { useDriveFilter } from '@/context/DriveFilterContext'

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
  const { accounts, getDriveLetter } = useDriveFilter()
  const nameCounts = new Map<string, number>()
  for (const folder of items) nameCounts.set(folder.name, (nameCounts.get(folder.name) || 0) + 1)
  const repeatedNames = new Set([...nameCounts].filter(([, count]) => count > 1).map(([name]) => name))
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
        mobileTwoColumns && 'grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
      )}
    >
      {items.map((folder) => (
        <div
          key={folder.id || folder.name}
          onContextMenu={(event) => onFolderMenu?.(event, folder)}
          onDragOver={(event) => {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
          }}
          onDragEnter={(event) => {
            event.currentTarget.classList.add('bg-[#C2E7FF]/50', 'border-[#0B57D0]', 'dark:bg-[#004A77]/40', 'dark:border-[#A8C7FA]')
          }}
          onDragLeave={(event) => {
            event.currentTarget.classList.remove('bg-[#C2E7FF]/50', 'border-[#0B57D0]', 'dark:bg-[#004A77]/40', 'dark:border-[#A8C7FA]')
          }}
          onDrop={(event) => {
            event.preventDefault()
            event.currentTarget.classList.remove('bg-[#C2E7FF]/50', 'border-[#0B57D0]', 'dark:bg-[#004A77]/40', 'dark:border-[#A8C7FA]')
            const fileId = event.dataTransfer.getData('text/plain')
            if (fileId && folder.id) onDropItem?.(fileId, folder.id)
          }}
          className="group relative flex h-12 items-center gap-2 rounded-xl border border-[#E0E3E7] bg-[#F8FAFD] pl-3 transition-colors hover:bg-[#F0F4F9] dark:border-[#36373A] dark:bg-[#28292A] dark:hover:bg-[#333537] select-none"
        >
          <button type="button" onClick={() => onFolderOpen?.(folder)} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left" title={[folder.name, accounts.find(account => account.id === folder.connectedAccountId)?.email, folder.providerFolderId || folder.id].filter(Boolean).join(' / ')}>
          <div className="shrink-0 flex items-center justify-center">
            <FolderVisual folder={folder} className="h-6 w-6" />
          </div>

          <span
            className="flex-1 truncate text-sm font-normal text-[#1F1F1F] dark:text-[#E3E3E3]"
            title={folder.name}
          >
            {folder.name}
            {repeatedNames.has(folder.name) && <span className="block truncate text-xs text-[#444746] dark:text-[#C4C7C5]">{folder.connectedAccountId ? `Drive ${getDriveLetter(folder.connectedAccountId)} · ` : ''}{folder.id?.slice(0, 8)}</span>}
          </span>
          </button>

          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10"
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
