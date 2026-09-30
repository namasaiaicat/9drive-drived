import { FolderOpen, MoreVertical, Star, Link2, FolderInput, Check, UserPlus } from 'lucide-react'
import { type MouseEvent, useState } from 'react'
import { AvatarStack } from '@/components/drive/AvatarStack'
import { FileIcon } from '@/components/drive/FileIcon'
import type { FileItem } from '@/data/drive-data'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useToast } from '@/context/ToastContext'

export function FileTable({
  files,
  mode = 'default',
  selectedFileIds = new Set<string>(),
  allSelected = false,
  onFileContextMenu,
  onToggleFile,
  onToggleAll,
  onFileDoubleClick,
  onShare,
}: {
  files: FileItem[]
  mode?: 'default' | 'shared' | 'recent' | 'starred' | 'archived'
  selectedFileIds?: Set<string>
  allSelected?: boolean
  onFileContextMenu?: (event: MouseEvent<HTMLElement>, file: FileItem) => void
  onToggleFile?: (file: FileItem) => void
  onToggleAll?: () => void
  onFileDoubleClick?: (file: FileItem) => void
  onShare?: (file: FileItem) => void
}) {
  const { toast } = useToast()
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null)

  return (
    <div className="mt-2">
      {/* Mobile card view */}
      <div className="grid gap-2 sm:hidden">
        {onToggleAll ? (
          <label className="flex items-center justify-between rounded-xl border border-[#E0E3E7] bg-white px-3.5 py-2.5 text-xs font-medium text-[#444746] dark:border-[#36373A] dark:bg-[#1E1F20] dark:text-[#C4C7C5]">
            <span>Select all files</span>
            <input
              type="checkbox"
              className="h-4 w-4 rounded accent-[#0B57D0]"
              checked={allSelected}
              onChange={onToggleAll}
            />
          </label>
        ) : null}
        {files.map((file) => {
          const selected = selectedFileIds.has(file.id ?? '')
          const meta =
            mode === 'archived'
              ? file.location
              : mode === 'recent'
              ? file.openedDate
              : mode === 'starred'
              ? file.starredDate
              : file.date
          return (
            <article
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
                'overflow-hidden rounded-xl border p-3 transition-colors cursor-pointer select-none',
                selected
                  ? 'border-[#0B57D0] bg-[#C2E7FF] text-[#001D35] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                  : 'border-[#E0E3E7] bg-white hover:bg-[#F0F4F9] dark:border-[#36373A] dark:bg-[#1E1F20] dark:hover:bg-[#28292A]'
              )}
            >
              <div className="flex items-center gap-3">
                {onToggleFile ? (
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 rounded accent-[#0B57D0]"
                    checked={selected}
                    onChange={() => onToggleFile?.(file)}
                    onClick={(event) => event.stopPropagation()}
                  />
                ) : null}
                <div className="shrink-0">
                  {mode === 'starred' ? (
                    <Star className="h-5 w-5 fill-[#FBBC04] text-[#FBBC04]" />
                  ) : (
                    <FileIcon kind={file.kind} className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <h3
                    className={cn(
                      'truncate text-sm font-medium leading-snug',
                      selected ? 'text-[#001D35] dark:text-[#C2E7FF]' : 'text-[#1F1F1F] dark:text-[#E3E3E3]'
                    )}
                    title={file.name}
                  >
                    {file.name}
                  </h3>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[#444746] dark:text-[#C4C7C5]">
                    <span>{meta}</span>
                    <span>·</span>
                    <span>{file.size}</span>
                    {file.folderName && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-0.5 text-[#0B57D0] dark:text-[#A8C7FA]">
                          <FolderOpen className="h-3 w-3" />
                          {file.folderName}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10"
                  onClick={(event) => {
                    event.stopPropagation()
                    onFileContextMenu?.(event, file)
                  }}
                  aria-label={`Open ${file.name} menu`}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {/* Desktop Google Drive Table View */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm select-none">
          <thead>
            <tr className="border-b border-[#E0E3E7] text-[13px] font-medium text-[#444746] dark:border-[#36373A] dark:text-[#C4C7C5]">
              <th className="w-10 py-2.5 pl-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-[#0B57D0] cursor-pointer"
                  checked={allSelected}
                  onChange={onToggleAll}
                  aria-label="Select all"
                />
              </th>
              <th className="py-2.5 font-medium">Name</th>
              {mode === 'default' ? <th className="py-2.5 font-medium text-[#747775]">Location</th> : null}
              {mode === 'shared' ? <th className="py-2.5 font-medium">Owner</th> : null}
              {mode === 'recent' ? <th className="py-2.5 font-medium">Last opened</th> : null}
              {mode === 'starred' ? <th className="py-2.5 font-medium">Starred on</th> : null}
              {mode === 'archived' ? <th className="py-2.5 font-medium">Archived date</th> : null}
              {mode === 'archived' ? (
                <th className="py-2.5 font-medium">Original location</th>
              ) : (
                <th className="py-2.5 font-medium">Last modified</th>
              )}
              <th className="py-2.5 font-medium">File size</th>
              <th className="py-2.5 font-medium">Sharing</th>
              <th className="w-32 py-2.5 pr-3 text-right" />
            </tr>
          </thead>
          <tbody>
            {files.map((file) => {
              const selected = selectedFileIds.has(file.id ?? '')
              return (
                <tr
                  key={file.id ?? file.name}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', file.id ?? '')
                    event.dataTransfer.effectAllowed = 'move'
                  }}
                  onContextMenu={(event) => onFileContextMenu?.(event, file)}
                  onClick={() => onToggleFile?.(file)}
                  onDoubleClick={() => onFileDoubleClick?.(file)}
                  className={cn(
                    'group h-12 border-b transition-colors cursor-pointer',
                    selected
                      ? 'border-transparent bg-[#C2E7FF] text-[#001D35] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                      : 'border-[#E0E3E7]/60 hover:bg-[#F0F4F9] dark:border-[#36373A]/60 dark:hover:bg-[#28292A]'
                  )}
                >
                  <td className="py-2 pl-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded accent-[#0B57D0] cursor-pointer"
                      checked={selected}
                      onChange={() => onToggleFile?.(file)}
                      onClick={(event) => event.stopPropagation()}
                      aria-label={`Select ${file.name}`}
                    />
                  </td>
                  <td className="py-2 font-normal">
                    <span className="flex min-w-0 items-center gap-3">
                      {mode === 'starred' ? (
                        <Star className="h-5 w-5 shrink-0 fill-[#FBBC04] text-[#FBBC04]" />
                      ) : (
                        <FileIcon kind={file.kind} className="h-5 w-5 shrink-0" />
                      )}
                      <span
                        className={cn(
                          'truncate max-w-[220px] lg:max-w-[340px] text-sm font-normal',
                          selected ? 'text-[#001D35] dark:text-[#C2E7FF]' : 'text-[#1F1F1F] dark:text-[#E3E3E3]'
                        )}
                        title={file.name}
                      >
                        {file.name}
                      </span>
                    </span>
                  </td>
                  {mode === 'default' ? (
                    <td className="py-2 text-[#444746] dark:text-[#C4C7C5]">
                      {file.folderName ? (
                        <span className="flex items-center gap-1 text-xs font-normal text-[#0B57D0] dark:text-[#A8C7FA]">
                          <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate max-w-[120px]">{file.folderName}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-[#747775]">My Drive</span>
                      )}
                    </td>
                  ) : null}
                  {mode === 'shared' ? <td className="py-2 text-[#444746] dark:text-[#C4C7C5]">{file.owner || 'me'}</td> : null}
                  {mode === 'recent' ? <td className="py-2 text-[#444746] dark:text-[#C4C7C5]">{file.openedDate}</td> : null}
                  {mode === 'starred' ? <td className="py-2 text-[#444746] dark:text-[#C4C7C5]">{file.starredDate}</td> : null}
                  {mode === 'archived' ? <td className="py-2 text-[#444746] dark:text-[#C4C7C5]">{file.archivedDate}</td> : null}
                  <td className="py-2 text-[#444746] dark:text-[#C4C7C5]">{mode === 'archived' ? file.location : file.date}</td>
                  <td className="py-2 text-[#444746] dark:text-[#C4C7C5]">{file.size}</td>
                  <td className="py-2 text-[#444746] dark:text-[#C4C7C5]">
                    <span className="flex items-center gap-2">
                      <AvatarStack count={file.shared} />
                      <span className="truncate max-w-[100px] text-xs">{file.access}</span>
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Hover action shortcuts */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        {onShare && (
                          <button
                            type="button"
                            title="Share"
                            onClick={(event) => {
                              event.stopPropagation()
                              onShare(file)
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10"
                          >
                            <UserPlus className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Copy Link"
                          onClick={async (event) => {
                            event.stopPropagation()
                            try {
                              let url = file.driveUrl
                              if (!url) {
                                const data = await apiFetch<{ url: string | null }>(`/files/${file.id}/view-url`)
                                url = data.url ?? (await apiFetch<{ url: string }>(`/files/${file.id}/share`, { method: 'POST' })).url
                              }
                              await navigator.clipboard.writeText(url)
                              setCopiedFileId(file.id ?? null)
                              toast.success('Link copied to clipboard!')
                              setTimeout(() => setCopiedFileId(null), 2000)
                            } catch {
                              toast.error('Failed to copy link.')
                            }
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10"
                        >
                          {copiedFileId === file.id ? <Check className="h-4 w-4 text-[#0F9D58]" /> : <Link2 className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          title={mode === 'starred' ? 'Remove from Starred' : 'Add to Starred'}
                          onClick={async (event) => {
                            event.stopPropagation()
                            try {
                              await apiFetch(`/files/${file.id}/star`, {
                                method: 'POST',
                                body: JSON.stringify({ starred: mode !== 'starred' }),
                              })
                              window.dispatchEvent(new Event('9drive:starred-changed'))
                            } catch {
                              /* ignore */
                            }
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10"
                        >
                          <Star className={cn('h-4 w-4', mode === 'starred' ? 'fill-[#FBBC04] text-[#FBBC04]' : '')} />
                        </button>
                        <button
                          type="button"
                          title="Move File"
                          onClick={(event) => {
                            event.stopPropagation()
                            window.dispatchEvent(new CustomEvent('9drive:open-move-modal', { detail: file }))
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10"
                        >
                          <FolderInput className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10 shrink-0"
                        onClick={(event) => {
                          event.stopPropagation()
                          onFileContextMenu?.(event, file)
                        }}
                        aria-label={`Open ${file.name} menu`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
