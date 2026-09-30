import { useEffect, useRef, useState, type DragEvent, type FormEvent, type MouseEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown, ChevronRight, ClipboardPaste, Download, FolderInput, FolderPlus, HardDrive, Info, LayoutGrid, Link2, List, RefreshCw, Trash2, Upload, UserPlus, X } from 'lucide-react'
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
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([])
  const [selectedTargetAccountId, setSelectedTargetAccountId] = useState('')

  async function loadFiles() {
    const params = new URLSearchParams()
    if (activeFolderId) params.set('folderId', activeFolderId)
    if (searchQuery) params.set('q', searchQuery)

    // Add advanced search filters
    const kind = searchParams.get('kind')
    const accountId = searchParams.get('accountId')
    const minSize = searchParams.get('minSize')
    const maxSize = searchParams.get('maxSize')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (kind) params.set('kind', kind)
    if (accountId) {
      if (accountId !== 'all') params.set('accountId', accountId)
    } else if (selectedAccountId && selectedAccountId !== 'all') {
      // Global drive filter applies whether searching or not!
      params.set('accountId', selectedAccountId)
    }
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
  }, [activeFolderId, searchQuery, selectedAccountId, searchParams.get('accountId')])

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

  function toggleAllVisibleFiles() {
    const visibleIds = files.map((file) => file.id).filter(Boolean) as string[]
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
      setUploadOpen(true)
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
  const allVisibleSelected = files.length > 0 && files.every((file) => file.id && selectedFileIds.has(file.id))
  const activePreviewKind = getPreviewKind(activeFile?.mimeType)

  return (
    <>
      <div onContextMenu={openEmptyContextMenu} className="flex flex-col min-h-full w-full min-w-0">
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
            <Button size="sm" onClick={() => setUploadOpen(true)}>
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

        {/* Search Results Across All Drives Banner */}
        {searchQuery && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-[#E8F0FE] px-4 py-2.5 text-xs text-[#001D35] dark:bg-[#004A77]/40 dark:text-[#C2E7FF]">
            <div className="flex items-center gap-2 flex-wrap">
              <span>
                🔍 Menampilkan hasil pencarian untuk "<b>{searchQuery}</b>"{' '}
                {(() => {
                  const effectiveAccountId = searchParams.get('accountId') || (selectedAccountId !== 'all' ? selectedAccountId : '')
                  if (effectiveAccountId && effectiveAccountId !== 'all') {
                    const acc = connectedAccounts.find((a) => a.id === effectiveAccountId)
                    const letter = getDriveLetter(effectiveAccountId)
                    return (
                      <>
                        di <b className="text-[#0B57D0] dark:text-[#A8C7FA]">Drive {letter}</b> ({acc?.email || 'selected account'})
                      </>
                    )
                  }
                  return <b>di seluruh akun drive</b>
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
                      Cari di seluruh akun drive
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
              <span>Hapus Pencarian</span>
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
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              <div className="w-32">
                <Select
                  variant="chip"
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
                    { value: 'all', label: 'Type' },
                    { value: 'doc', label: 'Documents' },
                    { value: 'pdf', label: 'PDFs' },
                    { value: 'image', label: 'Photos & images' },
                    { value: 'video', label: 'Videos' },
                    { value: 'archive', label: 'Archives' },
                  ]}
                />
              </div>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-[#747775]/30 bg-white px-3 py-1.5 text-xs font-medium text-[#444746] hover:bg-[#F0F4F9] dark:border-[#747775]/50 dark:bg-[#1E1F20] dark:text-[#C4C7C5] dark:hover:bg-[#28292A] cursor-pointer"
              >
                People <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-[#747775]/30 bg-white px-3 py-1.5 text-xs font-medium text-[#444746] hover:bg-[#F0F4F9] dark:border-[#747775]/50 dark:bg-[#1E1F20] dark:text-[#C4C7C5] dark:hover:bg-[#28292A] cursor-pointer"
              >
                Modified <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </button>
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
        {(!activeFolder ? folders : folders).length > 0 && (
          <div className="mt-4">
            <h2 className="text-xs font-medium text-[#444746] dark:text-[#C4C7C5]">
              Folders
            </h2>
            <FolderGrid
              items={!activeFolder ? folders : folders}
              mobileTwoColumns
              onFolderMenu={openFolderMenu}
              onFolderOpen={openFolder}
              onDropItem={handleDropItem}
            />
          </div>
        )}

        {/* Files Section */}
        {files.length > 0 ? (
          <div className="mt-6 flex-1">
            <h2 className="text-xs font-medium text-[#444746] dark:text-[#C4C7C5]">
              Files
            </h2>
            {fileViewMode === 'grid' ? (
              <FileGrid
                files={files}
                selectedFileIds={selectedFileIds}
                onToggleFile={toggleFileSelection}
                onFileContextMenu={openContext}
                onShare={shareFile}
              />
            ) : (
              <FileTable
                files={files}
                selectedFileIds={selectedFileIds}
                allSelected={allVisibleSelected}
                onToggleFile={toggleFileSelection}
                onToggleAll={toggleAllVisibleFiles}
                onFileContextMenu={openContext}
                onShare={shareFile}
              />
            )}
          </div>
        ) : folders.length === 0 ? (
          /* Google Drive Empty State */
          <div className="flex flex-1 flex-col items-center justify-center py-20 px-4 text-center select-none">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#EDF2FC] dark:bg-[#28292A] text-[#0B57D0] dark:text-[#A8C7FA] mb-4">
              <HardDrive className="h-12 w-12 stroke-[1.2]" />
            </div>
            <h3 className="text-lg font-normal text-[#1F1F1F] dark:text-[#E3E3E3]">
              A place for all of your files
            </h3>
            <p className="mt-1 text-xs text-[#747775] dark:text-[#8E918F] max-w-sm">
              {searchQuery
                ? `No files found for "${searchQuery}".`
                : activeFolder
                ? 'This folder is empty. Drag files here or use the "+ New" button to upload.'
                : 'Drag your files here or use the "+ New" button on the left to upload.'}
            </p>
          </div>
        ) : null}
      </div>
      <EmptyAreaContextMenu x={emptyContextMenu.x} y={emptyContextMenu.y} open={emptyContextMenu.open} canPasteFolder={Boolean(cutFolder)} onClose={() => setEmptyContextMenu({ x: 0, y: 0, open: false })} onUpload={() => { setUploadOpen(true); setEmptyContextMenu({ x: 0, y: 0, open: false }) }} onCreateFolder={() => { setFolderOpen(true); setEmptyContextMenu({ x: 0, y: 0, open: false }) }} onPasteFolder={() => { pasteFolder().catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to paste folder')); setEmptyContextMenu({ x: 0, y: 0, open: false }) }} />
      <FileContextMenu x={contextMenu.x} y={contextMenu.y} file={contextMenu.file} onClose={() => setContextMenu({ x: 0, y: 0, file: null })} onView={viewFile} onDownload={downloadFile} onRename={() => { setRenameValue(activeFile?.name ?? ''); setRenameOpen(true); setContextMenu({ x: 0, y: 0, file: null }) }} onMove={() => { setMoveOpen(true); setContextMenu({ x: 0, y: 0, file: null }) }} onDetails={() => { setDetailOpen(true); setContextMenu({ x: 0, y: 0, file: null }) }} onShare={() => shareFile(contextMenu.file ?? activeFile)} onCopyLink={() => copyShareLinkDirect(contextMenu.file ?? activeFile)} onDelete={() => { setDeleteOpen(true); setContextMenu({ x: 0, y: 0, file: null }) }} />
      <FolderContextMenu x={folderContextMenu.x} y={folderContextMenu.y} folder={folderContextMenu.folder} onClose={() => setFolderContextMenu({ x: 0, y: 0, folder: null })} onCut={() => cutSelectedFolder(activeFolderForMenu ?? folderContextMenu.folder)} onRename={() => { setFolderRenameValue(activeFolderForMenu?.name ?? ''); setFolderRenameColor(normalizeFolderColor(activeFolderForMenu?.color)); setFolderRenameIconUrl(activeFolderForMenu?.iconUrl ?? defaultFolderIconUrl); setFolderRenameOpen(true); setFolderContextMenu({ x: 0, y: 0, folder: null }) }} onShare={() => shareFolder(folderContextMenu.folder ?? activeFolderForMenu)} onCopyLink={() => copyFolderLink(folderContextMenu.folder ?? activeFolderForMenu)} onDelete={() => { setFolderDeleteOpen(true); setFolderContextMenu({ x: 0, y: 0, folder: null }) }} />
      <FileDetailsDrawer open={detailOpen} file={activeFile} onClose={() => setDetailOpen(false)} onShare={shareFile} />

      <DummyModal open={uploadOpen} title="Upload File" description="Stream file directly to selected Google Drive account." onClose={() => setUploadOpen(false)}>
        <form onSubmit={uploadFile} className="grid gap-4">
           <label onDragEnter={handleUploadDrag} onDragOver={handleUploadDrag} onDragLeave={handleUploadDrag} onDrop={handleUploadDrag} className={isUploadDragging ? 'grid cursor-pointer gap-2.5 rounded-2xl border-2 border-dashed border-[#0B57D0] bg-[#C2E7FF]/20 p-5 text-center transition' : 'grid cursor-pointer gap-2.5 rounded-2xl border-2 border-dashed border-[#E0E3E7] bg-[#F8FAFD] p-5 text-center transition hover:border-[#0B57D0] hover:bg-[#F0F4F9] dark:border-[#36373A] dark:bg-[#28292A]'}>
            <Upload className={isUploadDragging ? 'mx-auto h-8 w-8 text-[#0B57D0]' : 'mx-auto h-8 w-8 text-[#444746] dark:text-[#C4C7C5]'} />
            <span className="text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">Drop files here or click to browse</span>
            <span className="text-xs text-[#747775] dark:text-[#8E918F]">Files stream directly to Google Drive folder <code>9drive</code>.</span>
            <Input type="file" className="sr-only" multiple onChange={(event) => selectUploadFiles(event.target.files)} required={selectedFiles.length === 0} />
          </label>
          <div className="grid gap-1.5 text-xs font-medium text-[#444746] dark:text-[#C4C7C5]">
            <span>Target Storage Account</span>
            <Select
              variant="default"
              value={selectedTargetAccountId}
              onChange={(value) => setSelectedTargetAccountId(value)}
              options={[
                { value: '', label: 'Automatic (Default)' },
                ...connectedAccounts.map((account) => ({
                  value: account.id,
                  label: `${account.email || account.displayName || account.id} (${account.provider === 's3' ? 'S3' : 'Google Drive'})`,
                })),
              ]}
            />
          </div>
          {activeFolder ? (
            <p className="rounded-lg bg-[#F8FAFD] p-2.5 text-xs text-[#444746] border border-[#E0E3E7] dark:bg-[#28292A] dark:border-[#36373A] dark:text-[#C4C7C5]">
              Uploading to: <b>{activeFolder.name}</b>
            </p>
          ) : (
            <div className="grid gap-1.5 text-xs font-medium text-[#444746] dark:text-[#C4C7C5]">
              <span>Virtual Folder</span>
              <Select
                variant="default"
                value={selectedFolderId}
                onChange={(value) => setSelectedFolderId(value)}
                options={[
                  { value: '', label: 'No folder' },
                  ...allFolders.map((folder) => ({
                    value: folder.id ?? '',
                    label: folder.name,
                  })),
                ]}
              />
            </div>
          )}
          {selectedFiles.length > 0 ? (
            <div className="grid max-h-48 gap-1.5 overflow-y-auto rounded-xl bg-[#F8FAFD] p-3 text-xs text-[#444746] dark:bg-[#28292A] dark:text-[#C4C7C5]">
              <div className="flex items-center justify-between pb-1 font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                <span>{selectedFiles.length} file(s) selected</span>
                <span>{formatBytes(selectedFiles.reduce((total, file) => total + file.size, 0))}</span>
              </div>
              {selectedFiles.map((file, index) => (
                <div key={`${file.name}-${file.size}-${index}`} className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-white p-2 border border-[#E0E3E7] dark:bg-[#1E1F20] dark:border-[#36373A]">
                  <span className="min-w-0 flex-1 truncate font-medium" title={file.name}>{file.name}</span>
                  <span className="shrink-0 text-slate-500">{formatBytes(file.size)}</span>
                  <button type="button" className="shrink-0 text-[#747775] hover:text-[#B3261E]" onClick={() => removeUploadFile(index)} aria-label={`Remove ${file.name}`}><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button disabled={loading || selectedFiles.length === 0}>{loading ? 'Uploading...' : `Upload${selectedFiles.length > 1 ? ` ${selectedFiles.length} files` : ''}`}</Button>
          </div>
        </form>
      </DummyModal>

      <DummyModal open={folderOpen} title="New Folder" description="Create a virtual folder for organizing files." onClose={() => setFolderOpen(false)}>
        <form onSubmit={createFolder} className="grid gap-4">
          <label className="grid gap-1.5 text-xs font-medium text-[#444746] dark:text-[#C4C7C5]">
            Folder Name
            <Input value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="Untitled folder" required autoFocus />
          </label>
          <FolderAppearanceFields color={folderColor} iconUrl={folderIconUrl} onColorChange={setFolderColor} onIconChange={setFolderIconUrl} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setFolderOpen(false)}>Cancel</Button>
            <Button>Create</Button>
          </div>
        </form>
      </DummyModal>

      <DummyModal open={renameOpen} title="Rename" description={activeFile?.name ?? ''} onClose={() => setRenameOpen(false)}>
        <form onSubmit={renameFile} className="grid gap-4">
          <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} required autoFocus />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button>OK</Button>
          </div>
        </form>
      </DummyModal>

      <DummyModal open={moveOpen} title="Move" description={selectedFileIds.size > 0 ? `Move ${selectedFileIds.size} files` : activeFile?.name ?? ''} onClose={() => setMoveOpen(false)}>
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
            <Button type="button" variant="ghost" onClick={() => setMoveOpen(false)}>Cancel</Button>
            <Button>Move here</Button>
          </div>
        </form>
      </DummyModal>

      <DummyModal open={deleteOpen} title={selectedFileIds.size > 0 ? 'Move to trash?' : 'Move to trash?'} description={selectedFileIds.size > 0 ? `Delete ${selectedFileIds.size} files from Google Drive?` : `Delete "${activeFile?.name ?? 'file'}"?`} onClose={() => setDeleteOpen(false)}>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={deleteFile}>Move to trash</Button>
        </div>
      </DummyModal>

      <ShareModal
        open={shareOpen}
        file={shareTarget}
        onClose={() => setShareOpen(false)}
      />

      <DummyModal open={folderRenameOpen} title="Rename" description={activeFolderForMenu?.name ?? ''} onClose={() => setFolderRenameOpen(false)}>
        <form onSubmit={renameFolder} className="grid gap-4">
          <Input value={folderRenameValue} onChange={(event) => setFolderRenameValue(event.target.value)} required autoFocus />
          <FolderAppearanceFields color={folderRenameColor} iconUrl={folderRenameIconUrl} onColorChange={setFolderRenameColor} onIconChange={setFolderRenameIconUrl} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setFolderRenameOpen(false)}>Cancel</Button>
            <Button>OK</Button>
          </div>
        </form>
      </DummyModal>

      <DummyModal open={folderDeleteOpen} title="Delete folder?" description={`Delete virtual folder "${activeFolderForMenu?.name ?? ''}"? Files inside will remain uploaded.`} onClose={() => setFolderDeleteOpen(false)}>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setFolderDeleteOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={deleteFolder}>Delete</Button>
        </div>
      </DummyModal>

      <DummyModal open={previewOpen} title="File Preview" description={activeFile?.name ?? ''} onClose={closePreview} className="overflow-hidden sm:max-w-[95vw] xl:max-w-[1400px]">
        <div className="flex h-[72dvh] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:h-[80vh]">
          {previewLoading ? <div className="p-6 text-center text-sm font-semibold text-slate-500">Loading preview...</div> : null}
          {previewError ? <div className="p-6 text-center text-sm text-red-600">{previewError}</div> : null}
          {!previewLoading && !previewError && activePreviewKind === 'image' && previewUrl ? <img src={previewUrl} alt={activeFile?.name ?? 'File preview'} className="max-h-full max-w-full object-contain" onError={() => setPreviewError('Failed to load preview.')} /> : null}
          {!previewLoading && !previewError && activePreviewKind === 'video' && previewUrl ? <div className="shared-video-shell"><video ref={previewVideoRef} controls playsInline preload="metadata" onError={() => setPreviewError('Failed to load preview.')}><source src={previewUrl} type={activeFile?.mimeType} /></video></div> : null}
          {!previewLoading && !previewError && activePreviewKind === 'document' && previewUrl ? <iframe src={previewUrl} title={activeFile?.name ?? 'File preview'} className="h-full w-full border-0 bg-white" /> : null}
          {!previewLoading && !previewError && activePreviewKind === 'office' && previewUrl ? <iframe src={officeViewerUrl(previewUrl)} title={activeFile?.name ?? 'File preview'} className="h-full w-full border-0 bg-white" /> : null}
          {!previewLoading && !previewError && !activePreviewKind ? <div className="p-6 text-center text-sm text-slate-500">Preview not available for this file type. Use Download instead.</div> : null}
        </div>
      </DummyModal>
    </>
  )
}
