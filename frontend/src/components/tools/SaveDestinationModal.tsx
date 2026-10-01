import { useState, useEffect } from 'react'
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
import { apiFetch } from '@/lib/api'
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
  const [folders, setFolders] = useState<BackendFolder[]>([])
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [mode, setMode] = useState<'drive' | 'local' | 'both'>('drive')
  const [zipName, setZipName] = useState(defaultZipName)

  const { uploadFiles } = useUpload()
  const { toast } = useToast()

  useEffect(() => {
    if (!open) return
    async function loadFolders() {
      setLoadingFolders(true)
      try {
        const data = await apiFetch<{ folders: BackendFolder[] }>('/folders')
        setFolders(data.folders || [])
      } catch (err) {
        console.error('Failed to load folders:', err)
      } finally {
        setLoadingFolders(false)
      }
    }
    loadFolders()
  }, [open])

  if (!open || files.length === 0) return null

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

  const handleExecuteSave = async () => {
    setIsProcessing(true)
    try {
      // 1. Download Local
      if (mode === 'local' || mode === 'both') {
        if (files.length === 1) {
          downloadBlob(files[0].blob, files[0].name)
        } else {
          await bundleAndDownloadZip(files, zipName)
        }
      }

      // 2. Upload to 9Drive
      if (mode === 'drive' || mode === 'both') {
        const fileObjects = files.map(
          (f) => new File([f.blob], f.name, { type: f.blob.type || 'application/octet-stream' })
        )
        await uploadFiles(fileObjects, selectedFolderId)
        toast.success(
          `${files.length} berkas disimpan ke 9Drive${
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/32 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-lg max-h-[85vh] bg-white dark:bg-[#1E1F20] rounded-[28px] shadow-2xl border border-[#E0E3E7] dark:border-[#36373A] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E3E7] dark:border-[#36373A]">
          <div>
            <h2 className="text-base font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
              Simpan Hasil Berkas
            </h2>
            <p className="text-xs text-[#747775] dark:text-[#8E918F] mt-0.5">
              {files.length} berkas hasil dari {toolName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10"
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
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="h-8 text-xs bg-white dark:bg-[#1E1F20]"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleCreateFolder} className="h-8 text-xs rounded-lg">
                    Buat
                  </Button>
                </div>
              )}

              {/* Folder List */}
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {/* Root Option */}
                <div
                  onClick={() => setSelectedFolderId(null)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors border ${
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
                </div>

                {loadingFolders ? (
                  <div className="flex items-center justify-center p-4 text-xs text-[#747775]">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Memuat daftar folder...
                  </div>
                ) : (
                  folders.map((folder) => {
                    const isSelected = selectedFolderId === folder.id
                    return (
                      <div
                        key={folder.id}
                        onClick={() => setSelectedFolderId(folder.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors border ${
                          isSelected
                            ? 'border-[#0B57D0] bg-[#C2E7FF] text-[#001D35] dark:border-[#004A77] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                            : 'border-[#E0E3E7] hover:bg-[#F8FAFD] text-[#444746] dark:border-[#36373A] dark:hover:bg-[#28292A] dark:text-[#C4C7C5]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <FolderIcon className="w-4 h-4 text-[#5F6368]" />
                          <span className="text-xs font-medium truncate">{folder.name}</span>
                        </div>
                        {isSelected && <CheckCircle className="w-4 h-4 text-[#0B57D0] dark:text-[#C2E7FF]" />}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {(mode === 'local' || mode === 'both') && files.length > 1 && (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                Nama Berkas ZIP:
              </label>
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-[#747775]" />
                <Input
                  type="text"
                  value={zipName}
                  onChange={(e) => setZipName(e.target.value)}
                  className="h-8 text-xs rounded-lg"
                  placeholder="arsip.zip"
                />
              </div>
              <p className="text-[11px] text-[#747775]">
                Seluruh {files.length} berkas akan di-bundle menjadi 1 file ZIP saat diunduh.
              </p>
            </div>
          )}

          {/* Quick summary */}
          <div className="rounded-xl p-3 bg-[#F8FAFD] dark:bg-[#131314] border border-[#E0E3E7] dark:border-[#36373A]">
            <p className="text-[11px] font-medium text-[#747775] dark:text-[#8E918F] mb-1">
              Berkas yang siap disimpan ({files.length}):
            </p>
            <div className="max-h-20 overflow-y-auto space-y-0.5">
              {files.map((f, i) => (
                <div key={i} className="text-[11px] text-[#1F1F1F] dark:text-[#E3E3E3] truncate flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0F9D58]" />
                  <span>{f.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E0E3E7] dark:border-[#36373A] bg-[#F8FAFD] dark:bg-[#131314]">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing} className="h-8 text-xs rounded-full">
            Batal
          </Button>

          <Button
            size="sm"
            onClick={handleExecuteSave}
            disabled={isProcessing}
            className="h-8 px-5 text-xs font-medium rounded-full bg-[#0B57D0] hover:bg-[#0B57D0]/90 text-white min-w-[120px]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                Menyimpan...
              </>
            ) : mode === 'drive' ? (
              <>
                <Cloud className="w-3.5 h-3.5 mr-1.5" />
                Simpan ke 9Drive
              </>
            ) : mode === 'local' ? (
              <>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Unduh ke PC
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                Simpan Keduanya
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
