import { useState, useEffect, useId } from 'react'
import { useDialogFocus } from '@/hooks/useDialogFocus'
import {
  Archive,
  CheckCircle,
  Cloud,
  Download,
  Folder as FolderIcon,
  FolderPlus,
  HardDrive,
  Loader2,
  X,
  Zap,
} from 'lucide-react'
import { apiFetch, formatBytes } from '@/lib/api'
import { useUpload } from '@/context/UploadContext'
import { useToast } from '@/context/ToastContext'
import { bundleAndDownloadZip, downloadBlob } from '@/lib/tools/zip-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type BackendFolder = {
  id: string
  name: string
  color?: string
}

export type ProcessedFileItem = {
  name: string
  blob: Blob
  size?: number
}

type Props = {
  open: boolean
  onClose: () => void
  files: ProcessedFileItem[]
  defaultZipName?: string
  toolName?: string
}

export function SaveDestinationModal({
  open,
  onClose,
  files,
  defaultZipName = 'processed_files.zip',
  toolName = 'Tool Studio',
}: Props) {
  const dialogRef = useDialogFocus(open, onClose)
  const titleId = useId()
  const [folders, setFolders] = useState<BackendFolder[]>([])
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [foldersError, setFoldersError] = useState('')
  const [folderRetry, setFolderRetry] = useState(0)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [mode, setMode] = useState<'drive' | 'local' | 'both'>('drive')
  const [zipName, setZipName] = useState(defaultZipName)

  // Selection state for individual vs batch
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())

  const { uploadFiles } = useUpload()
  const { toast } = useToast()

  // Reset selected indices when files or modal open change
  useEffect(() => {
    if (open) {
      setSelectedIndices(new Set(files.map((_, i) => i)))
      setZipName(defaultZipName)
    }
  }, [open, files, defaultZipName])

  useEffect(() => {
    if (!open) return
    async function loadFolders() {
      setLoadingFolders(true)
      setFoldersError('')
      try {
        const data = await apiFetch<{ folders: BackendFolder[] }>('/folders')
        setFolders(data.folders || [])
      } catch (err) {
        setFoldersError(err instanceof Error ? err.message : 'Gagal memuat folder')
      } finally {
        setLoadingFolders(false)
      }
    }
    loadFolders()
  }, [open, folderRetry])

  if (!open || files.length === 0) return null

  const toggleSelectIndex = (idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) {
        next.delete(idx)
      } else {
        next.add(idx)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIndices.size === files.length) {
      setSelectedIndices(new Set())
    } else {
      setSelectedIndices(new Set(files.map((_, i) => i)))
    }
  }

  const selectedFiles = files.filter((_, i) => selectedIndices.has(i))

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      const res = await apiFetch<{ folder: BackendFolder }>('/folders', {
        method: 'POST',
        body: JSON.stringify({ name: newFolderName.trim() }),
      })
      setFolders((prev) => [res.folder, ...prev])
      setSelectedFolderId(res.folder.id)
      setNewFolderName('')
      setCreatingFolder(false)
      toast.success(`Folder "${res.folder.name}" berhasil dibuat!`)
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat folder')
    }
  }

  const handleDownloadSingle = (file: ProcessedFileItem) => {
    downloadBlob(file.blob, file.name)
    toast.success(`Mengunduh ${file.name}...`)
  }

  const handleDownloadAllZip = async () => {
    setIsProcessing(true)
    try {
      await bundleAndDownloadZip(files, zipName)
      toast.success(`Mengunduh seluruh ${files.length} berkas dalam arsip ZIP!`)
    } catch (err: any) {
      toast.error('Gagal membuat berkas ZIP')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExecuteSave = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Pilih minimal satu berkas untuk disimpan.')
      return
    }

    setIsProcessing(true)
    try {
      // 1. Download Local
      if (mode === 'local' || mode === 'both') {
        if (selectedFiles.length === 1) {
          downloadBlob(selectedFiles[0].blob, selectedFiles[0].name)
        } else {
          await bundleAndDownloadZip(selectedFiles, zipName)
        }
      }

      // 2. Upload to 9Drive
      if (mode === 'drive' || mode === 'both') {
        const fileObjects = selectedFiles.map(
          (f) => new File([f.blob], f.name, { type: f.blob.type || 'application/octet-stream' })
        )
        await uploadFiles(fileObjects, selectedFolderId)
        toast.success(
          `${selectedFiles.length} berkas disimpan ke 9Drive${
            selectedFolderId
              ? ` (${folders.find((f) => f.id === selectedFolderId)?.name || 'folder'})`
              : ' (My Drive)'
          }!`
        )
      }

      onClose()
    } catch (err: any) {
      console.error('Save failed:', err)
      toast.error(err.message || 'Gagal menyimpan berkas')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/32">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="flex flex-col w-full max-w-lg max-h-[90dvh] bg-white dark:bg-[#1E1F20] rounded-[28px] shadow-2xl border border-[#E0E3E7] dark:border-[#36373A] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E3E7] dark:border-[#36373A]">
          <div>
            <h2 id={titleId} className="text-base font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
              Simpan Hasil Berkas
            </h2>
            <p className="text-xs text-[#747775] dark:text-[#8E918F] mt-0.5">
              {files.length} berkas hasil dari {toolName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close save destination"
            className="flex items-center justify-center w-11 h-11 rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Destination Mode Selector (M3 Chips) */}
        <div className="px-6 py-3 border-b border-[#E0E3E7]/60 dark:border-[#36373A]/60 bg-[#F8FAFD] dark:bg-[#131314]">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'drive' as const, label: 'Ke 9Drive', icon: Cloud },
              { id: 'local' as const, label: 'Download PC', icon: Download },
              { id: 'both' as const, label: 'Keduanya', icon: Zap },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = mode === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMode(tab.id)}
                  className={`flex items-center justify-center gap-1.5 h-8 px-2 rounded-full text-xs font-medium border transition-all ${
                    isActive
                      ? 'bg-[#C2E7FF] text-[#001D35] border-[#C2E7FF] dark:bg-[#004A77] dark:text-[#C2E7FF] dark:border-[#004A77]'
                      : 'bg-white dark:bg-[#1E1F20] text-[#444746] dark:text-[#C4C7C5] border-[#E0E3E7] dark:border-[#36373A] hover:bg-[#F0F4F9]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {(mode === 'drive' || mode === 'both') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                  Pilih Folder Tujuan di 9Drive:
                </label>
                <button
                  type="button"
                  onClick={() => setCreatingFolder(!creatingFolder)}
                  className="text-xs text-[#0B57D0] dark:text-[#A8C7FA] hover:underline flex items-center gap-1 font-medium"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Folder Baru</span>
                </button>
              </div>

              {creatingFolder && (
                <div className="flex items-center gap-2 p-2 mb-3 rounded-xl bg-[#F0F4F9] dark:bg-[#28292A] border border-[#E0E3E7] dark:border-[#36373A]">
                  <Input
                    type="text"
                    placeholder="Nama folder baru..."
                    aria-label="Nama folder baru"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="h-8 text-xs bg-white dark:bg-[#1E1F20]"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  />
                  <Button size="sm" onClick={handleCreateFolder} className="h-8 text-xs rounded-lg">
                    Buat
                  </Button>
                </div>
              )}

              {/* Folder List */}
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {/* Root Option */}
                <button type="button" aria-pressed={selectedFolderId === null}
                  onClick={() => setSelectedFolderId(null)}
                  className={`flex w-full items-center justify-between p-2.5 rounded-xl cursor-pointer text-left transition-colors border ${
                    selectedFolderId === null
                      ? 'border-[#0B57D0] bg-[#C2E7FF] text-[#001D35] dark:border-[#004A77] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                      : 'border-[#E0E3E7] hover:bg-[#F8FAFD] text-[#444746] dark:border-[#36373A] dark:hover:bg-[#28292A] dark:text-[#C4C7C5]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <HardDrive className="w-4 h-4" />
                    <span className="text-xs font-medium">My Drive (Utama)</span>
                  </div>
                  {selectedFolderId === null && <CheckCircle className="w-4 h-4 text-[#0B57D0] dark:text-[#C2E7FF]" />}
                </button>

                {loadingFolders ? (
                  <div className="flex items-center justify-center p-4 text-xs text-[#747775]">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Memuat daftar folder...
                  </div>
                ) : foldersError ? <div role="alert" className="p-3 text-sm text-[#B3261E] dark:text-[#F2B8B5]"><p>{foldersError}</p><Button variant="outline" onClick={() => setFolderRetry(folderRetry + 1)}>Coba lagi</Button></div> : (
                  folders.map((folder) => {
                    const isSelected = selectedFolderId === folder.id
                    return (
                      <button type="button" aria-pressed={isSelected} title={folder.name}
                        key={folder.id}
                        onClick={() => setSelectedFolderId(folder.id)}
                        className={`flex w-full items-center justify-between p-2.5 rounded-xl cursor-pointer text-left transition-colors border ${
                          isSelected
                            ? 'border-[#0B57D0] bg-[#C2E7FF] text-[#001D35] dark:border-[#004A77] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                            : 'border-[#E0E3E7] hover:bg-[#F8FAFD] text-[#444746] dark:border-[#36373A] dark:hover:bg-[#28292A] dark:text-[#C4C7C5]'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <FolderIcon className="w-4 h-4 text-[#5F6368]" />
                          <span className="text-xs font-medium truncate">{folder.name}</span>
                        </div>
                        {isSelected && <CheckCircle className="w-4 h-4 text-[#0B57D0] dark:text-[#C2E7FF]" />}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {(mode === 'local' || mode === 'both') && selectedFiles.length > 1 && (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                Nama Berkas ZIP:
              </label>
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-[#747775]" />
                <Input
                  type="text"
                  value={zipName}
                  aria-label="Nama file ZIP"
                  onChange={(e) => setZipName(e.target.value)}
                  className="h-8 text-xs rounded-lg"
                  placeholder="arsip.zip"
                />
              </div>
            </div>
          )}

          {/* Interactive File Selection & Individual Download List */}
          <div className="rounded-2xl p-3.5 bg-[#F8FAFD] dark:bg-[#131314] border border-[#E0E3E7] dark:border-[#36373A] space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-[#E0E3E7]/60 dark:border-[#36373A]/60">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                <input
                  type="checkbox"
                  checked={selectedIndices.size === files.length && files.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded text-[#0B57D0] focus:ring-[#0B57D0] accent-[#0B57D0] cursor-pointer"
                />
                <span>Pilih Semua Berkas</span>
              </label>

              <span className="text-[11px] text-[#747775] dark:text-[#8E918F]">
                {selectedIndices.size} dari {files.length} dipilih
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {files.map((f, i) => {
                const isChecked = selectedIndices.has(i)
                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-2 rounded-xl border transition-colors ${
                      isChecked
                        ? 'border-[#C2E7FF] bg-white dark:border-[#004A77] dark:bg-[#1E1F20]'
                        : 'border-transparent bg-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectIndex(i)}
                        className="w-3.5 h-3.5 rounded text-[#0B57D0] focus:ring-[#0B57D0] accent-[#0B57D0] cursor-pointer shrink-0"
                      />
                      <span className="text-xs text-[#1F1F1F] dark:text-[#E3E3E3] truncate">
                        {f.name}
                      </span>
                      {f.size && (
                        <span className="text-[10px] text-[#747775] dark:text-[#8E918F] shrink-0 font-mono">
                          {formatBytes(f.size)}
                        </span>
                      )}
                    </label>

                    {/* Direct 1-by-1 download button */}
                    <button
                      type="button"
                      onClick={() => handleDownloadSingle(f)}
                      title={`Unduh ${f.name} secara terpisah`}
                      className="w-7 h-7 rounded-lg hover:bg-[#F0F4F9] dark:hover:bg-[#28292A] text-[#747775] hover:text-[#0B57D0] dark:text-[#8E918F] dark:hover:text-[#A8C7FA] flex items-center justify-center shrink-0 ml-1 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[#E0E3E7] dark:border-[#36373A] bg-[#F8FAFD] dark:bg-[#131314]">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isProcessing}
              className="h-9 text-xs rounded-full border-[#E0E3E7] dark:border-[#36373A]"
            >
              Batal
            </Button>

            {files.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadAllZip}
                disabled={isProcessing}
                className="h-9 px-3 text-xs rounded-full border-[#E0E3E7] dark:border-[#36373A] text-[#1F1F1F] dark:text-[#E3E3E3] hover:bg-[#F0F4F9] dark:hover:bg-[#28292A]"
              >
                <Archive className="w-3.5 h-3.5 mr-1 text-[#0B57D0] dark:text-[#A8C7FA]" />
                Unduh Semua (.zip)
              </Button>
            )}
          </div>

          <Button
            size="sm"
            onClick={handleExecuteSave}
            disabled={isProcessing || selectedIndices.size === 0}
            className="h-9 px-5 text-xs font-medium rounded-full bg-[#0B57D0] hover:bg-[#0842A0] text-white shadow-xs w-full sm:w-auto"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                Menyimpan...
              </>
            ) : mode === 'drive' ? (
              <>
                <Cloud className="w-3.5 h-3.5 mr-1.5" />
                Simpan Terpilih ({selectedIndices.size}) ke 9Drive
              </>
            ) : mode === 'local' ? (
              <>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Unduh Terpilih ({selectedIndices.size})
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                Simpan & Unduh ({selectedIndices.size})
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
