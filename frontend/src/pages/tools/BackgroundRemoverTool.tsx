import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CheckCircle,
  ChevronRight,
  Cloud,
  Download,
  Loader2,
  Palette,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { processBackgroundRemoval, type BgBackdropType } from '@/lib/tools/bg-removal-service'
import { BatchFileQueue, type BatchItem } from '@/components/tools/BatchFileQueue'
import { BeforeAfterPreview } from '@/components/tools/BeforeAfterPreview'
import { ToolUploadHero } from '@/components/tools/ToolUploadHero'
import { RemoveBgIcon } from '@/components/tools/ToolIcons'
import { DriveFilePickerModal } from '@/components/tools/DriveFilePickerModal'
import { SaveDestinationModal, type ProcessedFileItem } from '@/components/tools/SaveDestinationModal'
import { downloadBlob } from '@/lib/tools/zip-service'
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
      if (initFiles.length > 0) {
        addFilesToQueue(initFiles)
      }
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

    const nextQueue = [...queue, ...newItems]
    setQueue(nextQueue)
    // Auto-process on upload!
    autoProcessQueue(nextQueue)
  }

  const autoProcessQueue = async (currentQueue: BatchItem[]) => {
    setIsProcessingBatch(true)
    const updatedQueue = [...currentQueue]

    for (let i = 0; i < updatedQueue.length; i++) {
      const item = updatedQueue[i]
      if (item.status === 'completed') continue

      updatedQueue[i] = {
        ...item,
        status: 'processing',
        progress: 10,
        statusMessage: 'Menghapus latar belakang foto...',
      }
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
    toast.success('Hapus background selesai!')
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

  const handleReset = () => {
    setQueue([])
    setActivePreviewIndex(0)
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

        {queue.length > 0 && (
          <div className="flex items-center gap-2 sm:shrink-0 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-9 px-4 text-xs font-medium rounded-full border-[#E0E3E7] dark:border-[#36373A] text-[#444746] dark:text-[#C4C7C5] hover:bg-[#F0F4F9] dark:hover:bg-[#28292A]"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Pilih Foto Lain
            </Button>

            {completedItems.length > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={() => setSaveModalOpen(true)}
                className="h-9 px-4 text-xs font-medium rounded-full bg-[#0B57D0] hover:bg-[#0842A0] text-white shadow-xs"
              >
                <Cloud className="w-3.5 h-3.5 mr-1.5" />
                Simpan ke 9Drive ({completedItems.length})
              </Button>
            )}
          </div>
        )}
      </div>

      {/* STATE 1: IDLE HERO (When no queue exists) */}
      {queue.length === 0 ? (
        <div className="w-full py-4 flex flex-col space-y-6">
          <ToolUploadHero
            title="Tarik & lepaskan foto ke sini, atau pilih berkas"
            description="Hapus background foto manusia, produk, atau objek secara otomatis dengan neural AI langsung di browser Anda."
            acceptedFormats={['JPG', 'PNG', 'WEBP']}
            accept="image/*,.png,.jpg,.jpeg,.webp"
            icon={RemoveBgIcon}
            iconColor="#7248B9"
            maxSizeText="Pemrosesan gambar di browser"
            multiple={true}
            onFilesSelected={addFilesToQueue}
            onOpenDrivePicker={() => setDrivePickerOpen(true)}
          />

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl border border-[#E0E3E7] bg-white dark:border-[#36373A] dark:bg-[#1E1F20]">
              <span className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3] flex items-center gap-1.5 mb-1">
                <Sparkles className="w-4 h-4 text-[#7248B9]" />
                Potong Otomatis Rapi
              </span>
              <p className="text-xs text-[#747775] dark:text-[#8E918F] leading-relaxed">
                Otomatis mengenali orang atau benda dan memotong tepian foto secara rapi dan presisi.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-[#E0E3E7] bg-white dark:border-[#36373A] dark:bg-[#1E1F20]">
              <span className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3] flex items-center gap-1.5 mb-1">
                <Palette className="w-4 h-4 text-[#0B57D0] dark:text-[#A8C7FA]" />
                Latar Kustom Fleksibel
              </span>
              <p className="text-xs text-[#747775] dark:text-[#8E918F] leading-relaxed">
                Pilih transparan PNG, latar warna solid (merah/biru pas foto), atau tambahkan bayangan halus.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-[#E0E3E7] bg-white dark:border-[#36373A] dark:bg-[#1E1F20]">
              <span className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3] flex items-center gap-1.5 mb-1">
                <Cloud className="w-4 h-4 text-[#0F9D58]" />
                Simpan Langsung ke Cloud
              </span>
              <p className="text-xs text-[#747775] dark:text-[#8E918F] leading-relaxed">
                Hasil langsung disimpan ke folder 9Drive atau diunduh ke penyimpanan komputer lokal.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* STATE 2 & 3: ACTIVE WORKSPACE (Auto-processing & Before/After Result) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4 flex-1">
          {/* Left Column: Settings & Queue */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            {/* Backdrop Options Card */}
            <div className="p-4 rounded-2xl border border-[#E0E3E7] bg-white dark:border-[#36373A] dark:bg-[#1E1F20] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3] flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-[#0B57D0]" />
                  Pengaturan Latar Hasil
                </span>
                {completedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => autoProcessQueue(queue)}
                    className="text-xs text-[#0B57D0] dark:text-[#A8C7FA] hover:underline font-medium"
                  >
                    Terapkan Ulang
                  </button>
                )}
              </div>

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
              onClear={handleReset}
              onOpenDrivePicker={() => setDrivePickerOpen(true)}
              accept="image/*"
              disabled={isProcessingBatch}
            />
          </div>

          {/* Right Column: Interactive Before/After Preview */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            {currentPreviewItem && currentPreviewItem.resultBlob ? (
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3] flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-[#0F9D58]" />
                    Hasil: {currentPreviewItem.file.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        downloadBlob(
                          currentPreviewItem.resultBlob!,
                          `${currentPreviewItem.file.name.replace(/\.[^/.]+$/, '')}_nobg.png`
                        )
                      }
                      className="h-8 px-3 text-xs rounded-full border-[#E0E3E7] dark:border-[#36373A]"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Unduh PNG
                    </Button>
                  </div>
                </div>

                {/* Before After Slider Component */}
                <BeforeAfterPreview
                  originalUrl={currentPreviewItem.thumbnailUrl!}
                  cutoutUrl={URL.createObjectURL(currentPreviewItem.resultBlob)}
                  alt={currentPreviewItem.file.name}
                />

                {/* Thumbnails row for batch */}
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
                <div className="flex items-center gap-2 text-xs text-[#0B57D0] dark:text-[#A8C7FA] font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sedang memotong latar belakang AI...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <DriveFilePickerModal
        open={drivePickerOpen}
        onClose={() => setDrivePickerOpen(false)}
        onSelectFiles={addFilesToQueue}
        acceptFilter="image"
      />

      <SaveDestinationModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        files={processedFilesForSave}
        defaultZipName="cutout_images.zip"
      />
    </div>
  )
}
