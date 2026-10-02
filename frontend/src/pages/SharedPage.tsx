import { useEffect, useState, type FormEvent, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ExternalLink,
  Folder as FolderIcon,
  LayoutGrid,
  Link2,
  List,
  Mail,
  Share2,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { FileGrid } from '@/components/drive/FileGrid'
import { FileTable } from '@/components/drive/FileTable'
import { FolderGrid } from '@/components/drive/FolderGrid'
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
import { cn } from '@/lib/utils'

type BackendFile = {
  id: string
  name: string
  mimeType: string
  sizeBytes: string
  createdAt: string
  updatedAt?: string
  sharedWithMeTime?: string
  owner?: string
  folderId?: string | null
  providerFileId?: string
  driveUrl?: string | null
  connectedAccount?: { id: string; email: string; provider: string }
  folder?: { id: string; name: string } | null
}

type BackendFolder = {
  id: string
  name: string
  updated: string
  color: string
  iconUrl?: string | null
  providerFolderId?: string | null
  driveUrl?: string
  owner?: string
  connectedAccount?: { id: string; email: string; provider: string }
}

type InviteTarget = {
  id: string
  name: string
  type: 'file' | 'folder'
  mimeType?: string
  sizeBytes?: string
}

type Invite = {
  id: string
  email: string
  role: string
  status: string
  targetType: 'file' | 'folder'
  targetId: string
  target: InviteTarget | null
  createdAt: string
  acceptedAt: string | null
  user: { id: string; name: string; email: string } | null
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
    date: file.sharedWithMeTime ? formatDate(file.sharedWithMeTime) : formatDate(file.createdAt),
    size: formatBytes(file.sizeBytes),
    access: file.connectedAccount?.email ?? 'Google Drive',
    kind: mimeToKind(file.mimeType),
    shared: 1,
    owner: file.owner || 'Shared',
    folderId: file.folderId,
    folderName: file.folder?.name,
    providerFileId: file.providerFileId,
    driveUrl,
  }
}

export function SharedPage() {
  const navigate = useNavigate()
  const { selectedAccountId } = useDriveFilter()

  // Google Drive Shared files & folders
  const [fileList, setFileList] = useState<FileItem[]>([])
  const [folderList, setFolderList] = useState<FolderItem[]>([])
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
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewError, setPreviewError] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const { toast } = useToast()
  const { t } = useLanguage()

  // Internal workspace invites
  const [activeTab, setActiveTab] = useState<'shared' | 'invites'>('shared')
  const [sentInvites, setSentInvites] = useState<Invite[]>([])
  const [receivedInvites, setReceivedInvites] = useState<Invite[]>([])

  async function loadShared() {
    setLoading(true)
    try {
      const path =
        selectedAccountId && selectedAccountId !== 'all'
          ? `/files/shared?accountId=${selectedAccountId}`
          : '/files/shared'
      const data = await apiFetch<{ files: BackendFile[]; folders: BackendFolder[] }>(path)
      if (data.files && data.files.length > 0) {
        setFileList(data.files.map(mapFile))
      } else {
        setFileList([])
      }
      if (data.folders && data.folders.length > 0) {
        setFolderList(
          data.folders.map((f) => ({
            id: f.id,
            name: f.name,
            updated: formatDate(f.updated),
            color: f.color || 'text-blue-500',
            iconUrl: f.iconUrl,
            providerFolderId: f.providerFolderId,
            driveUrl: f.driveUrl,
          }))
        )
      } else {
        setFolderList([])
      }
    } catch {
      setFileList([])
      setFolderList([])
    } finally {
      setLoading(false)
    }
  }

  async function loadInvites() {
    try {
      const data = await apiFetch<{ sent: Invite[]; received: Invite[] }>('/invites')
      setSentInvites(data.sent ?? [])
      setReceivedInvites(data.received ?? [])
    } catch {
      setSentInvites([])
      setReceivedInvites([])
    }
  }

  useEffect(() => {
    loadShared()
    loadInvites()
    const handleStorageChanged = () => {
      loadShared()
    }
    const handleInvitesChanged = () => {
      loadInvites()
    }
    window.addEventListener('9drive:storage-changed', handleStorageChanged)
    window.addEventListener('9drive:invites-changed', handleInvitesChanged)
    return () => {
      window.removeEventListener('9drive:storage-changed', handleStorageChanged)
      window.removeEventListener('9drive:invites-changed', handleInvitesChanged)
    }
  }, [selectedAccountId])

  function showNotification(text: string) {
    if (text.toLowerCase().includes('success') || text.toLowerCase().includes('copied') || text.toLowerCase().includes('renamed') || text.toLowerCase().includes('moved') || text.toLowerCase().includes('revoked')) {
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
      await loadShared()
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Rename failed')
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
        showNotification('Link copied to clipboard!')
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

  function handleFolderOpen(folder: FolderItem) {
    if (folder.id) {
      navigate(`/?folderId=${folder.id}`)
    } else if (folder.driveUrl) {
      window.open(folder.driveUrl, '_blank')
    }
  }

  async function revokeInvite(id: string) {
    await apiFetch(`/invites/${id}`, { method: 'DELETE' })
    await loadInvites()
    showNotification('Invite revoked')
  }

  const activePreviewKind = activeFile ? getPreviewKind(activeFile.mimeType) : null
  const totalSharedCount = fileList.length + folderList.length

  return (
    <div className="flex flex-col gap-3">
      {/* Google Drive Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-normal tracking-tight text-[#1F1F1F] dark:text-[#E3E3E3]">
            {t('shared.title', 'Shared with me')}
          </h1>
          <span className="rounded-full bg-[#EDF2FC] px-2.5 py-0.5 text-xs font-medium text-[#0B57D0] dark:bg-[#1E1F20] dark:text-[#A8C7FA]">
            {totalSharedCount} {t('shared.items', 'items')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Selector: Shared Files vs Internal Invites */}
          <div className="inline-flex items-center rounded-full border border-[#E0E3E7] dark:border-[#444746] bg-white dark:bg-[#1E1F20] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('shared')}
              className={cn(
                'rounded-full px-3 py-1.5 font-medium transition-colors',
                activeTab === 'shared'
                  ? 'bg-[#C2E7FF] text-[#001D35] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                  : 'text-[#444746] hover:bg-[#F0F4F9] dark:text-[#C4C7C5] dark:hover:bg-[#282A2C]'
              )}
            >
              {t('shared.tab_files', 'Google Drive Files')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('invites')}
              className={cn(
                'rounded-full px-3 py-1.5 font-medium transition-colors flex items-center gap-1',
                activeTab === 'invites'
                  ? 'bg-[#C2E7FF] text-[#001D35] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                  : 'text-[#444746] hover:bg-[#F0F4F9] dark:text-[#C4C7C5] dark:hover:bg-[#282A2C]'
              )}
            >
              <span>{t('shared.tab_invites', 'Workspace Invites')}</span>
              {(sentInvites.length > 0 || receivedInvites.length > 0) && (
                <span className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                  {sentInvites.length + receivedInvites.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'shared' && (
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
          )}
        </div>
      </div>

      {activeTab === 'shared' ? (
        <>
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
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const selectedId = Array.from(selectedFileIds)[0]
                    const target = filteredFiles.find((f) => f.id === selectedId)
                    if (target) downloadFile(target)
                  }}
                  className="h-8 gap-1.5 text-xs"
                >
                  {t('action.download', 'Download')}
                </Button>
              </div>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0B57D0] border-t-transparent" />
            </div>
          ) : folderList.length === 0 && filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#EDF2FC] dark:bg-[#1E1F20] text-[#0B57D0] dark:text-[#A8C7FA]">
                <Share2 className="h-12 w-12 stroke-[1.5]" />
              </div>
              <h2 className="mt-5 text-lg font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                {t('shared.empty_title', 'No files shared with you')}
              </h2>
              <p className="mt-1.5 max-w-sm text-sm text-[#747775] dark:text-[#8E918F]">
                {t('shared.empty_desc', 'Files and folders that people share with your connected Google accounts will automatically appear here.')}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Shared Folders Section */}
              {folderList.length > 0 && (
                <div>
                  <h2 className="text-xs font-medium uppercase tracking-wider text-[#747775] dark:text-[#8E918F] mb-2">
                    {t('section.folders', 'Folders')}
                  </h2>
                  <FolderGrid
                    items={folderList}
                    onFolderOpen={handleFolderOpen}
                    onFolderMenu={(event, folder) => {
                      event.preventDefault()
                      if (folder.driveUrl) window.open(folder.driveUrl, '_blank')
                    }}
                  />
                </div>
              )}

              {/* Shared Files Section */}
              {filteredFiles.length > 0 && (
                <div>
                  {folderList.length > 0 && (
                    <h2 className="text-xs font-medium uppercase tracking-wider text-[#747775] dark:text-[#8E918F] mb-2">
                      {t('section.files', 'Files')}
                    </h2>
                  )}

                  {viewMode === 'list' ? (
                    <FileTable
                      mode="shared"
                      files={filteredFiles}
                      selectedFileIds={selectedFileIds}
                      allSelected={allVisibleSelected}
                      onToggleFile={toggleFileSelection}
                      onToggleAll={toggleAllVisibleFiles}
                      onFileDoubleClick={viewFile}
                      onFileContextMenu={openContext}
                      onShare={shareFile}
                    />
                  ) : (
                    <FileGrid
                      files={filteredFiles}
                      selectedFileIds={selectedFileIds}
                      onToggleFile={toggleFileSelection}
                      onFileDoubleClick={viewFile}
                      onFileContextMenu={openContext}
                      onShare={shareFile}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Workspace Invites Tab */
        <div className="space-y-8 mt-2">
          {/* Shared With You */}
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wider text-[#747775] dark:text-[#8E918F] mb-3">
              Invites Received
            </h2>
            {receivedInvites.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-[#E0E3E7] bg-[#F8FAFD] dark:border-[#36373A] dark:bg-[#28292A]">
                <Mail className="h-8 w-8 text-[#747775] mb-2" />
                <p className="text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">No workspace invites received</p>
                <p className="text-xs text-[#747775] mt-0.5">Invites shared specifically with your 9Drive email will appear here.</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {receivedInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex flex-col gap-3 rounded-xl border border-[#E0E3E7] bg-white p-3.5 transition-colors hover:bg-[#F0F4F9] sm:flex-row sm:items-center sm:justify-between dark:border-[#36373A] dark:bg-[#1E1F20] dark:hover:bg-[#28292A]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FolderIcon className="h-5 w-5 text-[#0B57D0]" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                          {invite.target?.name ?? 'Unavailable resource'}
                        </p>
                        <p className="text-xs text-[#747775] capitalize dark:text-[#8E918F]">
                          {invite.targetType} • {invite.role}
                          {invite.target?.sizeBytes ? ` • ${formatBytes(invite.target.sizeBytes)}` : ''}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'w-fit rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                        invite.status === 'accepted'
                          ? 'bg-[#C2E7FF] text-[#001D35] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                      )}
                    >
                      {invite.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invites You Sent */}
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wider text-[#747775] dark:text-[#8E918F] mb-3">
              Invites Sent by You
            </h2>
            {sentInvites.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-[#E0E3E7] bg-[#F8FAFD] dark:border-[#36373A] dark:bg-[#28292A]">
                <Users className="h-8 w-8 text-[#747775] mb-2" />
                <p className="text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">No invites sent</p>
                <p className="text-xs text-[#747775] mt-0.5">Use Share on any file or folder to collaborate with teammates.</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {sentInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex flex-col gap-3 rounded-xl border border-[#E0E3E7] bg-white p-3.5 transition-colors hover:bg-[#F0F4F9] sm:flex-row sm:items-center sm:justify-between dark:border-[#36373A] dark:bg-[#1E1F20] dark:hover:bg-[#28292A]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FolderIcon className="h-5 w-5 text-[#0B57D0]" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                          {invite.target?.name ?? 'Unavailable resource'}
                        </p>
                        <p className="truncate text-xs text-[#747775] dark:text-[#8E918F]">
                          Shared with {invite.email} • {invite.role}
                        </p>
                        <p className="text-[11px] text-[#747775] dark:text-[#8E918F]">
                          Invited {formatDate(invite.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                          invite.status === 'accepted'
                            ? 'bg-[#C2E7FF] text-[#001D35] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                        )}
                      >
                        {invite.status}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => revokeInvite(invite.id)}>
                        <Trash2 className="h-4 w-4 text-[#B3261E]" /> Revoke
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Context Menu */}
      <FileContextMenu
        file={contextMenu.file}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={() => setContextMenu({ x: 0, y: 0, file: null })}
        onView={() => viewFile()}
        onDownload={() => downloadFile()}
        onRename={() => {
          if (!activeFile) return
          setRenameValue(activeFile.name)
          setRenameOpen(true)
          setContextMenu({ x: 0, y: 0, file: null })
        }}
        onMove={() => {
          setContextMenu({ x: 0, y: 0, file: null })
        }}
        onShare={() => shareFile()}
        onCopyLink={() => copyShareLinkDirect()}
        onDetails={() => {
          setDetailOpen(true)
          setContextMenu({ x: 0, y: 0, file: null })
        }}
        onDelete={() => {
          setContextMenu({ x: 0, y: 0, file: null })
        }}
      />

      {/* File Details Drawer */}
      <FileDetailsDrawer
        open={detailOpen}
        file={activeFile}
        onClose={() => setDetailOpen(false)}
      />

      {/* Rename Modal */}
      <DummyModal
        open={renameOpen}
        title="Rename file"
        description="Enter a new name for this file"
        onClose={() => setRenameOpen(false)}
      >
        <form onSubmit={renameFile} className="mt-4 flex flex-col gap-4">
          <Input
            value={renameValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRenameValue(e.target.value)}
            placeholder="File name"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
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
