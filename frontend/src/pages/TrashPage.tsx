import { useEffect, useState } from 'react'
import { RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/drive/PageHeader'
import { FileIcon } from '@/components/drive/FileIcon'
import { apiFetch, formatBytes } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useDriveFilter } from '@/context/DriveFilterContext'
import { useToast } from '@/context/ToastContext'
import { useLanguage } from '@/context/LanguageContext'

type TrashFile = {
  id: string
  name: string
  mimeType: string
  sizeBytes: string
  provider: string
  deletedAt: string
  connectedAccount: {
    email: string
    provider: string
  }
}

export function TrashPage() {
  const { selectedAccountId } = useDriveFilter()
  const { language, t } = useLanguage()
  const [files, setFiles] = useState<TrashFile[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function loadTrash() {
    setLoading(true)
    try {
      const path = selectedAccountId && selectedAccountId !== 'all'
        ? `/files/trash?accountId=${selectedAccountId}`
        : '/files/trash'
      const data = await apiFetch<{ files: TrashFile[] }>(path)
      setFiles(data.files)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load trash')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTrash().catch(() => undefined)
  }, [selectedAccountId])

  function toggleSelect(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  function toggleSelectAll() {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(files.map((f) => f.id)))
    }
  }

  async function handleRestore(ids: string[]) {
    if (ids.length === 0) return
    setLoading(true)
    try {
      await apiFetch('/files/batch/restore', {
        method: 'POST',
        body: JSON.stringify({ fileIds: ids }),
      })
      setFiles((prev) => prev.filter((f) => !ids.includes(f.id)))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
      toast.success(language === 'id' ? `Memulihkan ${ids.length} item ke Drive Saya.` : `Restored ${ids.length} item(s) to My Drive.`)
      window.dispatchEvent(new Event('9drive:storage-changed'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to restore files')
    } finally {
      setLoading(false)
    }
  }

  async function handlePermanentDelete(ids: string[]) {
    if (ids.length === 0) return
    if (
      !confirm(
        language === 'id'
          ? `Yakin ingin menghapus ${ids.length} file selamanya? Tindakan ini tidak dapat dibatalkan.`
          : `Are you sure you want to delete ${ids.length} file(s) forever? This action cannot be undone.`
      )
    )
      return
    setLoading(true)
    try {
      await apiFetch('/files/batch/permanent', {
        method: 'DELETE',
        body: JSON.stringify({ fileIds: ids }),
      })
      setFiles((prev) => prev.filter((f) => !ids.includes(f.id)))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
      toast.success(language === 'id' ? `Menghapus ${ids.length} item selamanya.` : `Deleted ${ids.length} item(s) forever.`)
      window.dispatchEvent(new Event('9drive:storage-changed'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete files')
    } finally {
      setLoading(false)
    }
  }

  async function handleEmptyTrash() {
    if (files.length === 0) return
    if (!confirm(language === 'id' ? 'Kosongkan sampah? Semua item di sampah akan dihapus selamanya.' : 'Empty trash? All items in trash will be deleted forever.')) return
    await handlePermanentDelete(files.map((f) => f.id))
  }

  return (
    <div className="flex flex-col min-h-full w-full min-w-0">
      <PageHeader
        title={t('trash.title', 'Trash')}
        actions={
          files.length > 0 ? (
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestore(Array.from(selectedIds))}
                    disabled={loading}
                  >
                    <RotateCcw className="h-4 w-4" /> {t('trash.restore', 'Restore')} ({selectedIds.size})
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handlePermanentDelete(Array.from(selectedIds))}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" /> {t('trash.delete_forever', 'Delete forever')} ({selectedIds.size})
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" onClick={handleEmptyTrash} disabled={loading}>
                  {t('trash.empty_trash', 'Empty trash')}
                </Button>
              )}
            </div>
          ) : null
        }
      />

      {/* Info notice bar */}
      <div className="mt-3 rounded-lg bg-[#EDF2FC] px-4 py-2.5 text-xs text-[#444746] dark:bg-[#28292A] dark:text-[#C4C7C5]">
        {t('trash.info_bar', 'Items in trash are deleted forever after 30 days.')}
      </div>

      {files.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-20 px-4 text-center select-none">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#EDF2FC] dark:bg-[#28292A] text-[#747775] dark:text-[#8E918F] mb-4">
            <Trash2 className="h-12 w-12 stroke-[1.2]" />
          </div>
          <h3 className="text-lg font-normal text-[#1F1F1F] dark:text-[#E3E3E3]">{t('trash.empty_title', 'Trash is empty')}</h3>
          <p className="mt-1 text-xs text-[#747775] dark:text-[#8E918F]">
            {t('trash.empty_desc', 'Items moved to the trash will show up here.')}
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto select-none">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E0E3E7] text-[13px] font-medium text-[#444746] dark:border-[#36373A] dark:text-[#C4C7C5]">
                <th className="py-2.5 pl-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === files.length && files.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded accent-[#0B57D0] cursor-pointer"
                  />
                </th>
                <th className="py-2.5 font-medium">{t('table.name', 'Name')}</th>
                <th className="py-2.5 font-medium">{t('trash.storage_account', 'Storage account')}</th>
                <th className="py-2.5 font-medium">{t('trash.original_size', 'Original size')}</th>
                <th className="py-2.5 font-medium">{t('trash.date_trashed', 'Date trashed')}</th>
                <th className="py-2.5 pr-3 text-right">{t('trash.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => {
                const selected = selectedIds.has(file.id)
                return (
                  <tr
                    key={file.id}
                    onClick={() => toggleSelect(file.id)}
                    className={cn(
                      'group h-12 border-b transition-colors cursor-pointer',
                      selected
                        ? 'bg-[#C2E7FF] text-[#001D35] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                        : 'border-[#E0E3E7]/60 hover:bg-[#F0F4F9] dark:border-[#36373A]/60 dark:hover:bg-[#28292A]'
                    )}
                  >
                    <td className="py-2 pl-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelect(file.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded accent-[#0B57D0] cursor-pointer"
                      />
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-3">
                        <FileIcon kind={file.mimeType.split('/')[0]} className="h-5 w-5 shrink-0" />
                        <span
                          className={cn(
                            'truncate max-w-xs sm:max-w-md font-normal text-sm',
                            selected
                              ? 'text-[#001D35] dark:text-[#C2E7FF]'
                              : 'text-[#1F1F1F] dark:text-[#E3E3E3]'
                          )}
                          title={file.name}
                        >
                          {file.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 text-xs text-[#444746] dark:text-[#C4C7C5]">
                      {file.connectedAccount.email}
                    </td>
                    <td className="py-2 text-xs text-[#444746] dark:text-[#C4C7C5]">
                      {formatBytes(file.sizeBytes)}
                    </td>
                    <td className="py-2 text-xs text-[#444746] dark:text-[#C4C7C5]">
                      {new Intl.DateTimeFormat('en', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(file.deletedAt))}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRestore([file.id])
                          }}
                          disabled={loading}
                          title={t('trash.restore', 'Restore')}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[#B3261E] hover:bg-[#F9DEDC]/50 dark:hover:bg-[#8C1D18]/30"
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePermanentDelete([file.id])
                          }}
                          disabled={loading}
                          title={t('trash.delete_forever', 'Delete forever')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
