import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CheckCircle,
  ChevronRight,
  Download,
  Loader2,
  Palette,
  Play,
  Sparkles,
} from 'lucide-react'
import { processBackgroundRemoval, type BgBackdropType } from '@/lib/tools/bg-removal-service'
import { BatchFileQueue, type BatchItem } from '@/components/tools/BatchFileQueue'
import { BeforeAfterPreview } from '@/components/tools/BeforeAfterPreview'
import { DriveFilePickerModal } from '@/components/tools/DriveFilePickerModal'
import { SaveDestinationModal, type ProcessedFileItem } from '@/components/tools/SaveDestinationModal'
import { Button } from '@/components/ui/button'
import { useToast } from '@/context/ToastContext'

export function BackgroundRemoverTool() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const [queue, setQueue] = useState<BatchItem[]>([])
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0)
  const [drivePickerOpen, setDrivePickerOpen] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [isProcessingBatch, setIsProcessingBatch] = useState(false)

  // Backdrop configuration for export
  const [backdropType, setBackdropType] = useState<BgBackdropType>('transparent')
  const [colorHex, setColorHex] = useState('#FFFFFF')
  const [addShadow, setAddShadow] = useState(false)

  // Handle files preloaded from navigation state (e.g. from File Context Menu)
  useEffect(() => {
    if (location.state && (location.state as any).initialFiles) {
      const initFiles = (location.state as any).initialFiles as File[]
      addFilesToQueue(initFiles)
    }
  }, [location.state])

  const addFilesToQueue = (files: File[]) => {
    const imageFiles = files.filter(
      (f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/i.test(f.name)
    )
    if (imageFiles.length === 0) {
      toast.error('Pilih file gambar yang valid (JPG, PNG, WebP).')
      return
    }

    const newItems: BatchItem[] = imageFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      status: 'idle',
      thumbnailUrl: URL.createObjectURL(file),
    }))

    setQueue((prev) => [...prev, ...newItems])
  }

  const handleRemoveQueueItem = (id: string) => {
    setQueue((prev) => {
      const filtered = prev.filter((item) => item.id !== id)
      if (activePreviewIndex >= filtered.length) {
        setActivePreviewIndex(Math.max(0, filtered.length - 1))
      }
      return filtered
    })
  }

  const handleProcessAll = async () => {
    if (queue.length === 0) return
    setIsProcessingBatch(true)

    const updatedQueue = [...queue]
    for (let i = 0; i < updatedQueue.length; i++) {
      const item = updatedQueue[i]
      if (item.status === 'completed') continue

      updatedQueue[i] = { ...item, status: 'processing', progress: 5, statusMessage: 'Memulai segmentasi AI...' }
      setQueue([...updatedQueue])

      try {
        const resultBlob = await processBackgroundRemoval(item.file, {
          backdrop: backdropType,
          colorHex,
          addShadow,
          onProgress: (percent, statusText) => {
            updatedQueue[i] = {
              ...updatedQueue[i],
              progress: percent,
              statusMessage: statusText,
            }
            setQueue([...updatedQueue])
          },
        })

        updatedQueue[i] = {
          ...updatedQueue[i],
          status: 'completed',
          progress: 100,
          statusMessage: 'Latar belakang berhasil dihapus',
          resultBlob,
        }
        setQueue([...updatedQueue])
      } catch (err: any) {
        console.error(`Error processing ${item.file.name}:`, err)
        updatedQueue[i] = {
          ...updatedQueue[i],
          status: 'error',
          statusMessage: err.message || 'Pemrosesan gagal',
        }
        setQueue([...updatedQueue])
      }
    }

    setIsProcessingBatch(false)
    toast.success('Proses hapus background batch selesai!')
  }

  const completedItems = queue.filter((item) => item.status === 'completed' && item.resultBlob)

  const processedFilesForSave: ProcessedFileItem[] = completedItems.map((item) => {
    const baseName = item.file.name.replace(/\.[^/.]+$/, '')
    return {
      name: `${baseName}_nobg.png`,
      blob: item.resultBlob!,
      size: item.resultBlob!.size,
    }
  })

  const currentPreviewItem = queue[activePreviewIndex]

  return (
    <div className="flex flex-col min-h-full w-full min-w-0">
      {/* Google Drive Breadcrumbs Header */}
      <div className="flex flex-col gap-2 pb-3 border-b border-[#E0E3E7]/70 dark:border-[#36373A]/70 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/tools')}
            className="text-xl sm:text-[22px] font-normal transition-colors text-[#444746] hover:text-[#0B57D0] dark:text-[#C4C7C5]"
          >
            Tools Studio
          </button>
          <ChevronRight className="h-4 w-4 text-[#747775] shrink-0" />
          <span className="truncate text-xl sm:text-[22px] font-normal text-[#1F1F1F] dark:text-[#E3E3E3]">
            Hapus Background AI
          </span>
        </div>

        <div className="flex items-center gap-2 sm:shrink-0 sm:justify-end">
          {completedItems.length > 0 && (
            <Button
              type="button"
              size="sm"
              onClick={() => setSaveModalOpen(true)}
              className="h-9 px-4 text-xs font-medium rounded-full bg-[#0F9D58] hover:bg-[#0F9D58]/90 text-white"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Simpan Hasil ({completedItems.length})
            </Button>
          )}

          {queue.length > 0 && (
            <Button
              type="button"
              size="sm"
              onClick={handleProcessAll}
              disabled={isProcessingBatch}
              className="h-9 px-5 text-xs font-medium rounded-full bg-[#0B57D0] hover:bg-[#0B57D0]/90 text-white shadow-xs"
            >
              {isProcessingBatch ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Memproses...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 mr-1.5" />
                  Proses Semua ({queue.length})
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4 flex-1">
        {/* Left Column: Settings & Queue */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Backdrop Options Card */}
          <div className="p-4 rounded-2xl border border-[#E0E3E7] bg-white dark:border-[#36373A] dark:bg-[#1E1F20] space-y-3">
            <span className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3] flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-[#0B57D0]" />
              Pengaturan Latar Hasil
            </span>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBackdropType('transparent')}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium border text-center transition-all ${
                  backdropType === 'transparent'
                    ? 'border-[#0B57D0] bg-[#C2E7FF] text-[#001D35] dark:border-[#004A77] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                    : 'border-[#E0E3E7] dark:border-[#36373A] text-[#444746] dark:text-[#C4C7C5] hover:bg-[#F0F4F9] dark:hover:bg-[#28292A]'
                }`}
              >
                Transparan
              </button>
              <button
                type="button"
                onClick={() => setBackdropType('color')}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium border text-center transition-all ${
                  backdropType === 'color'
                    ? 'border-[#0B57D0] bg-[#C2E7FF] text-[#001D35] dark:border-[#004A77] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                    : 'border-[#E0E3E7] dark:border-[#36373A] text-[#444746] dark:text-[#C4C7C5] hover:bg-[#F0F4F9] dark:hover:bg-[#28292A]'
                }`}
              >
                Warna Solid
              </button>
              <button
                type="button"
                onClick={() => setAddShadow(!addShadow)}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium border text-center transition-all ${
                  addShadow
                    ? 'border-[#0B57D0] bg-[#C2E7FF] text-[#001D35] dark:border-[#004A77] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                    : 'border-[#E0E3E7] dark:border-[#36373A] text-[#444746] dark:text-[#C4C7C5] hover:bg-[#F0F4F9] dark:hover:bg-[#28292A]'
                }`}
              >
                {addShadow ? '✓ Bayangan' : '+ Bayangan'}
              </button>
            </div>

            {backdropType === 'color' && (
              <div className="flex items-center gap-2 pt-1 border-t border-[#E0E3E7]/60 dark:border-[#36373A]/60">
                <input
                  type="color"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="w-7 h-7 rounded-md cursor-pointer border border-[#E0E3E7] p-0.5"
                />
                <span className="text-xs font-mono text-[#747775]">{colorHex.toUpperCase()}</span>
                <div className="flex items-center gap-1.5 ml-auto">
                  {['#FFFFFF', '#000000', '#D32F2F', '#1976D2'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setColorHex(preset)}
                      className="w-5 h-5 rounded-full border border-black/20"
                      style={{ backgroundColor: preset }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Queue Component */}
          <BatchFileQueue
            items={queue}
            onAddFiles={addFilesToQueue}
            onRemoveItem={handleRemoveQueueItem}
            onClear={() => setQueue([])}
            onOpenDrivePicker={() => setDrivePickerOpen(true)}
            accept="image/*"
            disabled={isProcessingBatch}
          />
        </div>

        {/* Right Column: Preview Area */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          {queue.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] text-center min-h-[350px]">
              <div className="w-12 h-12 rounded-2xl bg-[#EDF2FC] dark:bg-[#28292A] text-[#0B57D0] dark:text-[#A8C7FA] flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3] mb-1">
                Belum ada foto yang dipilih
              </h3>
              <p className="text-xs text-[#747775] dark:text-[#8E918F] max-w-sm">
                Unggah foto dari perangkat atau ambil langsung dari 9Drive untuk menghapus latar belakang.
              </p>
            </div>
          ) : currentPreviewItem && currentPreviewItem.resultBlob ? (
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3] flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-[#0F9D58]" />
                  Hasil: {currentPreviewItem.file.name}
                </span>
                {queue.length > 1 && (
                  <span className="text-xs text-[#747775]">
                    {activePreviewIndex + 1} dari {queue.length}
                  </span>
                )}
              </div>

              {/* Before After Slider */}
              <BeforeAfterPreview
                originalUrl={currentPreviewItem.thumbnailUrl!}
                cutoutUrl={URL.createObjectURL(currentPreviewItem.resultBlob)}
                alt={currentPreviewItem.file.name}
              />

              {/* Thumbnails row */}
              {queue.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {queue.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActivePreviewIndex(index)}
                      className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                        activePreviewIndex === index
                          ? 'border-[#0B57D0] scale-105'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={item.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      {item.status === 'completed' && (
                        <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#0F9D58] text-white flex items-center justify-center text-[9px]">
                          ✓
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] text-center min-h-[350px]">
              <img
                src={currentPreviewItem?.thumbnailUrl}
                alt=""
                className="max-h-60 object-contain rounded-xl mb-3 border border-[#E0E3E7] dark:border-[#36373A]"
              />
              <p className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3] mb-1">
                {currentPreviewItem?.file.name}
              </p>
              <p className="text-[11px] text-[#747775] mb-4">
                Siap diproses. Klik tombol di bawah untuk menjalankan segmentasi AI.
              </p>
              <Button
                type="button"
                onClick={handleProcessAll}
                disabled={isProcessingBatch}
                className="h-8 px-5 rounded-full text-xs font-medium bg-[#0B57D0] hover:bg-[#0B57D0]/90 text-white"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Hapus Background Sekarang
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <DriveFilePickerModal
        open={drivePickerOpen}
        onClose={() => setDrivePickerOpen(false)}
        onSelectFiles={addFilesToQueue}
        acceptFilter="image"
        multiple
      />

      <SaveDestinationModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        files={processedFilesForSave}
        defaultZipName="9drive_hasil_hapus_bg.zip"
        toolName="Hapus Background AI"
      />
    </div>
  )
}
