import { useState, useEffect, useId } from 'react'
import { useDialogFocus } from '@/hooks/useDialogFocus'
import { Check, Folder as FolderIcon, Loader2, Search, X } from 'lucide-react'
import { API_URL, apiFetch, formatBytes, formatDate } from '@/lib/api'
import { mimeToKind } from '@/lib/file-kind'
import { useDriveFilter } from '@/context/DriveFilterContext'
import { useLanguage } from '@/context/LanguageContext'
import { getAccessToken } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileIcon } from '@/components/drive/FileIcon'

type BackendFile = {
  id: string
  name: string
  mimeType: string
  sizeBytes: string
  updatedAt: string
  connectedAccount?: { email: string } | null
  folderId?: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  onSelectFiles: (files: File[]) => void
  acceptFilter?: 'image' | 'pdf' | 'video' | 'all'
  multiple?: boolean
}

export function DriveFilePickerModal({
  open,
  onClose,
  onSelectFiles,
  acceptFilter = 'all',
  multiple = true,
}: Props) {
  const dialogRef = useDialogFocus(open, onClose)
  const titleId = useId()
  const { selectedAccountId } = useDriveFilter()
  const { t, language } = useLanguage()
  const isId = language === 'id'
  const [files, setFiles] = useState<BackendFile[]>([])
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set())
      setPage(1)
      setSearch('')
      return
    }
    let cancelled = false
    setSelectedIds(new Set())
    setLoading(true)
    setError('')
    async function fetchFiles() {
      try {
        const params = new URLSearchParams({ status: 'active', limit: '50', page: String(page) })
        if (acceptFilter !== 'all') params.set('kind', acceptFilter)
        if (search.trim()) params.set('q', search.trim())
        if (selectedAccountId && selectedAccountId !== 'all') params.set('accountId', selectedAccountId)
        const data = await apiFetch<{ files: BackendFile[]; total: number; page: number; hasMore: boolean }>(`/files?${params}`)
        if (cancelled) return
        setFiles(data.files ?? [])
        setTotal(data.total)
        setPage(data.page)
        setHasMore(data.hasMore)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load files')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    const timer = window.setTimeout(() => void fetchFiles(), search ? 250 : 0)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [open, acceptFilter, selectedAccountId, page, search, retry])

  if (!open) return null

  const filteredFiles = files

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (!multiple) next.clear()
        next.add(id)
      }
      return next
    })
  }

  const handleConfirm = async () => {
    if (selectedIds.size === 0) return
    setDownloading(true)
    try {
      const filesToDownload = files.filter((f) => selectedIds.has(f.id))
      const downloadedFiles: File[] = []

      for (const item of filesToDownload) {
        const token = getAccessToken()
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`

        const res = await fetch(`${API_URL}/cdn/raw/${item.id}`, { headers })
        if (!res.ok) throw new Error(`Gagal mengunduh berkas ${item.name}`)
        const blob = await res.blob()
        const fileObj = new File([blob], item.name, {
          type: item.mimeType || 'application/octet-stream',
        })
        downloadedFiles.push(fileObj)
      }

      onSelectFiles(downloadedFiles)
      onClose()
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to import files')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/32">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="flex flex-col w-full max-w-xl max-h-[90dvh] bg-white dark:bg-[#1E1F20] rounded-[28px] shadow-2xl border border-[#E0E3E7] dark:border-[#36373A] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E3E7] dark:border-[#36373A]">
          <div>
            <h2 id={titleId} className="text-base font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
              {isId ? 'Pilih dari 9Drive' : 'Choose from 9Drive'}
            </h2>
            <p className="text-xs text-[#747775] dark:text-[#8E918F] mt-0.5">
              {isId ? 'Pilih file dari akun penyimpanan aktif.' : 'Choose files from the selected storage account.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close file picker"
            className="flex items-center justify-center w-11 h-11 rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-2.5 border-b border-[#E0E3E7]/60 dark:border-[#36373A]/60 bg-[#F8FAFD] dark:bg-[#131314]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#747775]" />
            <Input
              type="text"
              aria-label={isId ? 'Cari file di 9Drive' : 'Search files in 9Drive'}
              placeholder={isId ? 'Cari file di 9Drive' : 'Search files in 9Drive'}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9 h-8 text-xs rounded-full bg-white dark:bg-[#28292A] border-[#E0E3E7] dark:border-[#36373A]"
            />
          </div>
        </div>

        {/* File List */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-1">
          {loading ? (
            <div role="status" className="flex flex-col items-center justify-center h-48 gap-2 text-xs text-[#747775]">
              <Loader2 className="w-5 h-5 animate-spin text-[#0B57D0]" />
              <span>{t('action.loading', 'Loading…')}</span>
            </div>
          ) : error ? <div role="alert" className="p-3 text-sm text-[#B3261E] dark:text-[#F2B8B5]"><p>{error}</p><Button variant="outline" className="mt-2" onClick={() => setRetry(retry + 1)}>{t('action.retry', 'Retry')}</Button></div> : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-xs text-[#747775] text-center">
              <FolderIcon className="w-7 h-7 text-[#747775]/50" />
              <p>{isId ? 'Tidak ada file yang cocok.' : 'No matching files.'}</p>
            </div>
          ) : (
            filteredFiles.map((file) => {
              const selected = selectedIds.has(file.id)
              return (
                <button type="button" aria-pressed={selected} title={file.name}
                  key={file.id}
                  onClick={() => toggleSelect(file.id)}
                  className={`flex w-full items-center justify-between p-2.5 rounded-xl cursor-pointer text-left transition-colors border ${
                    selected
                      ? 'border-[#0B57D0] bg-[#C2E7FF] text-[#001D35] dark:border-[#004A77] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                      : 'border-transparent hover:bg-[#F0F4F9] dark:hover:bg-[#28292A]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-7 h-7 flex items-center justify-center shrink-0">
                      <FileIcon
                        kind={mimeToKind(file.mimeType)}
                        className="w-5 h-5"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3] truncate">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-[#747775] dark:text-[#8E918F]">
                        {file.mimeType.startsWith('application/vnd.google-apps.') ? '--' : formatBytes(file.sizeBytes)} · {formatDate(file.updatedAt)}
                      </p>
                      {file.connectedAccount?.email && <p className="truncate text-xs text-[#444746] dark:text-[#C4C7C5]">{file.connectedAccount.email}</p>}
                    </div>
                  </div>

                  <div
                    className={`flex items-center justify-center w-4 h-4 rounded border transition-colors ${
                      selected
                        ? 'border-[#0B57D0] bg-[#0B57D0] text-white dark:border-[#A8C7FA] dark:bg-[#A8C7FA] dark:text-[#001D35]'
                        : 'border-[#747775]/40'
                    }`}
                  >
                    {selected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              )
            })
          )}
        </div>

        <nav aria-label={isId ? 'Halaman file' : 'File pages'} className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E0E3E7] px-4 py-2 text-xs dark:border-[#36373A] dark:text-[#E3E3E3]"><span>{total ? (page - 1) * 50 + 1 : 0}–{Math.min(page * 50, total)} / {total}</span><div className="flex gap-2"><Button size="sm" variant="ghost" disabled={page <= 1 || loading || downloading} onClick={() => setPage(page - 1)}>{isId ? 'Sebelumnya' : 'Previous'}</Button><Button size="sm" variant="ghost" disabled={!hasMore || loading || downloading} onClick={() => setPage(page + 1)}>{isId ? 'Berikutnya' : 'Next'}</Button></div></nav>
        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-[#E0E3E7] dark:border-[#36373A] bg-[#F8FAFD] dark:bg-[#131314]">
          <span className="text-xs text-[#747775] dark:text-[#8E918F]">
            {selectedIds.size} {isId ? 'file dipilih' : 'files selected'}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={downloading}
              className="h-8 text-xs rounded-full"
            >
              {t('action.cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              disabled={selectedIds.size === 0 || downloading || loading || Boolean(error)}
              className="h-8 px-4 text-xs font-medium rounded-full bg-[#0B57D0] hover:bg-[#0B57D0]/90 text-white min-w-[90px]"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  {isId ? 'Mengambil…' : 'Importing…'}
                </>
              ) : (
                `${isId ? 'Impor' : 'Import'} (${selectedIds.size})`
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
