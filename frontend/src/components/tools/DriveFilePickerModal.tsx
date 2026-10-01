import { useState, useEffect } from 'react'
import { Check, Folder as FolderIcon, Loader2, Search, X } from 'lucide-react'
import { API_URL, apiFetch, formatBytes } from '@/lib/api'
import { getAccessToken } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileIcon } from '@/components/drive/FileIcon'

type BackendFile = {
  id: string
  name: string
  mimeType: string
  sizeBytes: string
  createdAt: string
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
  const [files, setFiles] = useState<BackendFile[]>([])
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set())
      return
    }

    async function fetchFiles() {
      setLoading(true)
      try {
        const data = await apiFetch<{ files: BackendFile[] }>('/files?status=active')
        let filtered = data.files || []

        if (acceptFilter === 'image') {
          filtered = filtered.filter(
            (f) =>
              f.mimeType?.startsWith('image/') ||
              /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(f.name)
          )
        } else if (acceptFilter === 'pdf') {
          filtered = filtered.filter(
            (f) =>
              f.mimeType?.includes('pdf') || f.name.toLowerCase().endsWith('.pdf')
          )
        } else if (acceptFilter === 'video') {
          filtered = filtered.filter(
            (f) =>
              f.mimeType?.startsWith('video/') ||
              /\.(mp4|webm|mkv|mov|avi)$/i.test(f.name)
          )
        }

        setFiles(filtered)
      } catch (err) {
        console.error('Failed to load drive files:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFiles()
  }, [open, acceptFilter])

  if (!open) return null

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  )

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
      console.error('Error importing files from 9Drive:', err)
      alert('Gagal mengambil berkas dari 9Drive.')
    } finally {
      setDownloading(false)
    }
  }

  function getKind(mime: string, name: string): 'image' | 'pdf' | 'doc' | 'video' {
    if (mime.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(name)) return 'image'
    if (mime.includes('pdf') || name.toLowerCase().endsWith('.pdf')) return 'pdf'
    if (mime.startsWith('video/')) return 'video'
    return 'doc'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/32 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-xl max-h-[85vh] bg-white dark:bg-[#1E1F20] rounded-[28px] shadow-2xl border border-[#E0E3E7] dark:border-[#36373A] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E3E7] dark:border-[#36373A]">
          <div>
            <h2 className="text-base font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
              Pilih dari 9Drive
            </h2>
            <p className="text-xs text-[#747775] dark:text-[#8E918F] mt-0.5">
              Pilih berkas {acceptFilter === 'image' ? 'gambar' : acceptFilter === 'pdf' ? 'PDF' : ''} yang tersimpan di Drive
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

        {/* Search Bar */}
        <div className="px-6 py-2.5 border-b border-[#E0E3E7]/60 dark:border-[#36373A]/60 bg-[#F8FAFD] dark:bg-[#131314]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#747775]" />
            <Input
              type="text"
              placeholder="Cari berkas di 9Drive..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs rounded-full bg-white dark:bg-[#28292A] border-[#E0E3E7] dark:border-[#36373A]"
            />
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 min-h-[260px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-xs text-[#747775]">
              <Loader2 className="w-5 h-5 animate-spin text-[#0B57D0]" />
              <span>Memuat daftar berkas...</span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-xs text-[#747775] text-center">
              <FolderIcon className="w-7 h-7 text-[#747775]/50" />
              <p>Tidak ada berkas {acceptFilter} yang cocok di 9Drive.</p>
            </div>
          ) : (
            filteredFiles.map((file) => {
              const selected = selectedIds.has(file.id)
              return (
                <div
                  key={file.id}
                  onClick={() => toggleSelect(file.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors border ${
                    selected
                      ? 'border-[#0B57D0] bg-[#C2E7FF] text-[#001D35] dark:border-[#004A77] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                      : 'border-transparent hover:bg-[#F0F4F9] dark:hover:bg-[#28292A]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-7 h-7 flex items-center justify-center shrink-0">
                      <FileIcon
                        kind={getKind(file.mimeType, file.name)}
                        className="w-5 h-5"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3] truncate">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-[#747775] dark:text-[#8E918F]">
                        {formatBytes(file.sizeBytes)} • {new Date(file.createdAt).toLocaleDateString()}
                      </p>
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
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E0E3E7] dark:border-[#36373A] bg-[#F8FAFD] dark:bg-[#131314]">
          <span className="text-xs text-[#747775] dark:text-[#8E918F]">
            {selectedIds.size} berkas dipilih
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
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              disabled={selectedIds.size === 0 || downloading}
              className="h-8 px-4 text-xs font-medium rounded-full bg-[#0B57D0] hover:bg-[#0B57D0]/90 text-white min-w-[90px]"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Mengambil...
                </>
              ) : (
                `Impor (${selectedIds.size})`
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
