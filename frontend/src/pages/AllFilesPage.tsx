import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent, type MouseEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, ClipboardPaste, Copy, Download, ExternalLink, FolderInput, FolderPlus, HardDrive, Info, LayoutGrid, Link2, List, RefreshCw, Settings, Sparkles, Trash2, Upload, UserPlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/context/ToastContext'
import { DummyModal } from '@/components/drive/DummyModal'
import { ShareModal, type ShareFileTarget } from '@/components/drive/ShareModal'
import { EmptyAreaContextMenu } from '@/components/drive/EmptyAreaContextMenu'
import { FileContextMenu } from '@/components/drive/FileContextMenu'
import { FileDetailsDrawer } from '@/components/drive/FileDetailsDrawer'
import { FileGrid } from '@/components/drive/FileGrid'
import { FileTable } from '@/components/drive/FileTable'
import { FolderContextMenu } from '@/components/drive/FolderContextMenu'
import { FolderGrid } from '@/components/drive/FolderGrid'
import { defaultFolderColor, defaultFolderIconUrl, folderColorOptions, folderIconOptions, normalizeFolderColor } from '@/components/drive/FolderVisual'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { API_URL, apiFetch, formatBytes, formatDate } from '@/lib/api'
import { getAccessToken } from '@/lib/auth'
import { createPlyr, ensurePlyr } from '@/lib/plyr'
import { getPreviewKind, officeViewerUrl } from '@/lib/preview'
import type { FileItem, FolderItem } from '@/data/drive-data'
import { useUpload } from '@/context/UploadContext'
import { useDriveFilter } from '@/context/DriveFilterContext'
import { useLanguage } from '@/context/LanguageContext'
import { useDriveLayoutActions } from '@/layouts/DriveLayout'
import { cn } from '@/lib/utils'

type BackendFile = { id: string; name: string; mimeType: string; sizeBytes: string; createdAt: string; folderId?: string | null; providerFileId?: string; driveUrl?: string | null; connectedAccount?: { email: string; provider: string }; folder?: { id: string; name: string } | null }
type BackendFolder = { id: string; name: string; color: string; iconUrl?: string | null; parentId?: string | null; providerFolderId?: string | null; driveUrl?: string | null; updatedAt: string }
type ConnectedAccount = { id: string; provider: string; email: string; displayName?: string | null; status: string }

type FileViewMode = 'list' | 'grid'

const fileViewStorageKey = '9drive:all-files-view-mode'

function getStoredFileViewMode(): FileViewMode {
  const stored = localStorage.getItem(fileViewStorageKey)
  return stored === 'grid' || stored === 'list' ? stored : 'list'
}

function mimeToKind(mimeType: string): FileItem['kind'] {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.includes('pdf')) return 'pdf'
  return 'doc'
}

function providerLabel(provider: string | undefined) {
  if (provider === 's3') return 'S3 Storage'
  return 'Google Drive'
}

function mapFile(file: BackendFile): FileItem {
  const driveUrl = file.driveUrl ?? (file.providerFileId ? `https://drive.google.com/file/d/${file.providerFileId}/view?usp=sharing` : undefined)
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    createdAt: file.createdAt,
    accountEmail: file.connectedAccount?.email,
    accountProvider: providerLabel(file.connectedAccount?.provider),
    date: formatDate(file.createdAt),
    size: formatBytes(file.sizeBytes),
    access: file.connectedAccount?.email ?? providerLabel(file.connectedAccount?.provider),
    kind: mimeToKind(file.mimeType),
    shared: 1,
    folderId: file.folderId,
    folderName: file.folder?.name,
    providerFileId: file.providerFileId,
    driveUrl,
  }
}

function mapFolder(folder: BackendFolder): FolderItem {
  const driveUrl = folder.driveUrl ?? (folder.providerFolderId ? `https://drive.google.com/drive/folders/${folder.providerFolderId}` : undefined)
  return {
    id: folder.id,
    name: folder.name,
    color: folder.color,
    iconUrl: folder.iconUrl,
    parentId: folder.parentId,
    providerFolderId: folder.providerFolderId,
    driveUrl,
    updated: `Updated ${formatDate(folder.updatedAt)}`,
  }
}



function FolderAppearanceFields({ color, iconUrl, onColorChange, onIconChange }: { color: string; iconUrl: string; onColorChange: (color: string) => void; onIconChange: (iconUrl: string) => void }) {
  const normalizedColor = normalizeFolderColor(color)
  return (
    <div className="grid gap-4">
      <label className="grid gap-2 text-sm font-semibold">Folder Color<Input type="color" value={normalizedColor} onChange={(event) => onColorChange(event.target.value)} className="h-12 p-1" /></label>
      <div className="flex flex-wrap gap-2">{folderColorOptions.map((option) => <button key={option} type="button" onClick={() => onColorChange(option)} className={normalizedColor === option ? 'h-8 w-8 rounded-lg border-2 border-blue-600' : 'h-8 w-8 rounded-lg border border-slate-200'} style={{ backgroundColor: option }} aria-label={`Use ${option} folder color`} />)}</div>
      <div className="grid gap-2 text-sm font-semibold"><span>Folder Icon</span><div className="grid grid-cols-4 gap-2 sm:grid-cols-8">{folderIconOptions.map((option) => <button key={option.url} type="button" onClick={() => onIconChange(option.url)} className={iconUrl === option.url ? 'flex h-12 items-center justify-center rounded-xl border-2 border-blue-600 bg-blue-50 p-2' : 'flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2 hover:bg-slate-100'} title={option.label} aria-label={`Use ${option.label} icon`}><img src={`${option.url}?color=${encodeURIComponent(normalizedColor)}`} alt="" className="h-6 w-6" /></button>)}</div></div>
    </div>
  )
}

export function AllFilesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeFolderId = searchParams.get('folderId')
  const searchQuery = searchParams.get('q')?.trim() ?? ''
  const [uploadOpen, setUploadOpen] = useState(false)
  const fileUploadInputRef = useRef<HTMLInputElement>(null)
  const [isPageDragging, setIsPageDragging] = useState(false)
  const dragCounter = useRef(0)
  const [folderOpen, setFolderOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [folderRenameOpen, setFolderRenameOpen] = useState(false)
  const [folderDeleteOpen, setFolderDeleteOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareTarget, setShareTarget] = useState<ShareFileTarget | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewError, setPreviewError] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [files, setFiles] = useState<FileItem[]>([])
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [allFolders, setAllFolders] = useState<FolderItem[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState('')
  const [isUploadDragging, setIsUploadDragging] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [folderColor, setFolderColor] = useState(defaultFolderColor)
  const [folderIconUrl, setFolderIconUrl] = useState(defaultFolderIconUrl)
  const [renameValue, setRenameValue] = useState('')
  const [folderRenameValue, setFolderRenameValue] = useState('')
  const [folderRenameColor, setFolderRenameColor] = useState(defaultFolderColor)
  const [folderRenameIconUrl, setFolderRenameIconUrl] = useState(defaultFolderIconUrl)
  const [activeFile, setActiveFile] = useState<FileItem | null>(null)
  const [activeFolderForMenu, setActiveFolderForMenu] = useState<FolderItem | null>(null)
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const [cutFolder, setCutFolder] = useState<FolderItem | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileItem | null }>({ x: 0, y: 0, file: null })
  const [folderContextMenu, setFolderContextMenu] = useState<{ x: number; y: number; folder: FolderItem | null }>({ x: 0, y: 0, folder: null })
  const [emptyContextMenu, setEmptyContextMenu] = useState<{ x: number; y: number; open: boolean }>({ x: 0, y: 0, open: false })
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [syncingDrive, setSyncingDrive] = useState(false)
  const [fileViewMode, setFileViewMode] = useState<FileViewMode>(getStoredFileViewMode)
  const { uploadFiles } = useUpload()
  const { selectedAccountId, getDriveLetter } = useDriveFilter()
  const previewVideoRef = useRef<HTMLVideoElement | null>(null)
  const { setHeaderActions } = useDriveLayoutActions()
  const { language, t } = useLanguage()
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([])
  const [selectedTargetAccountId, setSelectedTargetAccountId] = useState('')
  const [dismissStorageBanner, setDismissStorageBanner] = useState(false)
  const [showGoogleGuideModal, setShowGoogleGuideModal] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<{ hasUpdate: boolean; latestVersion: string; currentVersion: string } | null>(null)
  const [dismissUpdateBanner, setDismissUpdateBanner] = useState(false)

  async function loadFiles() {
    const params = new URLSearchParams()
    if (activeFolderId) params.set('folderId', activeFolderId)
    if (searchQuery) params.set('q', searchQuery)

    // Add advanced search filters
    const kind = searchParams.get('kind')
    const accountId = searchParams.get('accountId')
    const modified = searchParams.get('modified')
    const minSize = searchParams.get('minSize')
    const maxSize = searchParams.get('maxSize')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (kind && kind !== 'all') params.set('kind', kind)
    if (accountId) {
      if (accountId !== 'all') params.set('accountId', accountId)
    } else if (selectedAccountId && selectedAccountId !== 'all') {
      // Global drive filter applies whether searching or not!
      params.set('accountId', selectedAccountId)
    }
    if (modified && modified !== 'all') params.set('modified', modified)
    if (minSize) params.set('minSize', minSize)
    if (maxSize) params.set('maxSize', maxSize)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)

    const query = params.toString()
    const path = query ? `/files?${query}` : '/files'
    const data = await apiFetch<{ files: BackendFile[] }>(path)
    setFiles(data.files.map(mapFile))
  }

  async function loadFolders() {
    const folderParams = new URLSearchParams()
    if (activeFolderId) folderParams.set('parentId', activeFolderId)
    const effectiveAccountId = searchParams.get('accountId') || (selectedAccountId !== 'all' ? selectedAccountId : '')
    if (effectiveAccountId && effectiveAccountId !== 'all') {
      folderParams.set('accountId', effectiveAccountId)
    }
    const folderQueryStr = folderParams.toString()
    const visiblePath = folderQueryStr ? `/folders?${folderQueryStr}` : '/folders'

    const allParams = new URLSearchParams({ all: '1' })
    if (effectiveAccountId && effectiveAccountId !== 'all') {
      allParams.set('accountId', effectiveAccountId)
    }

    const [visibleData, allData] = await Promise.all([
      apiFetch<{ folders: BackendFolder[] }>(visiblePath),
      apiFetch<{ folders: BackendFolder[] }>(`/folders?${allParams.toString()}`),
    ])
    setFolders(visibleData.folders.map(mapFolder))
    setAllFolders(allData.folders.map(mapFolder))
  }

  async function loadAll() {
    await Promise.all([loadFiles(), loadFolders()])
  }

  async function handleDropItem(fileId: string, targetFolderId: string) {
    const fileIds = selectedFileIds.has(fileId) ? Array.from(selectedFileIds) : [fileId]
    setLoading(true)
    try {
      await apiFetch('/files/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds, folderId: targetFolderId })
      })
      toast.success(`Successfully moved ${fileIds.length} item(s).`)
      loadAll().catch(() => undefined)
      setSelectedFileIds(new Set())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to move items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll().catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load files'))
    setSelectedFileIds(new Set())
  }, [
    activeFolderId,
    searchQuery,
    selectedAccountId,
    searchParams.get('accountId'),
    searchParams.get('kind'),
    searchParams.get('modified'),
  ])

  const previewFileId = searchParams.get('previewFileId')
  useEffect(() => {
    if (!previewFileId) return
    const found = files.find((f) => f.id === previewFileId)
    if (found) {
      openFilePreview(found)
    }
  }, [previewFileId, files])

  useEffect(() => {
    async function loadConnectedAccounts() {
      try {
        const data = await apiFetch<{ accounts: ConnectedAccount[] }>('/connected-accounts')
        setConnectedAccounts(data.accounts || [])
      } catch (error) {
        console.error('Failed to load connected accounts:', error)
      }
    }
    loadConnectedAccounts()
  }, [])

  useEffect(() => {
    async function checkVersion() {
      try {
        const data = await apiFetch<{ hasUpdate: boolean; latestVersion: string; currentVersion: string }>('/system/version')
        if (data && data.hasUpdate) {
          setUpdateInfo(data)
        }
      } catch {
        try {
          const res = await fetch('https://registry.npmjs.org/9drive/latest')
          if (res.ok) {
            const npmData = (await res.json()) as any
            if (npmData?.version && npmData.version !== '1.0.1') {
              setUpdateInfo({ hasUpdate: true, latestVersion: npmData.version, currentVersion: '1.0.1' })
            }
          }
        } catch {}
      }
    }
    checkVersion()
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setContextMenu({ x: 0, y: 0, file: null })
      if (event.key === 'Escape') setFolderContextMenu({ x: 0, y: 0, folder: null })
      if (event.key === 'Escape') setEmptyContextMenu({ x: 0, y: 0, open: false })
      if (event.ctrlKey && event.key.toLowerCase() === 'x' && activeFolderForMenu) {
        event.preventDefault()
        cutSelectedFolder(activeFolderForMenu)
      }
      if (event.ctrlKey && event.key.toLowerCase() === 'v' && cutFolder) {
        event.preventDefault()
        pasteFolder().catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to paste folder'))
      }
    }

    function onOpenMoveShortcut(e: Event) {
      const file = (e as CustomEvent).detail as FileItem
      setActiveFile(file)
      setSelectedFolderId(file.folderId || '')
      setMoveOpen(true)
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('9drive:open-move-modal', onOpenMoveShortcut)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('9drive:open-move-modal', onOpenMoveShortcut)
    }
  }, [activeFolderForMenu, cutFolder, activeFolderId])

  useEffect(() => {
    if (!previewOpen || !activeFile?.mimeType?.startsWith('video/') || !previewVideoRef.current) return undefined
    let disposed = false
    let player: { destroy: () => void } | null = null

    ensurePlyr().then(() => {
      if (disposed || !previewVideoRef.current) return
      player = createPlyr(previewVideoRef.current)
    }).catch(() => undefined)

    return () => {
      disposed = true
      player?.destroy()
    }
  }, [previewOpen, activeFile?.mimeType, previewUrl])

  async function createFolder(event: FormEvent) {
    event.preventDefault()
    await apiFetch('/folders', {
      method: 'POST',
      body: JSON.stringify({
        name: folderName,
        color: folderColor,
        iconUrl: folderIconUrl,
        parentId: activeFolderId ?? null,
        accountId: selectedAccountId !== 'all' ? selectedAccountId : undefined,
      }),
    })
    setFolderName('')
    setFolderColor(defaultFolderColor)
    setFolderIconUrl(defaultFolderIconUrl)
    setFolderOpen(false)
    await loadFolders()
  }

  async function startDirectUpload(filesToUpload: File[], targetFolderId?: string | null) {
    if (!filesToUpload || filesToUpload.length === 0) return
    const targetFolder = targetFolderId !== undefined ? targetFolderId : (activeFolderId || null)
    const targetAccountId = selectedTargetAccountId || (selectedAccountId !== 'all' ? selectedAccountId : null)
    try {
      await uploadFiles(filesToUpload, targetFolder, targetAccountId)
    } catch (err) {
      console.error('Direct upload failed:', err)
      toast.error('Upload initiation failed')
    }
  }

  function handlePageDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.types.includes('Files')) {
      setIsPageDragging(true)
    }
  }

  function handlePageDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setIsPageDragging(false)
    }
  }

  function handlePageDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
  }

  function handlePageDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setIsPageDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    if (dropped.length > 0) {
      startDirectUpload(dropped)
    }
  }

  async function uploadFile(event: FormEvent) {
    event.preventDefault()
    if (selectedFiles.length === 0) return
    setLoading(true)

    const uploadingFiles = [...selectedFiles]
    const targetFolderId = activeFolderId || selectedFolderId
    const targetAccountId = selectedTargetAccountId || (selectedAccountId !== 'all' ? selectedAccountId : null)

    setSelectedFiles([])
    setSelectedFolderId('')
    setSelectedTargetAccountId('')
    setUploadOpen(false)

    try {
      await uploadFiles(uploadingFiles, targetFolderId, targetAccountId)
    } catch (err) {
      console.error('Upload initiation failed:', err)
    } finally {
      setLoading(false)
    }
  }


  async function syncGoogleDrive() {
    setSyncingDrive(true)
    try {
      const response = await apiFetch<{ results: { created: number; updated: number; deleted: number }[] }>('/files/sync-google', { method: 'POST', body: JSON.stringify({}) })

      let created = 0, updated = 0, deleted = 0
      for (const res of response.results) {
        created += res.created
        updated += res.updated
        deleted += res.deleted
      }
      const accounts = response.results.length

      toast.success(`Google Drive synced. ${created} added, ${updated} updated, ${deleted} removed across ${accounts} account${accounts === 1 ? '' : 's'}.`)
      await loadAll()
      window.dispatchEvent(new Event('9drive:storage-changed'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to sync Google Drive')
    } finally {
      setSyncingDrive(false)
    }
  }

  function selectUploadFiles(files: FileList | File[] | null | undefined) {
    if (!files) return
    const nextFiles = Array.from(files)
    if (nextFiles.length === 0) return
    setSelectedFiles(nextFiles)
  }

  function removeUploadFile(index: number) {
    setSelectedFiles((files) => files.filter((_, fileIndex) => fileIndex !== index))
  }

  function handleUploadDrag(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.stopPropagation()
    if (event.type === 'dragenter' || event.type === 'dragover') setIsUploadDragging(true)
    if (event.type === 'dragleave' || event.type === 'drop') setIsUploadDragging(false)
    if (event.type === 'drop') selectUploadFiles(event.dataTransfer.files)
  }



  function openContext(event: MouseEvent<HTMLElement>, file: FileItem) {
    event.preventDefault()
    event.stopPropagation()
    setActiveFile(file)
    setContextMenu({ x: event.clientX, y: event.clientY, file })
  }

  function toggleFileSelection(file: FileItem) {
    if (!file.id) return
    setSelectedFileIds((current) => {
      const next = new Set(current)
      if (next.has(file.id!)) next.delete(file.id!)
      else next.add(file.id!)
      return next
    })
  }

  const sortBy = searchParams.get('sort') || 'date_desc'

  const sortedFolders = useMemo(() => {
    const list = [...(!activeFolderId ? folders : folders)]
    return list.sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' })
      if (sortBy === 'date_asc') return new Date(a.updated || 0).getTime() - new Date(b.updated || 0).getTime()
      return new Date(b.updated || 0).getTime() - new Date(a.updated || 0).getTime()
    })
  }, [folders, activeFolderId, sortBy])

  const sortedFiles = useMemo(() => {
    const list = [...files]
    return list.sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' })
      if (sortBy === 'size_desc') return Number(b.sizeBytes || 0) - Number(a.sizeBytes || 0)
      if (sortBy === 'size_asc') return Number(a.sizeBytes || 0) - Number(b.sizeBytes || 0)
      if (sortBy === 'date_asc') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return timeA - timeB
      }
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return timeB - timeA
    })
  }, [files, sortBy])

  function toggleAllVisibleFiles() {
    const visibleIds = sortedFiles.map((file) => file.id).filter(Boolean) as string[]
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedFileIds.has(id))
    setSelectedFileIds(allSelected ? new Set() : new Set(visibleIds))
  }

  function clearSelection() {
    setSelectedFileIds(new Set())
  }

  function changeFileViewMode(mode: FileViewMode) {
    setFileViewMode(mode)
    localStorage.setItem(fileViewStorageKey, mode)
  }

  function openFolderMenu(event: MouseEvent<HTMLElement>, folder: FolderItem) {
    event.preventDefault()
    event.stopPropagation()
    setActiveFolderForMenu(folder)
    setFolderContextMenu({ x: event.clientX, y: event.clientY, folder })
  }

  function openFolder(folder: FolderItem) {
    if (!folder.id) return
    setSearchParams(searchQuery ? { folderId: folder.id, q: searchQuery } : { folderId: folder.id })
  }

  function openFolderById(folderId: string) {
    setSearchParams(searchQuery ? { folderId, q: searchQuery } : { folderId })
  }

  function openEmptyContextMenu(event: MouseEvent<HTMLElement>) {
    event.preventDefault()
    setEmptyContextMenu({ x: event.clientX, y: event.clientY, open: true })
  }

  function closeFolder() {
    setSearchParams(searchQuery ? { q: searchQuery } : {})
  }

  async function openFilePreview(targetFile: FileItem) {
    setActiveFile(targetFile)
    setPreviewUrl('')
    setPreviewError('')
    setPreviewLoading(true)
    setPreviewOpen(true)
    setContextMenu({ x: 0, y: 0, file: null })
    try {
      const data = await apiFetch<{ path?: string; url: string }>(`/files/${targetFile.id}/preview-token`, { method: 'POST' })
      const previewPath = data.path ?? new URL(data.url).pathname
      setPreviewUrl(`${API_URL}${previewPath}`)
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Failed to load preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function viewFile() {
    if (!activeFile?.id) return
    await openFilePreview(activeFile)
  }

  async function downloadFile() {
    if (!activeFile?.id) return
    const response = await fetch(`${API_URL}/files/${activeFile.id}/download`, { headers: { Authorization: `Bearer ${getAccessToken()}` } })
    if (!response.ok) throw new Error('Download failed')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = activeFile.name
    link.click()
    URL.revokeObjectURL(url)
    setContextMenu({ x: 0, y: 0, file: null })
  }

  async function downloadBatchAsZip() {
    const selectedIds = [...selectedFileIds]
    if (selectedIds.length === 0) return
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/files/batch-download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({ fileIds: selectedIds })
      })
      if (!response.ok) throw new Error('Failed to download ZIP file')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = '9drive-download.zip'
      link.click()
      URL.revokeObjectURL(url)
      clearSelection()
      toast.success('Batch download complete.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Batch download failed')
    } finally {
      setLoading(false)
    }
  }


  async function renameFile(event: FormEvent) {
    event.preventDefault()
    if (!activeFile?.id) return
    await apiFetch(`/files/${activeFile.id}`, { method: 'PATCH', body: JSON.stringify({ name: renameValue }) })
    setRenameOpen(false)
    await loadFiles()
  }

  async function moveFile(event: FormEvent) {
    event.preventDefault()
    const selectedIds = [...selectedFileIds]
    if (selectedIds.length > 0) await apiFetch('/files/batch', { method: 'PATCH', body: JSON.stringify({ fileIds: selectedIds, folderId: selectedFolderId || null }) })
    else if (activeFile?.id) await apiFetch(`/files/${activeFile.id}`, { method: 'PATCH', body: JSON.stringify({ folderId: selectedFolderId || null }) })
    else return
    setMoveOpen(false)
    setSelectedFolderId('')
    clearSelection()
    await loadFiles()
  }

  async function deleteFile() {
    const selectedIds = [...selectedFileIds]
    if (selectedIds.length > 0) await apiFetch('/files/batch', { method: 'DELETE', body: JSON.stringify({ fileIds: selectedIds }) })
    else if (activeFile?.id) await apiFetch(`/files/${activeFile.id}`, { method: 'DELETE' })
    else return
    setDeleteOpen(false)
    clearSelection()
    await loadFiles()
    window.dispatchEvent(new Event('9drive:storage-changed'))
  }

  function shareFile(fileToShare?: FileItem | any) {
    const target = (fileToShare && typeof fileToShare === 'object' && 'id' in fileToShare && 'name' in fileToShare)
      ? fileToShare
      : (activeFile ?? contextMenu.file)
    if (!target?.id) return
    setActiveFile(target)
    setShareTarget({
      id: target.id,
      name: target.name,
      driveUrl: target.driveUrl,
      provider: target.accountProvider,
      type: 'file',
    })
    setShareOpen(true)
    setContextMenu({ x: 0, y: 0, file: null })
  }

  function shareFolder(folderToShare?: FolderItem | any) {
    const target = (folderToShare && typeof folderToShare === 'object' && 'id' in folderToShare && 'name' in folderToShare)
      ? folderToShare
      : (activeFolderForMenu ?? folderContextMenu.folder)
    if (!target?.id) return
    setActiveFolderForMenu(target)
    setShareTarget({
      id: target.id,
      name: target.name,
      driveUrl: target.driveUrl,
      type: 'folder',
    })
    setShareOpen(true)
    setFolderContextMenu({ x: 0, y: 0, folder: null })
  }

  async function copyShareLinkDirect(fileToCopy?: FileItem | any) {
    const target = (fileToCopy && typeof fileToCopy === 'object' && 'id' in fileToCopy && 'name' in fileToCopy)
      ? fileToCopy
      : (activeFile ?? contextMenu.file)
    if (!target?.id) return
    try {
      let url = target.driveUrl
      if (!url) {
        const data = await apiFetch<{ url: string }>(`/files/${target.id}/share`, { method: 'POST' })
        url = data.url
      }
      await navigator.clipboard.writeText(url)
      toast.success('Google Drive link copied to clipboard!')
    } catch (err: any) {
      toast.error('Failed to copy link: ' + (err.message || err))
    }
    setContextMenu({ x: 0, y: 0, file: null })
  }

  async function copyFolderLink(folderToCopy?: FolderItem | any) {
    const target = (folderToCopy && typeof folderToCopy === 'object' && 'id' in folderToCopy && 'name' in folderToCopy)
      ? folderToCopy
      : (activeFolderForMenu ?? folderContextMenu.folder)
    if (!target?.id) return
    try {
      const url = target.driveUrl || (target.providerFolderId ? `https://drive.google.com/drive/folders/${target.providerFolderId}` : `${window.location.origin}/all-files?folderId=${target.id}`)
      await navigator.clipboard.writeText(url)
      toast.success('Google Drive folder link copied to clipboard!')
    } catch (err: any) {
      toast.error('Failed to copy folder link: ' + (err.message || err))
    }
    setFolderContextMenu({ x: 0, y: 0, folder: null })
  }

  async function renameFolder(event: FormEvent) {
    event.preventDefault()
    if (!activeFolderForMenu?.id) return
    await apiFetch(`/folders/${activeFolderForMenu.id}`, { method: 'PATCH', body: JSON.stringify({ name: folderRenameValue, color: folderRenameColor, iconUrl: folderRenameIconUrl }) })
    setFolderRenameOpen(false)
    await loadFolders()
  }

  async function deleteFolder() {
    if (!activeFolderForMenu?.id) return
    await apiFetch(`/folders/${activeFolderForMenu.id}`, { method: 'DELETE' })
    setFolderDeleteOpen(false)
    await loadFolders()
  }

  function cutSelectedFolder(folder: FolderItem | null) {
    if (!folder?.id) return
    setCutFolder(folder)
    setFolderContextMenu({ x: 0, y: 0, folder: null })
    toast.info(`Folder "${folder.name}" ready to move. Open target folder and press Ctrl+V.`)
  }

  async function pasteFolder() {
    if (!cutFolder?.id) return
    await apiFetch(`/folders/${cutFolder.id}`, { method: 'PATCH', body: JSON.stringify({ parentId: activeFolderId ?? null }) })
    toast.success(`Folder "${cutFolder.name}" moved.`)
    setCutFolder(null)
    await loadFolders()
  }

  function closePreview() {
    setPreviewUrl('')
    setPreviewError('')
    setPreviewLoading(false)
    setPreviewOpen(false)
    if (searchParams.get('previewFileId')) {
      const next = new URLSearchParams(searchParams)
      next.delete('previewFileId')
      setSearchParams(next)
    }
  }

  useEffect(() => {
    function handleUploadCompleted() {
      loadAll().catch(() => undefined)
    }
    function handleOpenUpload() {
      fileUploadInputRef.current?.click()
    }
    function handleOpenNewFolder() {
      setFolderOpen(true)
    }
    function handleOpenMoveModal(e: any) {
      if (e?.detail) {
        setActiveFile(e.detail)
        setMoveOpen(true)
      }
    }
    window.addEventListener('9drive:upload-completed', handleUploadCompleted)
    window.addEventListener('9drive:open-upload', handleOpenUpload)
    window.addEventListener('9drive:open-new-folder', handleOpenNewFolder)
    window.addEventListener('9drive:open-move-modal', handleOpenMoveModal as EventListener)
    return () => {
      window.removeEventListener('9drive:upload-completed', handleUploadCompleted)
      window.removeEventListener('9drive:open-upload', handleOpenUpload)
      window.removeEventListener('9drive:open-new-folder', handleOpenNewFolder)
      window.removeEventListener('9drive:open-move-modal', handleOpenMoveModal as EventListener)
    }
  }, [activeFolderId])

  useEffect(() => {
    setHeaderActions(
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={syncingDrive}
          onClick={syncGoogleDrive}
          title="Sync with Google Drive"
        >
          <RefreshCw className={syncingDrive ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
          {syncingDrive ? 'Syncing...' : 'Sync'}
        </Button>
      </div>
    )
  }, [syncingDrive])

  const activeFolder = allFolders.find((folder) => folder.id === activeFolderId)
  const folderBreadcrumbs = (() => {
    if (!activeFolder) return []
    const foldersById = new Map(allFolders.map((folder) => [folder.id, folder]))
    const path: FolderItem[] = []
    const visited = new Set<string>()
    let current: FolderItem | undefined = activeFolder
    while (current?.id && !visited.has(current.id)) {
      path.unshift(current)
      visited.add(current.id)
      current = current.parentId ? foldersById.get(current.parentId) : undefined
    }
    return path
  })()
  const allVisibleSelected = sortedFiles.length > 0 && sortedFiles.every((file) => file.id && selectedFileIds.has(file.id))
  const activePreviewKind = getPreviewKind(activeFile?.mimeType)

  return (
    <>
      {/* Hidden 1-Click Direct File Upload Input */}
      <input
        ref={fileUploadInputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={(event) => {
          if (event.target.files && event.target.files.length > 0) {
            startDirectUpload(Array.from(event.target.files))
            event.target.value = ''
          }
        }}
      />

      {/* Full-Page Drag & Drop Overlay (Native Google Drive Style) */}
      {isPageDragging && (
        <div
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsPageDragging(false); dragCounter.current = 0 }}
          onDrop={handlePageDrop}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0B57D0]/10 dark:bg-[#A8C7FA]/10 backdrop-blur-xs border-4 border-dashed border-[#0B57D0] dark:border-[#A8C7FA] animate-in fade-in duration-150 m-4 rounded-3xl"
        >
          <div className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl bg-white dark:bg-[#1E1F20] shadow-2xl border border-[#E0E3E7] dark:border-[#36373A]">
            <div className="w-16 h-16 rounded-full bg-[#C2E7FF] dark:bg-[#004A77] flex items-center justify-center text-[#0B57D0] dark:text-[#C2E7FF] animate-bounce">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-base font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
              {t('drag.drop_to_upload', 'Drop files to instantly upload')}
            </h3>
            <p className="text-xs text-[#747775] dark:text-[#8E918F]">
              {t('drag.will_upload_to', 'Will upload to:')} <b className="text-[#0B57D0] dark:text-[#A8C7FA]">{activeFolder ? activeFolder.name : 'My Drive'}</b>
            </p>
          </div>
        </div>
      )}

      <div
        onContextMenu={openEmptyContextMenu}
        onDragEnter={handlePageDragEnter}
        onDragLeave={handlePageDragLeave}
        onDragOver={handlePageDragOver}
        onDrop={handlePageDrop}
        className="flex flex-col min-h-full w-full min-w-0"
      >
        {/* Google Drive Breadcrumb Header */}
        <div className="flex flex-col gap-2 pb-3 border-b border-[#E0E3E7]/70 dark:border-[#36373A]/70 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={closeFolder}
              className={cn(
                'text-xl sm:text-[22px] font-normal transition-colors hover:text-[#0B57D0]',
                activeFolder ? 'text-[#444746] dark:text-[#C4C7C5]' : 'text-[#1F1F1F] dark:text-[#E3E3E3]'
              )}
            >
              My Drive
            </button>
            {folderBreadcrumbs.map((folder, index) => (
              <span key={folder.id} className="flex items-center gap-1.5 min-w-0">
                <ChevronRight className="h-4 w-4 text-[#747775] shrink-0" />
                {index === folderBreadcrumbs.length - 1 ? (
                  <span className="truncate text-xl sm:text-[22px] font-normal text-[#1F1F1F] dark:text-[#E3E3E3]">
                    {folder.name}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => folder.id && openFolderById(folder.id)}
                    className="truncate text-xl sm:text-[22px] font-normal text-[#444746] hover:text-[#0B57D0] dark:text-[#C4C7C5]"
                  >
                    {folder.name}
                  </button>
                )}
              </span>
            ))}
          </div>

          {/* Quick buttons on mobile */}
          <div className="flex items-center gap-2 lg:hidden">
            <Button size="sm" onClick={() => fileUploadInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" />
              Upload
            </Button>
            <Button size="sm" variant="outline" onClick={() => setFolderOpen(true)}>
              <FolderPlus className="h-3.5 w-3.5" />
              New Folder
            </Button>
            <Button size="sm" variant="outline" disabled={syncingDrive} onClick={syncGoogleDrive}>
              <RefreshCw className={syncingDrive ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
            </Button>
          </div>
        </div>

        {/* Minimalist Alert: Drive Not Connected */}
        {connectedAccounts.length === 0 && !loading && !dismissStorageBanner && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[#D3E3FD] bg-[#EDF2FC]/70 px-4 py-2.5 text-xs text-[#1F1F1F] dark:border-[#2C384A] dark:bg-[#1E232B]/70 dark:text-[#E3E3E3] transition-all">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#D3E3FD] text-[#0B57D0] dark:bg-[#004A77] dark:text-[#A8C7FA]">
                <HardDrive className="h-3.5 w-3.5" />
              </div>
              <p className="truncate text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                {language === 'id' ? 'Drive belum terhubung' : 'Drive not connected'}
                <span className="hidden sm:inline font-normal text-[#444746] dark:text-[#C4C7C5] ml-2">
                  {language === 'id' ? '— Hubungkan akun penyimpanan untuk mulai mengelola berkas' : '— Connect a storage account to manage your files'}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                onClick={() => setShowGoogleGuideModal(true)}
                className="h-7 rounded-full bg-[#0B57D0] px-3.5 text-xs font-medium text-white hover:bg-[#0842A0] dark:bg-[#A8C7FA] dark:text-[#001D35] dark:hover:bg-[#C2E7FF] transition-colors"
              >
                <span>{language === 'id' ? 'Hubungkan Drive' : 'Connect Drive'}</span>
              </Button>
              <button
                type="button"
                onClick={() => setDismissStorageBanner(true)}
                className="rounded-full p-1 text-[#747775] hover:bg-black/5 hover:text-[#1F1F1F] dark:text-[#8E918F] dark:hover:bg-white/10 dark:hover:text-[#E3E3E3] transition-colors"
                title={language === 'id' ? 'Tutup' : 'Dismiss'}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Minimalist Alert: Update Available */}
        {updateInfo?.hasUpdate && !dismissUpdateBanner && (
          <div className="mt-2.5 flex items-center justify-between gap-3 rounded-2xl border border-[#C2E7FF] bg-[#EDF2FC]/75 px-4 py-2.5 text-xs text-[#1F1F1F] dark:border-[#004A77] dark:bg-[#1E232B]/75 dark:text-[#E3E3E3] transition-all animate-in fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C2E7FF] text-[#0B57D0] dark:bg-[#004A77] dark:text-[#A8C7FA]">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <p className="truncate text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                {language === 'id' ? `Versi baru v${updateInfo.latestVersion} tersedia` : `New version v${updateInfo.latestVersion} available`}
                <span className="hidden sm:inline font-normal text-[#444746] dark:text-[#C4C7C5] ml-2">
                  {language === 'id' ? '— Jalankan npx 9drive@latest di terminal untuk memperbarui' : '— Run npx 9drive@latest in terminal to update'}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText('npx 9drive@latest')
                  toast.success(language === 'id' ? 'Perintah "npx 9drive@latest" disalin ke clipboard!' : 'Command copied to clipboard!')
                }}
                className="h-7 gap-1.5 rounded-full bg-[#0B57D0] px-3.5 text-xs font-medium text-white hover:bg-[#0842A0] dark:bg-[#A8C7FA] dark:text-[#001D35] dark:hover:bg-[#C2E7FF] transition-colors"
              >
                <Copy className="h-3 w-3" />
                <span>{language === 'id' ? 'Salin Perintah' : 'Copy Command'}</span>
              </Button>
              <button
                type="button"
                onClick={() => setDismissUpdateBanner(true)}
                className="rounded-full p-1 text-[#747775] hover:bg-black/5 hover:text-[#1F1F1F] dark:text-[#8E918F] dark:hover:bg-white/10 dark:hover:text-[#E3E3E3] transition-colors"
                title={language === 'id' ? 'Tutup' : 'Dismiss'}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Search Results Across All Drives Banner */}
        {searchQuery && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-[#E8F0FE] px-4 py-2.5 text-xs text-[#001D35] dark:bg-[#004A77]/40 dark:text-[#C2E7FF]">
            <div className="flex items-center gap-2 flex-wrap">
              <span>
                🔍 {t('search.showing_results', 'Showing search results for')} "<b>{searchQuery}</b>"{' '}
                {(() => {
                  const effectiveAccountId = searchParams.get('accountId') || (selectedAccountId !== 'all' ? selectedAccountId : '')
                  if (effectiveAccountId && effectiveAccountId !== 'all') {
                    const acc = connectedAccounts.find((a) => a.id === effectiveAccountId)
                    const letter = getDriveLetter(effectiveAccountId)
                    return (
                      <>
                        {language === 'id' ? 'di' : 'in'} <b className="text-[#0B57D0] dark:text-[#A8C7FA]">Drive {letter}</b> ({acc?.email || 'selected account'})
                      </>
                    )
                  }
                  return <b>{t('search.in_all_accounts', 'across all drive accounts')}</b>
                })()}
              </span>
              {(() => {
                const effectiveAccountId = searchParams.get('accountId') || (selectedAccountId !== 'all' ? selectedAccountId : '')
                if (effectiveAccountId && effectiveAccountId !== 'all') {
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        const next = new URLSearchParams(searchParams)
                        next.set('accountId', 'all')
                        setSearchParams(next)
                      }}
                      className="ml-2 font-medium underline hover:text-[#0B57D0] dark:hover:text-[#A8C7FA]"
                    >
                      {t('search.search_all_accounts', 'Search across all drive accounts')}
                    </button>
                  )
                }
                return null
              })()}
            </div>
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams)
                next.delete('q')
                setSearchParams(next)
              }}
              className="flex items-center gap-1 font-medium hover:underline text-[#0B57D0] dark:text-[#A8C7FA] shrink-0"
            >
              <X className="h-3.5 w-3.5" />
              <span>{t('search.clear_search', 'Clear Search')}</span>
            </button>
          </div>
        )}

        {/* Filter Chips Toolbar + Batch Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 pb-2 select-none">
          {selectedFileIds.size > 0 ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-[#001D35] bg-[#C2E7FF] px-3 py-1.5 rounded-full dark:bg-[#004A77] dark:text-[#C2E7FF]">
                {selectedFileIds.size} selected
              </span>
              {selectedFileIds.size === 1 && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const selectedId = Array.from(selectedFileIds)[0]
                      const target = files.find((f) => f.id === selectedId)
                      if (target) shareFile(target)
                    }}
                    className="gap-1.5 rounded-full border-[#747775]/40 text-[#0B57D0] hover:bg-[#0B57D0]/10 hover:border-[#0B57D0] dark:border-[#747775]/60 dark:text-[#A8C7FA]"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Share
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const selectedId = Array.from(selectedFileIds)[0]
                      const target = files.find((f) => f.id === selectedId)
                      if (target) copyShareLinkDirect(target)
                    }}
                    className="gap-1.5 rounded-full border-[#747775]/40 text-[#444746] hover:bg-black/5 dark:border-[#747775]/60 dark:text-[#C4C7C5]"
                  >
                    <Link2 className="h-3.5 w-3.5" /> Copy link
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" onClick={downloadBatchAsZip}>
                <Download className="h-3.5 w-3.5" /> Download ZIP
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMoveOpen(true)}>
                <FolderInput className="h-3.5 w-3.5" /> Move
              </Button>
              <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap py-1 relative z-20 overflow-visible">
              {/* Filter 1: Type */}
              <Select
                variant="chip"
                className="w-auto min-w-[110px]"
                value={searchParams.get('kind') || 'all'}
                onChange={(val) => {
                  const next = new URLSearchParams(searchParams)
                  if (!val || val === 'all') {
                    next.delete('kind')
                  } else {
                    next.set('kind', val)
                  }
                  setSearchParams(next)
                }}
                options={[
                  { value: 'all', label: language === 'id' ? 'Tipe: Semua' : 'Type: All' },
                  { value: 'doc', label: language === 'id' ? 'Dokumen' : 'Documents' },
                  { value: 'pdf', label: 'PDFs' },
                  { value: 'image', label: language === 'id' ? 'Foto & Gambar' : 'Photos & images' },
                  { value: 'video', label: 'Videos' },
                  { value: 'archive', label: language === 'id' ? 'Arsip (ZIP/RAR)' : 'Archives' },
                ]}
              />

              {/* Filter 2: Modified (Waktu Diubah) */}
              <Select
                variant="chip"
                className="w-auto min-w-[130px]"
                value={searchParams.get('modified') || 'all'}
                onChange={(val) => {
                  const next = new URLSearchParams(searchParams)
                  if (!val || val === 'all') {
                    next.delete('modified')
                  } else {
                    next.set('modified', val)
                  }
                  setSearchParams(next)
                }}
                options={[
                  { value: 'all', label: language === 'id' ? 'Waktu: Kapan saja' : 'Modified: Anytime' },
                  { value: 'today', label: language === 'id' ? 'Hari ini' : 'Today' },
                  { value: '7d', label: language === 'id' ? '7 hari terakhir' : 'Last 7 days' },
                  { value: '30d', label: language === 'id' ? '30 hari terakhir' : 'Last 30 days' },
                  { value: 'year', label: language === 'id' ? 'Tahun ini' : 'This year' },
                ]}
              />

              {/* Filter 3: Sort by (Urutan Tampilan) */}
              <Select
                variant="chip"
                className="w-auto min-w-[140px]"
                value={searchParams.get('sort') || 'date_desc'}
                onChange={(val) => {
                  const next = new URLSearchParams(searchParams)
                  if (!val || val === 'date_desc') {
                    next.delete('sort')
                  } else {
                    next.set('sort', val)
                  }
                  setSearchParams(next)
                }}
                options={[
                  { value: 'date_desc', label: language === 'id' ? 'Urutan: Terakhir diubah' : 'Sort: Last modified' },
                  { value: 'name_asc', label: language === 'id' ? 'Nama (A - Z)' : 'Name (A - Z)' },
                  { value: 'name_desc', label: language === 'id' ? 'Nama (Z - A)' : 'Name (Z - A)' },
                  { value: 'size_desc', label: language === 'id' ? 'Ukuran (Terbesar)' : 'Size (Largest)' },
                  { value: 'size_asc', label: language === 'id' ? 'Ukuran (Terkecil)' : 'Size (Smallest)' },
                ]}
              />

              {/* Reset Active Filters Button */}
              {Boolean(
                (searchParams.get('kind') && searchParams.get('kind') !== 'all') ||
                (searchParams.get('modified') && searchParams.get('modified') !== 'all') ||
                (searchParams.get('sort') && searchParams.get('sort') !== 'date_desc')
              ) && (
                <button
                  type="button"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams)
                    next.delete('kind')
                    next.delete('modified')
                    next.delete('sort')
                    setSearchParams(next)
                  }}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-[#B3261E] hover:bg-[#F9DEDC]/50 dark:text-[#F2B8B5] transition-colors shrink-0"
                  title={language === 'id' ? 'Reset filter' : 'Clear filters'}
                >
                  <X className="h-3.5 w-3.5" />
                  <span>{language === 'id' ? 'Reset' : 'Clear'}</span>
                </button>
              )}
            </div>
          )}

          {/* View switcher and detail buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => changeFileViewMode('list')}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
                fileViewMode === 'list'
                  ? 'bg-[#C2E7FF] text-[#001D35] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                  : 'text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10'
              )}
              title="List view"
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => changeFileViewMode('grid')}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
                fileViewMode === 'grid'
                  ? 'bg-[#C2E7FF] text-[#001D35] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                  : 'text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10'
              )}
              title="Grid view"
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            {activeFile && (
              <button
                type="button"
                onClick={() => setDetailOpen(!detailOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10 ml-1"
                title="View details"
                aria-label="View details"
              >
                <Info className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {cutFolder ? (
          <p className="mt-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs font-medium text-amber-800 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-300">
            <ClipboardPaste className="mr-1.5 inline h-4 w-4" />
            Cut folder: <b>{cutFolder.name}</b>. Press Ctrl+V or right-click to paste here.
          </p>
        ) : null}

        {/* Folders Section */}
        {sortedFolders.length > 0 && (
          <div className="mt-4">
            <h2 className="text-xs font-medium text-[#444746] dark:text-[#C4C7C5]">
              {t('section.folders', 'Folders')}
            </h2>
            <FolderGrid
              items={sortedFolders}
              mobileTwoColumns
              onFolderMenu={openFolderMenu}
              onFolderOpen={openFolder}
              onDropItem={handleDropItem}
            />
          </div>
        )}

        {/* Files Section */}
        {sortedFiles.length > 0 ? (
          <div className="mt-6 flex-1">
            <h2 className="text-xs font-medium text-[#444746] dark:text-[#C4C7C5]">
              {t('section.files', 'Files')}
            </h2>
            {fileViewMode === 'grid' ? (
              <FileGrid
                files={sortedFiles}
                selectedFileIds={selectedFileIds}
                onToggleFile={toggleFileSelection}
                onFileContextMenu={openContext}
                onShare={shareFile}
              />
            ) : (
              <FileTable
                files={sortedFiles}
                selectedFileIds={selectedFileIds}
                allSelected={allVisibleSelected}
                onToggleFile={toggleFileSelection}
                onToggleAll={toggleAllVisibleFiles}
                onFileContextMenu={openContext}
                onShare={shareFile}
              />
            )}
          </div>
        ) : sortedFolders.length === 0 ? (
          /* Google Drive Empty State */
          <div className="flex flex-1 flex-col items-center justify-center py-20 px-4 text-center select-none">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#EDF2FC] dark:bg-[#28292A] text-[#0B57D0] dark:text-[#A8C7FA] mb-4">
              <HardDrive className="h-12 w-12 stroke-[1.2]" />
            </div>
            <h3 className="text-lg font-normal text-[#1F1F1F] dark:text-[#E3E3E3]">
              {t('empty.all_files_title', 'A place for all of your files')}
            </h3>
            <p className="mt-1 text-xs text-[#747775] dark:text-[#8E918F] max-w-sm">
              {searchQuery
                ? (language === 'id' ? `Tidak ada file yang ditemukan untuk "${searchQuery}".` : `No files found for "${searchQuery}".`)
                : activeFolder
                ? t('empty.folder_empty', 'This folder is empty. Drag files here or use the "+ New" button to upload.')
                : t('empty.all_files_desc', 'Drag your files here or use the "+ New" button on the left to upload.')}
            </p>
          </div>
        ) : null}
      </div>
      <EmptyAreaContextMenu x={emptyContextMenu.x} y={emptyContextMenu.y} open={emptyContextMenu.open} canPasteFolder={Boolean(cutFolder)} onClose={() => setEmptyContextMenu({ x: 0, y: 0, open: false })} onUpload={() => { fileUploadInputRef.current?.click(); setEmptyContextMenu({ x: 0, y: 0, open: false }) }} onCreateFolder={() => { setFolderOpen(true); setEmptyContextMenu({ x: 0, y: 0, open: false }) }} onPasteFolder={() => { pasteFolder().catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to paste folder')); setEmptyContextMenu({ x: 0, y: 0, open: false }) }} />
      <FileContextMenu x={contextMenu.x} y={contextMenu.y} file={contextMenu.file} onClose={() => setContextMenu({ x: 0, y: 0, file: null })} onView={viewFile} onDownload={downloadFile} onRename={() => { setRenameValue(activeFile?.name ?? ''); setRenameOpen(true); setContextMenu({ x: 0, y: 0, file: null }) }} onMove={() => { setMoveOpen(true); setContextMenu({ x: 0, y: 0, file: null }) }} onDetails={() => { setDetailOpen(true); setContextMenu({ x: 0, y: 0, file: null }) }} onShare={() => shareFile(contextMenu.file ?? activeFile)} onCopyLink={() => copyShareLinkDirect(contextMenu.file ?? activeFile)} onDelete={() => { setDeleteOpen(true); setContextMenu({ x: 0, y: 0, file: null }) }} />
      <FolderContextMenu x={folderContextMenu.x} y={folderContextMenu.y} folder={folderContextMenu.folder} onClose={() => setFolderContextMenu({ x: 0, y: 0, folder: null })} onCut={() => cutSelectedFolder(activeFolderForMenu ?? folderContextMenu.folder)} onRename={() => { setFolderRenameValue(activeFolderForMenu?.name ?? ''); setFolderRenameColor(normalizeFolderColor(activeFolderForMenu?.color)); setFolderRenameIconUrl(activeFolderForMenu?.iconUrl ?? defaultFolderIconUrl); setFolderRenameOpen(true); setFolderContextMenu({ x: 0, y: 0, folder: null }) }} onShare={() => shareFolder(folderContextMenu.folder ?? activeFolderForMenu)} onCopyLink={() => copyFolderLink(folderContextMenu.folder ?? activeFolderForMenu)} onDelete={() => { setFolderDeleteOpen(true); setFolderContextMenu({ x: 0, y: 0, folder: null }) }} />
      <FileDetailsDrawer open={detailOpen} file={activeFile} onClose={() => setDetailOpen(false)} onShare={shareFile} />

      <DummyModal open={uploadOpen} title={t('modal.upload_title', 'Upload File')} description={t('modal.upload_desc', 'Stream file directly to selected Google Drive account.')} onClose={() => setUploadOpen(false)}>
        <form onSubmit={uploadFile} className="grid gap-4">
          <label
            onDragEnter={handleUploadDrag}
            onDragOver={handleUploadDrag}
            onDragLeave={handleUploadDrag}
            onDrop={handleUploadDrag}
            className={cn(
              'group grid cursor-pointer gap-2.5 rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200',
              isUploadDragging
                ? 'border-[#0B57D0] bg-[#C2E7FF]/20 dark:border-[#A8C7FA] dark:bg-[#A8C7FA]/10'
                : 'border-[#E0E3E7] bg-[#F8FAFD] hover:border-[#0B57D0] hover:bg-[#F0F4F9] dark:border-[#36373A] dark:bg-[#131314]/40 dark:hover:border-[#A8C7FA] dark:hover:bg-[#28292A]'
            )}
          >
            <Upload
              className={cn(
                'mx-auto h-8 w-8 transition-colors',
                isUploadDragging
                  ? 'text-[#0B57D0] dark:text-[#A8C7FA]'
                  : 'text-[#444746] group-hover:text-[#0B57D0] dark:text-[#C4C7C5] dark:group-hover:text-[#A8C7FA]'
              )}
            />
            <span className="text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
              {t('modal.drop_or_browse', 'Drop files here or click to browse')}
            </span>
            <span className="text-xs text-[#747775] dark:text-[#8E918F]">
              {language === 'id' ? 'File dialirkan langsung ke folder ' : 'Files stream directly to Google Drive folder '}
              <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-[11px] text-[#1F1F1F] dark:bg-white/10 dark:text-[#E3E3E3]">
                9drive
              </code>
              .
            </span>
            <Input
              type="file"
              className="sr-only"
              multiple
              onChange={(event) => selectUploadFiles(event.target.files)}
              required={selectedFiles.length === 0}
            />
          </label>
          <div className="grid gap-1.5 text-xs font-medium text-[#444746] dark:text-[#C4C7C5]">
            <span>{t('modal.target_account', 'Target Storage Account')}</span>
            <Select
              variant="default"
              value={selectedTargetAccountId}
              onChange={(value) => setSelectedTargetAccountId(value)}
              options={[
                { value: '', label: t('modal.auto_account', 'Automatic (Default)') },
                ...connectedAccounts.map((account) => ({
                  value: account.id,
                  label: `${account.email || account.displayName || account.id} (${account.provider === 's3' ? 'S3' : 'Google Drive'})`,
                })),
              ]}
            />
          </div>
          {activeFolder ? (
            <p className="rounded-lg bg-[#F8FAFD] p-2.5 text-xs text-[#444746] border border-[#E0E3E7] dark:bg-[#28292A] dark:border-[#36373A] dark:text-[#C4C7C5]">
              {t('modal.uploading_to', 'Uploading to:')} <b>{activeFolder.name}</b>
            </p>
          ) : (
            <div className="grid gap-1.5 text-xs font-medium text-[#444746] dark:text-[#C4C7C5]">
              <span>{t('modal.virtual_folder', 'Virtual Folder')}</span>
              <Select
                variant="default"
                value={selectedFolderId}
                onChange={(value) => setSelectedFolderId(value)}
                options={[
                  { value: '', label: t('modal.no_folder', 'No folder') },
                  ...allFolders.map((folder) => ({
                    value: folder.id ?? '',
                    label: folder.name,
                  })),
                ]}
              />
            </div>
          )}
          {selectedFiles.length > 0 ? (
            <div className="grid max-h-48 gap-1.5 overflow-y-auto rounded-xl bg-[#F8FAFD] p-3 text-xs text-[#444746] dark:bg-[#131314]/40 dark:border dark:border-[#36373A] dark:text-[#C4C7C5]">
              <div className="flex items-center justify-between pb-1 font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                <span>{selectedFiles.length} {language === 'id' ? 'file dipilih' : 'file(s) selected'}</span>
                <span>{formatBytes(selectedFiles.reduce((total, file) => total + file.size, 0))}</span>
              </div>
              {selectedFiles.map((file, index) => (
                <div key={`${file.name}-${file.size}-${index}`} className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-white p-2 border border-[#E0E3E7] dark:bg-[#1E1F20] dark:border-[#36373A]">
                  <span className="min-w-0 flex-1 truncate font-medium text-[#1F1F1F] dark:text-[#E3E3E3]" title={file.name}>{file.name}</span>
                  <span className="shrink-0 text-slate-500 dark:text-[#8E918F]">{formatBytes(file.size)}</span>
                  <button type="button" className="shrink-0 text-[#747775] hover:text-[#B3261E] dark:text-[#C4C7C5] dark:hover:text-[#F2B8B5]" onClick={() => removeUploadFile(index)} aria-label={`Remove ${file.name}`}><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setUploadOpen(false)}>{t('action.cancel', 'Cancel')}</Button>
            <Button disabled={loading || selectedFiles.length === 0}>{loading ? (language === 'id' ? 'Mengunggah...' : 'Uploading...') : (language === 'id' ? `Unggah ${selectedFiles.length} file` : `Upload${selectedFiles.length > 1 ? ` ${selectedFiles.length} files` : ''}`)}</Button>
          </div>
        </form>
      </DummyModal>

      <DummyModal open={folderOpen} title={t('modal.new_folder_title', 'New Folder')} description={t('modal.new_folder_desc', 'Create a virtual folder for organizing files.')} onClose={() => setFolderOpen(false)}>
        <form onSubmit={createFolder} className="grid gap-4">
          <label className="grid gap-1.5 text-xs font-medium text-[#444746] dark:text-[#C4C7C5]">
            {t('modal.folder_name', 'Folder Name')}
            <Input value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder={t('modal.untitled_folder', 'Untitled folder')} required autoFocus />
          </label>
          <FolderAppearanceFields color={folderColor} iconUrl={folderIconUrl} onColorChange={setFolderColor} onIconChange={setFolderIconUrl} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setFolderOpen(false)}>{t('action.cancel', 'Cancel')}</Button>
            <Button>{t('action.create', 'Create')}</Button>
          </div>
        </form>
      </DummyModal>

      <DummyModal open={renameOpen} title={t('modal.rename_title', 'Rename')} description={activeFile?.name ?? ''} onClose={() => setRenameOpen(false)}>
        <form onSubmit={renameFile} className="grid gap-4">
          <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} required autoFocus />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRenameOpen(false)}>{t('action.cancel', 'Cancel')}</Button>
            <Button>{t('action.ok', 'OK')}</Button>
          </div>
        </form>
      </DummyModal>

      <DummyModal open={moveOpen} title={t('modal.move_title', 'Move')} description={selectedFileIds.size > 0 ? (language === 'id' ? `Pindahkan ${selectedFileIds.size} file` : `Move ${selectedFileIds.size} files`) : activeFile?.name ?? ''} onClose={() => setMoveOpen(false)}>
        <form onSubmit={moveFile} className="grid gap-4">
          <Select
            variant="default"
            value={selectedFolderId}
            onChange={(value) => setSelectedFolderId(value)}
            options={[
              { value: '', label: 'My Drive (Root)' },
              ...allFolders.map((folder) => ({
                value: folder.id ?? '',
                label: folder.name,
              })),
            ]}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setMoveOpen(false)}>{t('action.cancel', 'Cancel')}</Button>
            <Button>{t('action.move_here', 'Move here')}</Button>
          </div>
        </form>
      </DummyModal>

      <DummyModal open={deleteOpen} title={t('modal.delete_file_title', 'Move to trash?')} description={selectedFileIds.size > 0 ? (language === 'id' ? `Pindahkan ${selectedFileIds.size} file ke sampah?` : `Delete ${selectedFileIds.size} files from Google Drive?`) : (language === 'id' ? `Pindahkan "${activeFile?.name ?? 'file'}" ke sampah?` : `Delete "${activeFile?.name ?? 'file'}"?`)} onClose={() => setDeleteOpen(false)}>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)}>{t('action.cancel', 'Cancel')}</Button>
          <Button variant="danger" onClick={deleteFile}>{t('menu.move_to_trash', 'Move to trash')}</Button>
        </div>
      </DummyModal>

      <ShareModal
        open={shareOpen}
        file={shareTarget}
        onClose={() => setShareOpen(false)}
      />

      <DummyModal open={folderRenameOpen} title={t('modal.rename_title', 'Rename')} description={activeFolderForMenu?.name ?? ''} onClose={() => setFolderRenameOpen(false)}>
        <form onSubmit={renameFolder} className="grid gap-4">
          <Input value={folderRenameValue} onChange={(event) => setFolderRenameValue(event.target.value)} required autoFocus />
          <FolderAppearanceFields color={folderRenameColor} iconUrl={folderRenameIconUrl} onColorChange={setFolderRenameColor} onIconChange={setFolderRenameIconUrl} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setFolderRenameOpen(false)}>{t('action.cancel', 'Cancel')}</Button>
            <Button>{t('action.ok', 'OK')}</Button>
          </div>
        </form>
      </DummyModal>

      <DummyModal open={folderDeleteOpen} title={t('modal.delete_folder_title', 'Delete folder?')} description={language === 'id' ? `Hapus folder virtual "${activeFolderForMenu?.name ?? ''}"? File di dalamnya akan tetap tersimpan.` : `Delete virtual folder "${activeFolderForMenu?.name ?? ''}"? Files inside will remain uploaded.`} onClose={() => setFolderDeleteOpen(false)}>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setFolderDeleteOpen(false)}>{t('action.cancel', 'Cancel')}</Button>
          <Button variant="danger" onClick={deleteFolder}>{t('action.delete', 'Delete')}</Button>
        </div>
      </DummyModal>

      <DummyModal open={previewOpen} title="File Preview" description={activeFile?.name ?? ''} onClose={closePreview} className="overflow-hidden sm:max-w-[95vw] xl:max-w-[1400px]">
        <div className="flex h-[72dvh] w-full items-center justify-center overflow-hidden rounded-xl border border-[#E0E3E7] bg-[#F8FAFD] dark:border-[#36373A] dark:bg-[#131314] sm:h-[80vh]">
          {previewLoading ? <div className="p-6 text-center text-sm font-semibold text-[#747775] dark:text-[#8E918F]">Loading preview...</div> : null}
          {previewError ? <div className="p-6 text-center text-sm text-red-600 dark:text-red-400">{previewError}</div> : null}
          {!previewLoading && !previewError && activePreviewKind === 'image' && previewUrl ? <img src={previewUrl} alt={activeFile?.name ?? 'File preview'} className="max-h-full max-w-full object-contain" onError={() => setPreviewError('Failed to load preview.')} /> : null}
          {!previewLoading && !previewError && activePreviewKind === 'video' && previewUrl ? <div className="shared-video-shell"><video ref={previewVideoRef} controls playsInline preload="metadata" onError={() => setPreviewError('Failed to load preview.')}><source src={previewUrl} type={activeFile?.mimeType} /></video></div> : null}
          {!previewLoading && !previewError && activePreviewKind === 'document' && previewUrl ? <iframe src={previewUrl} title={activeFile?.name ?? 'File preview'} className="h-full w-full border-0 bg-white dark:bg-[#1E1F20]" /> : null}
          {!previewLoading && !previewError && activePreviewKind === 'office' && previewUrl ? <iframe src={officeViewerUrl(previewUrl)} title={activeFile?.name ?? 'File preview'} className="h-full w-full border-0 bg-white dark:bg-[#1E1F20]" /> : null}
          {!previewLoading && !previewError && !activePreviewKind ? <div className="p-6 text-center text-sm text-[#747775] dark:text-[#8E918F]">Preview not available for this file type. Use Download instead.</div> : null}
        </div>
      </DummyModal>

      <DummyModal
        open={showGoogleGuideModal}
        title={language === 'id' ? 'Panduan Menghubungkan Google Drive & Google Cloud' : 'Google Drive & Google Cloud Connection Guide'}
        description={language === 'id' ? 'Langkah menghubungkan Google Drive API ke 9Drive' : 'Step-by-step setup to connect Google Drive API to 9Drive'}
        onClose={() => setShowGoogleGuideModal(false)}
        className="sm:max-w-[560px]"
      >
        <div className="space-y-3.5 text-xs text-[#444746] dark:text-[#C4C7C5] leading-relaxed">
          <div className="rounded-xl bg-[#F8FAFD] dark:bg-[#18191A] p-3.5 border border-[#E0E3E7] dark:border-[#36373A]">
            <h4 className="font-semibold text-sm text-[#1F1F1F] dark:text-[#E3E3E3] mb-2 flex items-center gap-1.5">
              <span>🚀</span> {language === 'id' ? '4 Langkah Setup di Google Cloud Console:' : '4 Steps Setup in Google Cloud Console:'}
            </h4>
            <ol className="list-decimal pl-4 space-y-2">
              <li>
                {language === 'id' ? (
                  <>Buka <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-[#0B57D0] hover:underline font-medium inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="h-3 w-3 inline" /></a> dan buat atau pilih Project Anda.</>
                ) : (
                  <>Open <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-[#0B57D0] hover:underline font-medium inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="h-3 w-3 inline" /></a> and select or create your Project.</>
                )}
              </li>
              <li>
                {language === 'id' ? (
                  <>Di menu <strong>APIs & Services &gt; Library</strong>, cari dan aktifkan <strong>Google Drive API</strong>.</>
                ) : (
                  <>In <strong>APIs & Services &gt; Library</strong>, search and enable <strong>Google Drive API</strong>.</>
                )}
              </li>
              <li>
                {language === 'id' ? (
                  <>Buka <strong>APIs & Services &gt; Credentials</strong> &gt; klik <strong>Create Credentials &gt; OAuth client ID</strong> (Pilih Application type: <em>Web application</em>).</>
                ) : (
                  <>Go to <strong>APIs & Services &gt; Credentials</strong> &gt; click <strong>Create Credentials &gt; OAuth client ID</strong> (Select Application type: <em>Web application</em>).</>
                )}
              </li>
              <li>
                {language === 'id' ? (
                  <>Masukkan URL ini persis di bagian <strong>Authorized redirect URIs</strong>:</>
                ) : (
                  <>Add this exact URL under <strong>Authorized redirect URIs</strong>:</>
                )}
                <div className="mt-1 font-mono text-[11px] bg-white dark:bg-[#1E1F20] p-1.5 rounded-lg border border-[#E0E3E7] dark:border-[#36373A] text-[#0B57D0] select-all break-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/connected-accounts/google/callback` : 'http://localhost:9999/connected-accounts/google/callback'}
                </div>
              </li>
            </ol>
          </div>

          <div className="rounded-xl border border-[#D3E3FD] bg-[#EDF2FC] p-3.5 text-[#1F1F1F] dark:border-[#2C384A] dark:bg-[#1E232B] dark:text-[#E3E3E3]">
            <h4 className="font-semibold text-xs flex items-center gap-1.5 mb-1 text-[#1F1F1F] dark:text-[#E3E3E3]">
              <Info className="h-4 w-4 text-[#0B57D0] dark:text-[#A8C7FA] shrink-0" />
              <span>{language === 'id' ? 'PENTING: Wajib Menambahkan Email Anda ke "Test Users"' : 'IMPORTANT: Add Your Email to "Test Users"'}</span>
            </h4>
            <p className="text-[11px] leading-relaxed text-[#444746] dark:text-[#C4C7C5]">
              {language === 'id' ? (
                <>Jika status aplikasi Anda di Google Console masih <strong>"Testing"</strong> (belum diajukan verifikasi publik), Google <strong>hanya mengizinkan akun email yang terdaftar sebagai Test User</strong>.</>
              ) : (
                <>If your app in Google Console is in <strong>"Testing"</strong> status (unverified), Google <strong>only allows Google accounts that are explicitly registered under Test Users</strong>.</>
              )}
            </p>
            <div className="mt-2 pl-3 border-l-2 border-[#0B57D0] dark:border-[#A8C7FA] text-[11px] space-y-1 text-[#444746] dark:text-[#C4C7C5]">
              {language === 'id' ? (
                <>
                  <p>👉 Buka menu <strong>APIs & Services &gt; OAuth consent screen &gt; Test users</strong>.</p>
                  <p>👉 Klik <strong>+ Add Users</strong>, lalu masukkan alamat Gmail yang ingin Anda hubungkan ke 9Drive.</p>
                  <p className="text-[10px] text-[#747775] dark:text-[#8E918F] italic">
                    *Jika akun Anda tidak didaftarkan di Test Users, login akan gagal dengan pesan: "Access blocked: 403 access_denied / Not a test user".
                  </p>
                </>
              ) : (
                <>
                  <p>👉 Go to <strong>APIs & Services &gt; OAuth consent screen &gt; Test users</strong>.</p>
                  <p>👉 Click <strong>+ Add Users</strong>, and enter the Gmail address you want to connect.</p>
                  <p className="text-[10px] text-[#747775] dark:text-[#8E918F] italic">
                    *If omitted, Google rejects login with: "Access blocked: 403 access_denied / Not a test user".
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-[#F0F4F9] dark:bg-[#1A1C1E] p-3 text-[11px] text-[#444746] dark:text-[#C4C7C5] border border-[#E0E3E7] dark:border-[#36373A]">
            <p className="font-semibold text-[#1F1F1F] dark:text-[#E3E3E3] mb-0.5">
              {language === 'id' ? '💡 Alternatif Tanpa Google Console:' : '💡 Alternative Without Google Console:'}
            </p>
            <p>
              {language === 'id'
                ? 'Anda juga bisa langsung menghubungkan S3 Storage (Cloudflare R2, AWS, MinIO) di menu Pengaturan tanpa perlu konfigurasi Google Console sama sekali!'
                : 'You can also connect S3 Compatible Storage (Cloudflare R2, AWS, MinIO, Wasabi) in Settings without requiring Google Cloud Console at all!'}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowGoogleGuideModal(false)}>
              {language === 'id' ? 'Tutup' : 'Close'}
            </Button>
            <Link
              to="/settings"
              onClick={() => setShowGoogleGuideModal(false)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0B57D0] px-4 py-2 text-xs font-medium text-white hover:bg-[#0B57D0]/90 dark:bg-[#A8C7FA] dark:text-[#003366]"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>{language === 'id' ? 'Buka Menu Settings' : 'Open Settings'}</span>
            </Link>
          </div>
        </div>
      </DummyModal>
    </>
  )
}
