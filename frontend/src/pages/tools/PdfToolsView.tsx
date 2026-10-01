import { useState, useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ChevronRight,
  Download,
  Loader2,
  Play,
} from 'lucide-react'
import {
  compressPdf,
  imagesToPdf,
  mergePdfs,
  rotatePdf,
  splitPdf,
  watermarkPdf,
} from '@/lib/tools/pdf-service'
import {
  MergePdfIcon,
  SplitPdfIcon,
  CompressPdfIcon,
  ImagesToPdfIcon,
  RotatePdfIcon,
  WatermarkPdfIcon,
} from '@/components/tools/ToolIcons'
import { BatchFileQueue, type BatchItem } from '@/components/tools/BatchFileQueue'
import { DriveFilePickerModal } from '@/components/tools/DriveFilePickerModal'
import { SaveDestinationModal, type ProcessedFileItem } from '@/components/tools/SaveDestinationModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/context/ToastContext'

type PdfSubTool = 'merge' | 'split' | 'compress' | 'images-to-pdf' | 'rotate' | 'watermark'

export function PdfToolsView() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()

  const currentTool = (searchParams.get('mode') as PdfSubTool) || 'merge'
  const setTool = (mode: PdfSubTool) => {
    setSearchParams({ mode })
    setQueue([])
    setProcessedResults([])
  }

  const [queue, setQueue] = useState<BatchItem[]>([])
  const [processedResults, setProcessedResults] = useState<ProcessedFileItem[]>([])
  const [drivePickerOpen, setDrivePickerOpen] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Options
  const [splitRanges, setSplitRanges] = useState('1-3, 4-5')
  const [compressLevel, setCompressLevel] = useState<'low' | 'medium' | 'high'>('medium')
  const [imgOrientation, setImgOrientation] = useState<'portrait' | 'landscape' | 'auto'>('auto')
  const [imgPageSize, setImgPageSize] = useState<'fit' | 'a4' | 'letter'>('a4')
  const [imgMargin, setImgMargin] = useState(20)
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL')
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.35)
  const [watermarkSize, setWatermarkSize] = useState(48)
  const [watermarkAngle, setWatermarkAngle] = useState(45)
  const [watermarkColor, setWatermarkColor] = useState('#D32F2F')
  const [rotationAngle, setRotationAngle] = useState(90)

  // Handle files preloaded from state (e.g. from Context Menu)
  useEffect(() => {
    if (location.state && (location.state as any).initialFiles) {
      const initFiles = (location.state as any).initialFiles as File[]
      addFilesToQueue(initFiles)
    }
  }, [location.state])

  const addFilesToQueue = (files: File[]) => {
    const validFiles = currentTool === 'images-to-pdf'
      ? files.filter((f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(f.name))
      : files.filter((f) => f.type.includes('pdf') || f.name.toLowerCase().endsWith('.pdf'))

    if (validFiles.length === 0) {
      toast.error(currentTool === 'images-to-pdf' ? 'Pilih berkas gambar (JPG, PNG, WebP).' : 'Pilih berkas PDF.')
      return
    }

    const newItems: BatchItem[] = validFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      status: 'idle',
      thumbnailUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }))

    setQueue((prev) => [...prev, ...newItems])
  }

  const handleExecute = async () => {
    if (queue.length === 0) return
    setIsProcessing(true)

    try {
      const results: ProcessedFileItem[] = []

      if (currentTool === 'merge') {
        const filesToMerge = queue.map((q) => q.file)
        const mergedBlob = await mergePdfs(filesToMerge)
        results.push({
          name: '9drive_dokumen_gabungan.pdf',
          blob: mergedBlob,
          size: mergedBlob.size,
        })
        toast.success(`Berhasil menggabungkan ${filesToMerge.length} berkas PDF!`)
      } else if (currentTool === 'split') {
        for (const item of queue) {
          const splitParts = await splitPdf(item.file, splitRanges)
          for (const part of splitParts) {
            results.push({
              name: part.name,
              blob: part.blob,
              size: part.blob.size,
            })
          }
        }
        toast.success(`Berhasil memisahkan ${results.length} dokumen PDF!`)
      } else if (currentTool === 'compress') {
        for (const item of queue) {
          const res = await compressPdf(item.file, compressLevel)
          const base = item.file.name.replace(/\.[^/.]+$/, '')
          results.push({
            name: `${base}_compressed.pdf`,
            blob: res.blob,
            size: res.compressedSize,
          })
        }
        toast.success(`Berhasil mengompres ${queue.length} berkas PDF!`)
      } else if (currentTool === 'images-to-pdf') {
        const imageFiles = queue.map((q) => q.file)
        const pdfBlob = await imagesToPdf(imageFiles, {
          orientation: imgOrientation,
          pageSize: imgPageSize,
          margin: imgMargin,
        })
        results.push({
          name: '9drive_album_gambar.pdf',
          blob: pdfBlob,
          size: pdfBlob.size,
        })
        toast.success(`Berhasil menyatukan ${imageFiles.length} foto ke 1 PDF!`)
      } else if (currentTool === 'rotate') {
        for (const item of queue) {
          const rotations: Record<number, number> = {}
          for (let p = 0; p < 200; p++) rotations[p] = rotationAngle
          const rotatedBlob = await rotatePdf(item.file, rotations)
          const base = item.file.name.replace(/\.[^/.]+$/, '')
          results.push({
            name: `${base}_rotated_${rotationAngle}deg.pdf`,
            blob: rotatedBlob,
            size: rotatedBlob.size,
          })
        }
        toast.success(`Berhasil memutar ${queue.length} berkas PDF!`)
      } else if (currentTool === 'watermark') {
        for (const item of queue) {
          const watermarkedBlob = await watermarkPdf(item.file, watermarkText, {
            opacity: watermarkOpacity,
            size: watermarkSize,
            colorHex: watermarkColor,
            angle: watermarkAngle,
          })
          const base = item.file.name.replace(/\.[^/.]+$/, '')
          results.push({
            name: `${base}_watermarked.pdf`,
            blob: watermarkedBlob,
            size: watermarkedBlob.size,
          })
        }
        toast.success(`Berhasil memberi watermark pada ${queue.length} berkas PDF!`)
      }

      setProcessedResults(results)
      setSaveModalOpen(true)
    } catch (err: any) {
      console.error('PDF Operation failed:', err)
      toast.error(err.message || 'Operasi PDF gagal')
    } finally {
      setIsProcessing(false)
    }
  }

  const subtools = [
    { id: 'merge' as const, label: 'Merge PDF', icon: MergePdfIcon },
    { id: 'split' as const, label: 'Split PDF', icon: SplitPdfIcon },
    { id: 'compress' as const, label: 'Compress PDF', icon: CompressPdfIcon },
    { id: 'images-to-pdf' as const, label: 'JPG ke PDF', icon: ImagesToPdfIcon },
    { id: 'rotate' as const, label: 'Rotate PDF', icon: RotatePdfIcon },
    { id: 'watermark' as const, label: 'Watermark PDF', icon: WatermarkPdfIcon },
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

          <Button
            type="button"
            size="sm"
            onClick={handleExecute}
            disabled={queue.length === 0 || isProcessing}
            className="h-9 px-5 text-xs font-medium rounded-full bg-[#0B57D0] hover:bg-[#0B57D0]/90 text-white shadow-xs"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                Memproses...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Jalankan {activeSubtoolObj?.label}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Subtools Selector Pills (iLovePDF Style Chip format) */}
      <div className="flex items-center gap-2 py-4 overflow-x-auto">
        {subtools.map((tool) => {
          const Icon = tool.icon
          const isActive = currentTool === tool.id
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => setTool(tool.id)}
              className={`flex items-center gap-2 h-9 px-4 rounded-full text-xs font-semibold whitespace-nowrap transition-all border select-none ${
                isActive
                  ? 'bg-[#E5322D] text-white border-[#E5322D] shadow-sm'
                  : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-[#F3F4F6] dark:bg-[#1F2937] dark:text-[#D1D5DB] dark:border-[#374151] dark:hover:bg-[#374151]'
              }`}
            >
              <Icon size={20} />
              <span>{tool.label}</span>
            </button>
          )
        })}
      </div>

      {/* Main Grid: Queue & Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        {/* Left Column: File Queue */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <BatchFileQueue
            items={queue}
            onAddFiles={addFilesToQueue}
            onRemoveItem={(id) => setQueue((prev) => prev.filter((q) => q.id !== id))}
            onReorder={(newOrder) => setQueue(newOrder)}
            onClear={() => setQueue([])}
            onOpenDrivePicker={() => setDrivePickerOpen(true)}
            accept={currentTool === 'images-to-pdf' ? 'image/*' : '.pdf,application/pdf'}
            allowReorder={currentTool === 'merge' || currentTool === 'images-to-pdf'}
            disabled={isProcessing}
          />
        </div>

        {/* Right Column: Settings Panel */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          <div className="p-4 rounded-2xl border border-[#E0E3E7] bg-white dark:border-[#36373A] dark:bg-[#1E1F20] space-y-3.5">
            <span className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3] block">
              Pengaturan {activeSubtoolObj?.label}
            </span>

            {/* Split Settings */}
            {currentTool === 'split' && (
              <div className="space-y-2.5">
                <label className="text-xs text-[#747775] dark:text-[#8E918F] block">
                  Rentang Halaman:
                </label>
                <Input
                  type="text"
                  value={splitRanges}
                  onChange={(e) => setSplitRanges(e.target.value)}
                  placeholder="contoh: 1-3, 5, 7-10 atau 'all'"
                  className="h-8 text-xs rounded-lg"
                />
                <p className="text-[11px] text-[#747775] dark:text-[#8E918F]">
                  Ketik nomor halaman atau rentang (pisahkan koma), atau ketik <b>all</b> untuk mengekstrak setiap halaman.
                </p>
              </div>
            )}

            {/* Images to PDF Settings */}
            {currentTool === 'images-to-pdf' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[#747775] dark:text-[#8E918F] mb-1.5 block">
                    Ukuran Kertas:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['a4', 'letter', 'fit'] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setImgPageSize(size)}
                        className={`py-1.5 text-xs font-medium rounded-lg border uppercase transition-all ${
                          imgPageSize === size
                            ? 'border-[#0B57D0] bg-[#C2E7FF] text-[#001D35] dark:border-[#004A77] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                            : 'border-[#E0E3E7] dark:border-[#36373A] text-[#444746] dark:text-[#C4C7C5] hover:bg-[#F0F4F9]'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#747775] dark:text-[#8E918F] mb-1.5 block">
                    Orientasi:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['auto', 'portrait', 'landscape'] as const).map((ori) => (
                      <button
                        key={ori}
                        type="button"
                        onClick={() => setImgOrientation(ori)}
                        className={`py-1.5 text-xs font-medium rounded-lg border capitalize transition-all ${
                          imgOrientation === ori
                            ? 'border-[#0B57D0] bg-[#C2E7FF] text-[#001D35] dark:border-[#004A77] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                            : 'border-[#E0E3E7] dark:border-[#36373A] text-[#444746] dark:text-[#C4C7C5] hover:bg-[#F0F4F9]'
                        }`}
                      >
                        {ori}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#747775] dark:text-[#8E918F] mb-1 block">
                    Margin: {imgMargin}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="5"
                    value={imgMargin}
                    onChange={(e) => setImgMargin(Number(e.target.value))}
                    className="w-full accent-[#0B57D0]"
                  />
                </div>
              </div>
            )}

            {/* Rotate Settings */}
            {currentTool === 'rotate' && (
              <div className="space-y-2">
                <label className="text-xs text-[#747775] dark:text-[#8E918F] block">
                  Sudut Rotasi:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[90, 180, 270].map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => setRotationAngle(deg)}
                      className={`py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        rotationAngle === deg
                          ? 'border-[#0B57D0] bg-[#C2E7FF] text-[#001D35] dark:border-[#004A77] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                          : 'border-[#E0E3E7] dark:border-[#36373A] text-[#444746] dark:text-[#C4C7C5] hover:bg-[#F0F4F9]'
                      }`}
                    >
                      +{deg}°
                    </button>
                  ))}
                </div>
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
                    className="h-8 text-xs rounded-lg"
                    placeholder="CONFIDENTIAL"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-[#747775] dark:text-[#8E918F] mb-1 block">
                      Ukuran Font:
                    </label>
                    <Input
                      type="number"
                      value={watermarkSize}
                      onChange={(e) => setWatermarkSize(Number(e.target.value) || 36)}
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#747775] dark:text-[#8E918F] mb-1 block">
                      Sudut (°):
                    </label>
                    <Input
                      type="number"
                      value={watermarkAngle}
                      onChange={(e) => setWatermarkAngle(Number(e.target.value) || 0)}
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs text-[#747775] dark:text-[#8E918F]">
                    Warna:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={watermarkColor}
                      onChange={(e) => setWatermarkColor(e.target.value)}
                      className="w-7 h-7 rounded-md cursor-pointer border border-[#E0E3E7] p-0.5"
                    />
                    <span className="text-xs font-mono text-[#747775]">{watermarkColor.toUpperCase()}</span>
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

            {/* Merge instructions */}
            {currentTool === 'merge' && (
              <p className="text-xs text-[#747775] dark:text-[#8E918F] leading-relaxed">
                Tambahkan 2 atau lebih dokumen PDF. Gunakan tombol panah pada daftar antrean untuk mengubah urutan penggabungan.
              </p>
            )}

            {/* Compress Settings */}
            {currentTool === 'compress' && (
              <div className="space-y-2.5">
                <label className="text-xs text-[#747775] dark:text-[#8E918F] block">
                  Tingkat Kompresi:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['low', 'medium', 'high'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setCompressLevel(lvl)}
                      className={`py-1.5 text-xs font-medium rounded-lg border capitalize transition-all ${
                        compressLevel === lvl
                          ? 'border-[#0B57D0] bg-[#C2E7FF] text-[#001D35] dark:border-[#004A77] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                          : 'border-[#E0E3E7] dark:border-[#36373A] text-[#444746] dark:text-[#C4C7C5] hover:bg-[#F0F4F9]'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#747775] dark:text-[#8E918F] leading-relaxed">
                  Mengoptimalkan struktur stream PDF dan gambar di dalamnya tanpa mengaburkan teks.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <DriveFilePickerModal
        open={drivePickerOpen}
        onClose={() => setDrivePickerOpen(false)}
        onSelectFiles={addFilesToQueue}
        acceptFilter={currentTool === 'images-to-pdf' ? 'image' : 'pdf'}
        multiple
      />

      <SaveDestinationModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        files={processedResults}
        defaultZipName={`9drive_${currentTool}_hasil.zip`}
        toolName={`PDF Studio (${activeSubtoolObj?.label})`}
      />
    </div>
  )
}
