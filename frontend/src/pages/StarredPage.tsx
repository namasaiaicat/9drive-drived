import { useEffect, useState, type FormEvent, type MouseEvent } from 'react'
import {
  ExternalLink,
  LayoutGrid,
  Link2,
  List,
  Star,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { FileGrid } from '@/components/drive/FileGrid'
import { FileTable } from '@/components/drive/FileTable'
import { FileContextMenu } from '@/components/drive/FileContextMenu'
import { FileDetailsDrawer } from '@/components/drive/FileDetailsDrawer'
import { DummyModal } from '@/components/drive/DummyModal'
import { ShareModal } from '@/components/drive/ShareModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { API_URL, apiFetch, formatBytes, formatDate } from '@/lib/api'
import { useToast } from '@/context/ToastContext'
import { getAccessToken } from '@/lib/auth'
import { getPreviewKind, officeViewerUrl } from '@/lib/preview'
import type { FileItem, FolderItem } from '@/data/drive-data'
import { useDriveFilter } from '@/context/DriveFilterContext'
import { useLanguage } from '@/context/LanguageContext'

type BackendFile = {
  id: string
  name: string
  mimeType: string
  sizeBytes: string
  createdAt: string
  folderId?: string | null
  providerFileId?: string
  driveUrl?: string | null
  connectedAccount?: { email: string; provider: string }
  folder?: { id: string; name: string } | null
}

function mimeToKind(mimeType: string): FileItem['kind'] {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.includes('pdf')) return 'pdf'
  return 'doc'
}

function mapFile(file: BackendFile): FileItem {
  const driveUrl =
    file.driveUrl ??
    (file.providerFileId
      ? `https://drive.google.com/file/d/${file.providerFileId}/view?usp=sharing`
      : undefined)
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    createdAt: file.createdAt,
    accountEmail: file.connectedAccount?.email,
    accountProvider: file.connectedAccount?.provider === 's3' ? 'S3 Storage' : 'Google Drive',
    date: formatDate(file.createdAt),
    size: formatBytes(file.sizeBytes),
    access: file.connectedAccount?.email ?? 'Google Drive',
    kind: mimeToKind(file.mimeType),
    shared: 1,
    folderId: file.folderId,
    folderName: file.folder?.name,
    starredDate: formatDate(file.createdAt),
    providerFileId: file.providerFileId,
    driveUrl,
  }
}

export function StarredPage() {
  const { selectedAccountId } = useDriveFilter()
  const [fileList, setFileList] = useState<FileItem[]>([])
  const [allFolders, setAllFolders] = useState<FolderItem[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  // Selection & Interactions
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const [activeFile, setActiveFile] = useState<FileItem | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileItem | null }>({
    x: 0,
    y: 0,
    file: null,
  })

  // Modals & Drawers
  const [detailOpen, setDetailOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewError, setPreviewError] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const { toast } = useToast()
  const { t } = useLanguage()

  async function loadStarred() {
    setLoading(true)
    try {
      const path = selectedAccountId && selectedAccountId !== 'all'
        ? `/files/starred?accountId=${selectedAccountId}`
        : '/files/starred'
      const data = await apiFetch<{ files: BackendFile[] }>(path)
      if (data.files && data.files.length > 0) {
        setFileList(data.files.map(mapFile))
      } else {
        setFileList([])
      }
    } catch {
      setFileList([])
    } finally {
      setLoading(false)
    }
  }

  async function loadFolders() {
    try {
      const data = await apiFetch<{ folders: FolderItem[] }>('/folders')
      setAllFolders(data.folders ?? [])
    } catch {
      setAllFolders([])
    }
  }

  useEffect(() => {
    loadStarred()
    loadFolders()
    const handleStarredChanged = () => {
      loadStarred()
    }
    const handleStorageChanged = () => {
      loadStarred()
    }
    window.addEventListener('9drive:starred-changed', handleStarredChanged)
    window.addEventListener('9drive:storage-changed', handleStorageChanged)
    return () => {
      window.removeEventListener('9drive:starred-changed', handleStarredChanged)
      window.removeEventListener('9drive:storage-changed', handleStorageChanged)
    }
  }, [selectedAccountId])

  function showNotification(text: string) {
    if (text.toLowerCase().includes('success') || text.toLowerCase().includes('copied') || text.toLowerCase().includes('renamed') || text.toLowerCase().includes('moved')) {
      toast.success(text)
    } else if (text.toLowerCase().includes('failed') || text.toLowerCase().includes('error')) {
      toast.error(text)
    } else {
      toast.info(text)
    }
  }

  const filteredFiles = fileList.filter((file) => {
    if (typeFilter === 'docs' && file.kind !== 'doc') return false
    if (typeFilter === 'images' && file.kind !== 'image') return false
    if (typeFilter === 'videos' && file.kind !== 'video') return false
    if (typeFilter === 'pdfs' && file.kind !== 'pdf') return false
    return true
  })

  const visibleIds = filteredFiles.map((file) => file.id).filter(Boolean) as string[]
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedFileIds.has(id))

  function toggleFileSelection(file: FileItem) {
    if (!file.id) return
    setSelectedFileIds((current) => {
      const next = new Set(current)
      if (next.has(file.id!)) next.delete(file.id!)
      else next.add(file.id!)
      return next
    })
  }

  function toggleAllVisibleFiles() {
    setSelectedFileIds(allVisibleSelected ? new Set() : new Set(visibleIds))
  }

  function clearSelection() {
    setSelectedFileIds(new Set())
  }

  function openContext(event: MouseEvent<HTMLElement>, file: FileItem) {
    event.preventDefault()
    event.stopPropagation()
    setActiveFile(file)
    setContextMenu({ x: event.clientX, y: event.clientY, file })
  }

  async function viewFile(fileToView?: FileItem) {
    const target = fileToView ?? activeFile
    if (!target?.id) return
    setActiveFile(target)
    setPreviewUrl('')
    setPreviewError('')
    setPreviewLoading(true)
    setPreviewOpen(true)
    setContextMenu({ x: 0, y: 0, file: null })

    try {
      const data = await apiFetch<{ path?: string; url: string }>(
        `/files/${target.id}/preview-token`,
        { method: 'POST' }
      )
      const previewPath = data.path ?? new URL(data.url).pathname
      setPreviewUrl(`${API_URL}${previewPath}`)
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Failed to load preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function downloadFile(fileToDownload?: FileItem) {
    const target = fileToDownload ?? activeFile
    if (!target?.id) return
    try {
      const response = await fetch(`${API_URL}/files/${target.id}/download`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      })
      if (!response.ok) throw new Error('Download failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = target.name
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Download failed')
    } finally {
      setContextMenu({ x: 0, y: 0, file: null })
    }
  }

  async function renameFile(event: FormEvent) {
    event.preventDefault()
    if (!activeFile?.id) return
    try {
      await apiFetch(`/files/${activeFile.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: renameValue }),
      })
      setRenameOpen(false)
      showNotification(`File renamed to "${renameValue}"`)
      await loadStarred()
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Rename failed')
    }
  }

  async function moveFile(event: FormEvent) {
    event.preventDefault()
    const selectedIds = [...selectedFileIds]
    try {
      if (selectedIds.length > 0) {
        await apiFetch('/files/batch', {
          method: 'PATCH',
          body: JSON.stringify({ fileIds: selectedIds, folderId: selectedFolderId || null }),
        })
      } else if (activeFile?.id) {
        await apiFetch(`/files/${activeFile.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ folderId: selectedFolderId || null }),
        })
      }
      setMoveOpen(false)
      setSelectedFolderId('')
      clearSelection()
      showNotification('File(s) moved successfully')
      await loadStarred()
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Move failed')
    }
  }

  async function deleteFile() {
    const selectedIds = [...selectedFileIds]
    try {
      if (selectedIds.length > 0) {
        await apiFetch('/files/batch', {
          method: 'DELETE',
          body: JSON.stringify({ fileIds: selectedIds }),
        })
      } else if (activeFile?.id) {
        await apiFetch(`/files/${activeFile.id}`, { method: 'DELETE' })
      }
      setDeleteOpen(false)
      clearSelection()
      showNotification('Moved to trash')
      await loadStarred()
      window.dispatchEvent(new Event('9drive:storage-changed'))
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Delete failed')
    }
  }

  function shareFile(fileToShare?: FileItem) {
    const target = fileToShare ?? activeFile
    if (!target?.id) return
    setActiveFile(target)
    setShareOpen(true)
    setContextMenu({ x: 0, y: 0, file: null })
  }

  async function copyShareLinkDirect(fileToCopy?: FileItem) {
    const target = fileToCopy ?? activeFile
    if (!target) return
    try {
      let url = target.driveUrl
      if (!url && target.id) {
        const data = await apiFetch<{ url: string }>(`/files/${target.id}/share`, { method: 'POST' })
        url = data.url
      }
      if (url) {
        await navigator.clipboard.writeText(url)
        showNotification('Google Drive link copied to clipboard!')
      }
    } catch (err: any) {
      showNotification('Failed to copy link: ' + (err.message || err))
    }
    setContextMenu({ x: 0, y: 0, file: null })
  }

  function closePreview() {
    setPreviewUrl('')
    setPreviewError('')
    setPreviewLoading(false)
    setPreviewOpen(false)
  }

  const activePreviewKind = activeFile ? getPreviewKind(activeFile.mimeType) : null

  return (
    <div className="flex flex-col gap-3">
      {/* Google Drive Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <h1 className="text-[22px] font-normal tracking-tight text-[#1F1F1F] dark:text-[#E3E3E3]">
          {t('nav.starred', 'Starred')}
        </h1>

        <div className="flex items-center gap-1.5">
          <div className="inline-flex items-center rounded-full border border-[#E0E3E7] dark:border-[#444746] bg-white dark:bg-[#1E1F20] p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#C2E7FF] text-[#001D35] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                  : 'text-[#444746] hover:bg-[#F0F4F9] dark:text-[#C4C7C5] dark:hover:bg-[#282A2C]'
              }`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#C2E7FF] text-[#001D35] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                  : 'text-[#444746] hover:bg-[#F0F4F9] dark:text-[#C4C7C5] dark:hover:bg-[#282A2C]'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <div className="w-36">
          <Select
            variant="chip"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: 'all', label: t('filter.all', 'Type: All') },
              { value: 'docs', label: t('filter.docs', 'Documents') },
              { value: 'images', label: t('filter.images', 'Images') },
              { value: 'videos', label: t('filter.videos', 'Videos') },
              { value: 'pdfs', label: t('filter.pdfs', 'PDFs') },
            ]}
          />
        </div>
      </div>

      {/* Selection Action Bar */}
      {selectedFileIds.size > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-[#C2E7FF]/50 px-4 py-2 text-sm text-[#001D35] dark:bg-[#004A77]/40 dark:text-[#C2E7FF]">
          <div className="flex items-center gap-3">
            <span className="font-medium">{selectedFileIds.size} {t('action.selected', 'selected')}</span>
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs underline hover:opacity-80"
            >
              {t('action.clear_selection', 'Clear selection')}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {selectedFileIds.size === 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const selectedId = Array.from(selectedFileIds)[0]
                    const target = filteredFiles.find((f) => f.id === selectedId)
                    if (target) shareFile(target)
                  }}
                  className="h-8 gap-1.5 rounded-full border-[#747775]/40 text-[#0B57D0] hover:bg-[#0B57D0]/10 hover:border-[#0B57D0] dark:border-[#747775]/60 dark:text-[#A8C7FA]"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {t('action.share', 'Share')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const selectedId = Array.from(selectedFileIds)[0]
                    const target = filteredFiles.find((f) => f.id === selectedId)
                    if (target) copyShareLinkDirect(target)
                  }}
                  className="h-8 gap-1.5 rounded-full border-[#747775]/40 text-[#444746] hover:bg-black/5 dark:border-[#747775]/60 dark:text-[#C4C7C5]"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  {t('action.copy_link', 'Copy link')}
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="h-8 gap-1.5 text-xs text-[#B3261E] hover:bg-[#F9DEDC]/50 dark:text-[#F2B8B5]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('action.delete', 'Move to trash')}
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0B57D0] border-t-transparent" />
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#EDF2FC] dark:bg-[#1E1F20] text-[#FBBC04]">
            <Star className="h-10 w-10 stroke-[1.5] fill-[#FBBC04]" />
          </div>
          <h2 className="mt-5 text-lg font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
            {t('starred.empty_title', 'No starred files')}
          </h2>
          <p className="mt-1 max-w-sm text-sm text-[#747775] dark:text-[#8E918F]">
            {t('starred.empty_desc', 'Add stars to files that you want to easily find later.')}
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] overflow-hidden">
          <FileTable
            files={filteredFiles}
            mode="starred"
            selectedFileIds={selectedFileIds}
            allSelected={allVisibleSelected}
            onToggleFile={toggleFileSelection}
            onToggleAll={toggleAllVisibleFiles}
            onFileContextMenu={openContext}
            onFileDoubleClick={viewFile}
            onShare={(f) => shareFile(f)}
          />
        </div>
      ) : (
        <FileGrid
          files={filteredFiles}
          selectedFileIds={selectedFileIds}
          onToggleFile={toggleFileSelection}
          onFileContextMenu={openContext}
          onFileDoubleClick={viewFile}
          onShare={(f) => shareFile(f)}
        />
      )}

      {/* Context Menu */}
      <FileContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        file={contextMenu.file}
        onClose={() => setContextMenu({ x: 0, y: 0, file: null })}
        onView={() => viewFile()}
        onDownload={() => downloadFile()}
        onRename={() => {
          setRenameValue(activeFile?.name ?? '')
          setRenameOpen(true)
          setContextMenu({ x: 0, y: 0, file: null })
        }}
        onMove={() => {
          setMoveOpen(true)
          setContextMenu({ x: 0, y: 0, file: null })
        }}
        onDetails={() => {
          setDetailOpen(true)
          setContextMenu({ x: 0, y: 0, file: null })
        }}
        onShare={() => shareFile()}
        onCopyLink={() => copyShareLinkDirect()}
        onDelete={() => {
          setDeleteOpen(true)
          setContextMenu({ x: 0, y: 0, file: null })
        }}
      />

      {/* File Details Drawer */}
      <FileDetailsDrawer
        open={detailOpen}
        file={activeFile}
        onClose={() => setDetailOpen(false)}
        onShare={(f) => shareFile(f)}
      />

      {/* Rename Modal */}
      <DummyModal
        open={renameOpen}
        title="Rename"
        description={activeFile?.name ?? ''}
        onClose={() => setRenameOpen(false)}
      >
        <form onSubmit={renameFile} className="grid gap-4">
          <Input
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button>OK</Button>
          </div>
        </form>
      </DummyModal>

      {/* Move Modal */}
      <DummyModal
        open={moveOpen}
        title="Move"
        description={
          selectedFileIds.size > 0
            ? `Move ${selectedFileIds.size} files`
            : activeFile?.name ?? ''
        }
        onClose={() => setMoveOpen(false)}
      >
        <form onSubmit={moveFile} className="grid gap-4">
          <Select
            variant="default"
            value={selectedFolderId}
            onChange={setSelectedFolderId}
            options={[
              { value: '', label: 'My Drive (Root)' },
              ...allFolders.map((folder) => ({
                value: folder.id ?? '',
                label: folder.name,
              })),
            ]}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setMoveOpen(false)}>
              Cancel
            </Button>
            <Button>Move here</Button>
          </div>
        </form>
      </DummyModal>

      {/* Delete / Trash Modal */}
      <DummyModal
        open={deleteOpen}
        title="Move to trash?"
        description={
          selectedFileIds.size > 0
            ? `Delete ${selectedFileIds.size} files from Google Drive?`
            : `Delete "${activeFile?.name ?? 'file'}"?`
        }
        onClose={() => setDeleteOpen(false)}
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={deleteFile}>
            Move to trash
          </Button>
        </div>
      </DummyModal>

      {/* Share Modal */}
      <ShareModal
        open={shareOpen}
        file={activeFile}
        onClose={() => setShareOpen(false)}
      />

      {/* File Preview Modal */}
      <DummyModal
        open={previewOpen}
        title="File Preview"
        description={activeFile?.name ?? ''}
        onClose={closePreview}
        className="overflow-hidden sm:max-w-[95vw] xl:max-w-[1400px]"
      >
        <div className="flex h-[72dvh] w-full items-center justify-center overflow-hidden rounded-xl border border-[#E0E3E7] bg-[#F8FAFD] dark:border-[#36373A] dark:bg-[#131314] sm:h-[80vh]">
          {previewLoading ? (
            <div className="p-6 text-center text-sm font-semibold text-[#747775] dark:text-[#8E918F]">
              Loading preview...
            </div>
          ) : null}
          {previewError ? (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <p className="text-sm text-red-600 dark:text-red-400">{previewError}</p>
              {activeFile?.driveUrl ? (
                <Button variant="outline" onClick={() => window.open(activeFile.driveUrl, '_blank')}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Open in Google Drive
                </Button>
              ) : null}
            </div>
          ) : null}
          {!previewLoading && !previewError && activePreviewKind === 'image' && previewUrl ? (
            <img
              src={previewUrl}
              alt={activeFile?.name ?? 'File preview'}
              className="max-h-full max-w-full object-contain"
              onError={() => setPreviewError('Failed to load preview.')}
            />
          ) : null}
          {!previewLoading && !previewError && activePreviewKind === 'video' && previewUrl ? (
            <div className="shared-video-shell">
              <video
                controls
                playsInline
                preload="metadata"
                onError={() => setPreviewError('Failed to load preview.')}
              >
                <source src={previewUrl} type={activeFile?.mimeType} />
              </video>
            </div>
          ) : null}
          {!previewLoading && !previewError && activePreviewKind === 'document' && previewUrl ? (
            <iframe
              src={previewUrl}
              title={activeFile?.name ?? 'File preview'}
              className="h-full w-full border-0 bg-white dark:bg-[#1E1F20]"
            />
          ) : null}
          {!previewLoading && !previewError && activePreviewKind === 'office' && previewUrl ? (
            <iframe
              src={officeViewerUrl(previewUrl)}
              title={activeFile?.name ?? 'File preview'}
              className="h-full w-full border-0 bg-white dark:bg-[#1E1F20]"
            />
          ) : null}
          {!previewLoading && !previewError && !activePreviewKind ? (
            <div className="flex flex-col items-center gap-3 p-6 text-center text-sm text-[#747775] dark:text-[#8E918F]">
              <p>Preview not available directly in app for this file type.</p>
              {activeFile?.driveUrl ? (
                <Button onClick={() => window.open(activeFile.driveUrl, '_blank')}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Open in Google Drive
                </Button>
              ) : (
                <Button onClick={() => downloadFile(activeFile ?? undefined)}>Download file</Button>
              )}
            </div>
          ) : null}
        </div>
      </DummyModal>


    </div>
  )
}
