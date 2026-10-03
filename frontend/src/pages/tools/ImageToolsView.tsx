import { useState, useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ChevronRight,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  RotateCcw,
  Stamp,
} from 'lucide-react'
import {
  compressImage,
  convertImageFormat,
  cropImage,
  resizeImage,
  watermarkImage,
} from '@/lib/tools/image-service'
import { Crop } from 'lucide-react'
import { ToolUploadHero } from '@/components/tools/ToolUploadHero'
import { ToolProcessingCard } from '@/components/tools/ToolProcessingCard'
import { BatchFileQueue, type BatchItem } from '@/components/tools/BatchFileQueue'
import { DriveFilePickerModal } from '@/components/tools/DriveFilePickerModal'
import { SaveDestinationModal, type ProcessedFileItem } from '@/components/tools/SaveDestinationModal'
import { downloadBlob, bundleAndDownloadZip } from '@/lib/tools/zip-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/context/ToastContext'

type ImageSubTool = 'compress' | 'convert' | 'resize' | 'crop' | 'watermark'

export function ImageToolsView() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()

  const currentTool = (searchParams.get('mode') as ImageSubTool) || 'compress'
  const setTool = (mode: ImageSubTool) => {
    setSearchParams({ mode })
    setQueue([])
    setSelectedIds([])
    setProcessedResults([])
  }

  const [queue, setQueue] = useState<BatchItem[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [processedResults, setProcessedResults] = useState<ProcessedFileItem[]>([])
  const [drivePickerOpen, setDrivePickerOpen] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Sync selectedIds with queue
  useEffect(() => {
    setSelectedIds(queue.map((q) => q.id))
  }, [queue.length])

  // Compress Settings
  const [compressQuality, setCompressQuality] = useState(0.8)

  // Convert Settings
  const [targetFormat, setTargetFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/webp')

  // Resize Settings
  const [scalePercent, setScalePercent] = useState<number>(50)
  const [customWidth, setCustomWidth] = useState<string>('')
  const [customHeight, setCustomHeight] = useState<string>('')
  const [maintainAspect, setMaintainAspect] = useState(true)

  // Crop Settings
  const [cropRatio, setCropRatio] = useState<'1:1' | '3:4' | '4:6' | '16:9'>('1:1')

  // Watermark Settings
  const [watermarkText, setWatermarkText] = useState('© 9Drive Studio')
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.4)
  const [watermarkSize, setWatermarkSize] = useState(36)
  const [watermarkColor, setWatermarkColor] = useState('#FFFFFF')
  const [watermarkPosition, setWatermarkPosition] = useState<'center' | 'bottom-right' | 'bottom-left'>('bottom-right')

  // Preloaded files
  useEffect(() => {
    if (location.state && (location.state as any).initialFiles) {
      const initFiles = (location.state as any).initialFiles as File[]
      addFilesToQueue(initFiles)
    }
  }, [location.state])

  const addFilesToQueue = (files: File[]) => {
    const validFiles = files.filter(
      (f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(f.name)
    )
    if (validFiles.length === 0) {
      toast.error('Pilih berkas gambar yang valid (JPG, PNG, WebP).')
      return
    }

    const newItems: BatchItem[] = validFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      status: 'idle',
      thumbnailUrl: URL.createObjectURL(file),
    }))

    const nextQueue = [...queue, ...newItems]
    setQueue(nextQueue)

    // Auto-process for compress & convert modes (TinyWow style)
    if (currentTool === 'compress' || currentTool === 'convert') {
      setTimeout(() => executeWithQueue(nextQueue), 50)
    }
  }

  const executeWithQueue = async (itemsToProcess = queue) => {
    if (itemsToProcess.length === 0) return
    setIsProcessing(true)

    try {
      const results: ProcessedFileItem[] = []

      if (currentTool === 'compress') {
        let totalOriginal = 0
        let totalCompressed = 0

        for (const item of itemsToProcess) {
          const res = await compressImage(item.file, compressQuality)
          totalOriginal += res.originalSize
          totalCompressed += res.compressedSize

          const base = item.file.name.replace(/\.[^/.]+$/, '')
          const ext = item.file.type === 'image/png' ? 'png' : 'jpg'
          results.push({
            name: `${base}_compressed.${ext}`,
            blob: res.blob,
            size: res.compressedSize,
          })
        }
        const savedPct = Math.round(((totalOriginal - totalCompressed) / totalOriginal) * 100)
        toast.success(`Berhasil mengompres ${itemsToProcess.length} foto! Hemat ${savedPct}% ukuran berkas.`)
      } else if (currentTool === 'convert') {
        for (const item of itemsToProcess) {
          const res = await convertImageFormat(item.file, targetFormat)
          results.push({
            name: res.name,
            blob: res.blob,
            size: res.blob.size,
          })
        }
        toast.success(`Berhasil mengonversi ${itemsToProcess.length} gambar!`)
      } else if (currentTool === 'resize') {
        for (const item of queue) {
          const resizedBlob = await resizeImage(item.file, {
            scalePercent: customWidth || customHeight ? undefined : scalePercent,
            width: customWidth ? Number(customWidth) : undefined,
            height: customHeight ? Number(customHeight) : undefined,
            maintainAspectRatio: maintainAspect,
          })
          const base = item.file.name.replace(/\.[^/.]+$/, '')
          results.push({
            name: `${base}_resized.png`,
            blob: resizedBlob,
            size: resizedBlob.size,
          })
        }
        toast.success(`Berhasil mengubah ukuran ${queue.length} gambar!`)
      } else if (currentTool === 'watermark') {
        for (const item of queue) {
          const watermarkedBlob = await watermarkImage(item.file, watermarkText, {
            opacity: watermarkOpacity,
            size: watermarkSize,
            colorHex: watermarkColor,
            position: watermarkPosition,
          })
          const base = item.file.name.replace(/\.[^/.]+$/, '')
          results.push({
            name: `${base}_watermarked.png`,
            blob: watermarkedBlob,
            size: watermarkedBlob.size,
          })
        }
        toast.success(`Berhasil memberi watermark pada ${queue.length} gambar!`)
      } else if (currentTool === 'crop') {
        for (const item of queue) {
          const img = new Image()
          const url = URL.createObjectURL(item.file)
          await new Promise((res) => { img.onload = res; img.src = url })
          URL.revokeObjectURL(url)

          let targetW = img.naturalWidth
          let targetH = img.naturalHeight

          if (cropRatio === '1:1') {
            const side = Math.min(img.naturalWidth, img.naturalHeight)
            targetW = side
            targetH = side
          } else if (cropRatio === '3:4') {
            if (img.naturalWidth / img.naturalHeight > 3 / 4) {
              targetH = img.naturalHeight
              targetW = Math.round(targetH * (3 / 4))
            } else {
              targetW = img.naturalWidth
              targetH = Math.round(targetW * (4 / 3))
            }
          } else if (cropRatio === '4:6') {
            if (img.naturalWidth / img.naturalHeight > 4 / 6) {
              targetH = img.naturalHeight
              targetW = Math.round(targetH * (4 / 6))
            } else {
              targetW = img.naturalWidth
              targetH = Math.round(targetW * (6 / 4))
            }
          } else if (cropRatio === '16:9') {
            if (img.naturalWidth / img.naturalHeight > 16 / 9) {
              targetH = img.naturalHeight
              targetW = Math.round(targetH * (16 / 9))
            } else {
              targetW = img.naturalWidth
              targetH = Math.round(targetW * (9 / 16))
            }
          }

          const cropX = Math.round((img.naturalWidth - targetW) / 2)
          const cropY = Math.round((img.naturalHeight - targetH) / 2)

          const res = await cropImage(item.file, { x: cropX, y: cropY, width: targetW, height: targetH })
          results.push({
            name: res.name,
            blob: res.blob,
            size: res.blob.size,
          })
        }
        toast.success(`Berhasil memotong ${queue.length} foto!`)
      }

      setProcessedResults(results)
      if (results.length === 1) {
        downloadBlob(results[0].blob, results[0].name)
        toast.success(`Berkas ${results[0].name} berhasil diunduh!`)
      } else if (results.length > 1) {
        bundleAndDownloadZip(results, `9drive_${currentTool}_hasil.zip`)
        toast.success(`${results.length} berkas berhasil diunduh sebagai ZIP!`)
      }
      setSaveModalOpen(true)
    } catch (err: any) {
      console.error('Image Operation failed:', err)
      toast.error(err.message || 'Pemrosesan gambar gagal')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownloadSelected = () => {
    const selectedQueue = queue.filter((q) => selectedIds.includes(q.id))
    if (selectedQueue.length === 0) {
      toast.error('Pilih minimal 1 berkas untuk diunduh.')
      return
    }
    executeWithQueue(selectedQueue)
  }

  const handleReset = () => {
    setQueue([])
    setSelectedIds([])
    setProcessedResults([])
  }

  const subtools = [
    { id: 'compress' as const, label: 'Kompres Gambar', icon: Minimize2, desc: 'Kecilkan ukuran foto JPG, PNG, dan WebP secara instan tanpa mengurangi kejernihan visual.' },
    { id: 'convert' as const, label: 'Konversi Format', icon: RefreshCw, desc: 'Ubah format gambar antara WebP, PNG, dan JPG untuk kebutuhan web atau cetak.' },
    { id: 'resize' as const, label: 'Ubah Ukuran', icon: Maximize2, desc: 'Sesuaikan dimensi pixel atau persentase skala foto dengan rasio aspek tetap terkunci.' },
    { id: 'crop' as const, label: 'Potong / Crop', icon: Crop, desc: 'Potong foto dengan preset rasio pas foto resmi (3:4, 4:6), 1:1, atau rasio bebas.' },
    { id: 'watermark' as const, label: 'Watermark Foto', icon: Stamp, desc: 'Tambahkan cap teks hak cipta pada gambar di posisi tengah ataupun sudut berkas.' },
  ]

  const activeSubtoolObj = subtools.find((t) => t.id === currentTool)

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
            {activeSubtoolObj?.label}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:shrink-0 sm:justify-end">
          {queue.length > 0 && (
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
          )}

          {processedResults.length > 0 && (
            <Button
              type="button"
              size="sm"
              onClick={() => setSaveModalOpen(true)}
              className="h-9 px-4 text-xs font-medium rounded-full bg-[#0F9D58] hover:bg-[#0F9D58]/90 text-white"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Simpan Hasil ({processedResults.length})
            </Button>
          )}
        </div>
      </div>

      {/* Subtools Selector Pills (Material 3 Chip format) */}
      <div className="flex items-center gap-2 py-4 overflow-x-auto">
        {subtools.map((tool) => {
          const Icon = tool.icon
          const isActive = currentTool === tool.id
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => setTool(tool.id)}
              className={`flex items-center gap-2 h-8 px-4 rounded-full text-xs font-medium whitespace-nowrap transition-all border select-none ${
                isActive
                  ? 'bg-[#C2E7FF] text-[#001D35] border-[#C2E7FF] dark:bg-[#004A77] dark:text-[#C2E7FF] dark:border-[#004A77]'
                  : 'bg-transparent text-[#444746] border-[#E0E3E7] hover:bg-[#F0F4F9] dark:text-[#C4C7C5] dark:border-[#36373A] dark:hover:bg-[#28292A]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tool.label}</span>
            </button>
          )
        })}
      </div>

      {/* Main Content: Loading State OR Hero Dropzone OR Active Grid */}
      {isProcessing ? (
        <ToolProcessingCard
          title={
            currentTool === 'compress'
              ? 'Sedang Mengecilkan Ukuran Foto...'
              : currentTool === 'convert'
              ? 'Sedang Mengubah Format Gambar...'
              : currentTool === 'resize'
              ? 'Sedang Mengubah Ukuran Gambar...'
              : currentTool === 'crop'
              ? 'Sedang Memotong Foto...'
              : 'Sedang Memproses Foto...'
          }
          message="Mohon tunggu sebentar, foto Anda sedang diproses langsung di browser secara aman."
          icon={activeSubtoolObj?.icon}
          iconColor="#7248B9"
        />
      ) : queue.length === 0 ? (
        <div className="w-full py-4 flex flex-col space-y-6">
          <ToolUploadHero
            title={
              currentTool === 'crop'
                ? 'Pilih foto untuk dipotong atau pas foto'
                : 'Tarik & lepaskan foto ke sini, atau pilih berkas'
            }
            description={activeSubtoolObj?.desc || 'Proses gambar Anda secara otomatis dan instan di browser.'}
            acceptedFormats={['JPG', 'PNG', 'WEBP']}
            accept="image/*,.png,.jpg,.jpeg,.webp"
            icon={activeSubtoolObj?.icon}
            iconColor="#7248B9"
            maxSizeText="Pemrosesan gambar di browser"
            multiple={currentTool !== 'crop'}
            onFilesSelected={addFilesToQueue}
            onOpenDrivePicker={() => setDrivePickerOpen(true)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
          {/* Left Column: File Queue */}
          <div className="lg:col-span-8 flex flex-col space-y-4">
            <BatchFileQueue
              items={queue}
              onAddFiles={addFilesToQueue}
              onRemoveItem={(id) => setQueue((prev) => prev.filter((q) => q.id !== id))}
              onClear={handleReset}
              onOpenDrivePicker={() => setDrivePickerOpen(true)}
              accept="image/*"
              disabled={isProcessing}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              primaryAction={
                <Button
                  type="button"
                  size="sm"
                  onClick={handleDownloadSelected}
                  disabled={isProcessing || selectedIds.length === 0}
                  className="h-8 px-4 text-xs font-medium rounded-full bg-[#0B57D0] hover:bg-[#0B57D0]/90 text-white shadow-xs flex items-center gap-1.5 shrink-0"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Hasil ({selectedIds.length})</span>
                    </>
                  )}
                </Button>
              }
            />
          </div>

        {/* Right Column: Settings Panel */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          <div className="p-4 rounded-2xl border border-[#E0E3E7] bg-white dark:border-[#36373A] dark:bg-[#1E1F20] space-y-3.5">
            <span className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3] block">
              Pengaturan {activeSubtoolObj?.label}
            </span>

            {/* Compress Settings */}
            {currentTool === 'compress' && (
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs text-[#747775] dark:text-[#8E918F]">
                  <span>Kualitas Visual:</span>
                  <span className="font-semibold text-[#1F1F1F] dark:text-[#E3E3E3]">
                    {Math.round(compressQuality * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="0.95"
                  step="0.05"
                  value={compressQuality}
                  onChange={(e) => setCompressQuality(Number(e.target.value))}
                  className="w-full accent-[#0B57D0]"
                />
                <div className="flex justify-between text-[11px] text-[#747775]">
                  <span>Kompresi Maksimal</span>
                  <span>Kualitas Tinggi</span>
                </div>
              </div>
            )}

            {/* Convert Format Settings */}
            {currentTool === 'convert' && (
              <div className="space-y-2.5">
                <label className="text-xs text-[#747775] dark:text-[#8E918F] block">
                  Format Berkas Tujuan:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: 'WebP', value: 'image/webp' as const },
                    { label: 'PNG', value: 'image/png' as const },
                    { label: 'JPG', value: 'image/jpeg' as const },
                  ].map((fmt) => (
                    <button
                      key={fmt.value}
                      type="button"
                      onClick={() => setTargetFormat(fmt.value)}
                      className={`py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        targetFormat === fmt.value
                          ? 'border-[#0B57D0] bg-[#C2E7FF] text-[#001D35] dark:border-[#004A77] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                          : 'border-[#E0E3E7] dark:border-[#36373A] text-[#444746] dark:text-[#C4C7C5] hover:bg-[#F0F4F9]'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[#747775] leading-relaxed">
                  WebP menghasilkan ukuran paling hemat untuk web. PNG mempertahankan transparansi.
                </p>
              </div>
            )}

            {/* Resize Settings */}
            {currentTool === 'resize' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[#747775] dark:text-[#8E918F] mb-1.5 block">
                    Skala Persentase:
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          setScalePercent(pct)
                          setCustomWidth('')
                          setCustomHeight('')
                        }}
                        className={`py-1.5 text-xs font-medium rounded-lg border transition-all ${
                          scalePercent === pct && !customWidth && !customHeight
                            ? 'border-[#0B57D0] bg-[#C2E7FF] text-[#001D35] dark:border-[#004A77] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                            : 'border-[#E0E3E7] dark:border-[#36373A] text-[#444746] dark:text-[#C4C7C5] hover:bg-[#F0F4F9]'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E0E3E7]/60 dark:border-[#36373A]/60">
                  <label className="text-xs text-[#747775] dark:text-[#8E918F] mb-1.5 block">
                    Atau Ukuran Pixel Pasti:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Lebar (px)"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      type="number"
                      placeholder="Tinggi (px)"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <label className="flex items-center gap-2 mt-2 text-xs text-[#444746] dark:text-[#C4C7C5] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={maintainAspect}
                      onChange={(e) => setMaintainAspect(e.target.checked)}
                      className="rounded accent-[#0B57D0]"
                    />
                    <span>Kunci Rasio Aspek</span>
                  </label>
                </div>
              </div>
            )}

            {/* Crop Settings */}
            {currentTool === 'crop' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[#747775] dark:text-[#8E918F] mb-1.5 block">
                    Preset Rasio Potong:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: '1:1' as const, label: '1:1 (Persegi / Avatar)' },
                      { id: '3:4' as const, label: '3:4 (Pas Foto 3x4)' },
                      { id: '4:6' as const, label: '4:6 (Pas Foto 4x6)' },
                      { id: '16:9' as const, label: '16:9 (Landscape / Banner)' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCropRatio(item.id)}
                        className={`p-2 text-xs font-medium rounded-xl border text-left transition-all ${
                          cropRatio === item.id
                            ? 'border-[#0B57D0] bg-[#C2E7FF] text-[#001D35] dark:border-[#004A77] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                            : 'border-[#E0E3E7] dark:border-[#36373A] text-[#444746] dark:text-[#C4C7C5] hover:bg-[#F0F4F9]'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-[#747775] dark:text-[#8E918F] leading-relaxed">
                  Memotong bagian tengah foto dengan rasio aspek yang dipilih secara proporsional.
                </p>
              </div>
            )}

            {/* Watermark Settings */}
            {currentTool === 'watermark' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[#747775] dark:text-[#8E918F] mb-1 block">
                    Teks Watermark:
                  </label>
                  <Input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-[#747775] dark:text-[#8E918F] mb-1 block">
                      Ukuran (px):
                    </label>
                    <Input
                      type="number"
                      value={watermarkSize}
                      onChange={(e) => setWatermarkSize(Number(e.target.value) || 24)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-[#747775] dark:text-[#8E918F] mb-1">
                      Warna:
                    </label>
                    <div className="flex items-center gap-2 mt-0.5">
                      <input
                        type="color"
                        value={watermarkColor}
                        onChange={(e) => setWatermarkColor(e.target.value)}
                        className="w-7 h-7 rounded-md cursor-pointer border border-[#E0E3E7] p-0.5"
                      />
                      <span className="text-xs font-mono text-[#747775]">{watermarkColor.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#747775] dark:text-[#8E918F] mb-1 block">
                    Posisi:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'bottom-right' as const, label: 'Kanan Bawah' },
                      { id: 'center' as const, label: 'Tengah' },
                      { id: 'bottom-left' as const, label: 'Kiri Bawah' },
                    ].map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => setWatermarkPosition(pos.id)}
                        className={`py-1.5 text-[11px] font-medium rounded-lg border transition-all ${
                          watermarkPosition === pos.id
                            ? 'border-[#0B57D0] bg-[#C2E7FF] text-[#001D35] dark:border-[#004A77] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                            : 'border-[#E0E3E7] dark:border-[#36373A] text-[#444746] dark:text-[#C4C7C5] hover:bg-[#F0F4F9]'
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#747775] dark:text-[#8E918F] mb-1 block">
                    Transparansi: {Math.round(watermarkOpacity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                    className="w-full accent-[#0B57D0]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

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
        files={processedResults}
        defaultZipName={`9drive_${currentTool}_hasil.zip`}
        toolName={`Image Studio (${activeSubtoolObj?.label})`}
      />
    </div>
  )
}
