import { useState, useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ChevronRight,
  Download,
  Loader2,
  RotateCcw,
} from 'lucide-react'
import {
  compressPdf,
  imagesToPdf,
  mergePdfs,
  pdfToImages,
  rotatePdf,
  splitPdf,
  watermarkPdf,
} from '@/lib/tools/pdf-service'
import {
  MergePdfIcon,
  SplitPdfIcon,
  CompressPdfIcon,
  ImagesToPdfIcon,
  PdfToImagesIcon,
  RotatePdfIcon,
  WatermarkPdfIcon,
} from '@/components/tools/ToolIcons'
import { ToolUploadHero } from '@/components/tools/ToolUploadHero'
import { ToolProcessingCard } from '@/components/tools/ToolProcessingCard'
import { BatchFileQueue, type BatchItem } from '@/components/tools/BatchFileQueue'
import { DriveFilePickerModal } from '@/components/tools/DriveFilePickerModal'
import { SaveDestinationModal, type ProcessedFileItem } from '@/components/tools/SaveDestinationModal'
import { downloadBlob, bundleAndDownloadZip } from '@/lib/tools/zip-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/context/ToastContext'

type PdfSubTool = 'merge' | 'split' | 'compress' | 'images-to-pdf' | 'pdf-to-images' | 'rotate' | 'watermark'

export function PdfToolsView() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()

  const currentTool = (searchParams.get('mode') as PdfSubTool) || 'merge'
  const setTool = (mode: PdfSubTool) => {
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

  // Sensible Defaults & minimal inline tool options
  const [splitRanges, setSplitRanges] = useState('1-3, 4-5')
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL')
  const [rotationAngle, setRotationAngle] = useState(90)

  const compressLevel = 'medium' as const
  const imgOrientation = 'auto' as const
  const imgPageSize = 'a4' as const
  const imgMargin = 20
  const watermarkOpacity = 0.35
  const watermarkSize = 48
  const watermarkAngle = 45
  const watermarkColor = '#D32F2F'

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

    const nextQueue = [...queue, ...newItems]
    setQueue(nextQueue)

    // Auto-process for compress & pdf-to-images (TinyWow style)
    if (currentTool === 'compress' || currentTool === 'pdf-to-images') {
      setTimeout(() => executeWithQueue(nextQueue), 50)
    }
  }

  const executeWithQueue = async (itemsToProcess = queue) => {
    if (itemsToProcess.length === 0) return
    setIsProcessing(true)

    try {
      const results: ProcessedFileItem[] = []

      if (currentTool === 'merge') {
        const filesToMerge = itemsToProcess.map((q) => q.file)
        const mergedBlob = await mergePdfs(filesToMerge)
        results.push({
          name: '9drive_dokumen_gabungan.pdf',
          blob: mergedBlob,
          size: mergedBlob.size,
        })
        toast.success(`Berhasil menggabungkan ${filesToMerge.length} berkas PDF!`)
      } else if (currentTool === 'split') {
        for (const item of itemsToProcess) {
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
        for (const item of itemsToProcess) {
          const res = await compressPdf(item.file, compressLevel)
          const base = item.file.name.replace(/\.[^/.]+$/, '')
          results.push({
            name: `${base}_compressed.pdf`,
            blob: res.blob,
            size: res.compressedSize,
          })
        }
        toast.success(`Berhasil mengompres ${itemsToProcess.length} berkas PDF!`)
      } else if (currentTool === 'images-to-pdf') {
        const imageFiles = itemsToProcess.map((q) => q.file)
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
        for (const item of itemsToProcess) {
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
        toast.success(`Berhasil memutar ${itemsToProcess.length} berkas PDF!`)
      } else if (currentTool === 'watermark') {
        for (const item of itemsToProcess) {
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
        toast.success(`Berhasil memberi watermark pada ${itemsToProcess.length} berkas PDF!`)
      } else if (currentTool === 'pdf-to-images') {
        for (const item of itemsToProcess) {
          const imgs = await pdfToImages(item.file, { format: 'image/jpeg', scale: 1.5 })
          for (const img of imgs) {
            results.push({
              name: img.name,
              blob: img.blob,
              size: img.blob.size,
            })
          }
        }
        toast.success(`Berhasil mengekstrak ${results.length} gambar dari PDF!`)
      }

      setProcessedResults(results)
      if (results.length === 1) {
        downloadBlob(results[0].blob, results[0].name)
        toast.success(`Berkas ${results[0].name} berhasil dibuat & diunduh!`)
      } else if (results.length > 1) {
        bundleAndDownloadZip(results, `9drive_${currentTool}_hasil.zip`)
        toast.success(`${results.length} berkas berhasil dibuat & diunduh sebagai ZIP!`)
      }
      setSaveModalOpen(true)
    } catch (err: any) {
      console.error('PDF Operation failed:', err)
      toast.error(err.message || 'Operasi PDF gagal')
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
    { id: 'merge' as const, label: 'Merge PDF', icon: MergePdfIcon, desc: 'Satukan beberapa berkas PDF menjadi satu dokumen berurutan.' },
    { id: 'split' as const, label: 'Split PDF', icon: SplitPdfIcon, desc: 'Ekstrak rentang halaman tertentu atau pecah lembar dokumen PDF.' },
    { id: 'compress' as const, label: 'Compress PDF', icon: CompressPdfIcon, desc: 'Kecilkan ukuran file dokumen PDF secara instan tanpa merusak teks.' },
    { id: 'images-to-pdf' as const, label: 'JPG ke PDF', icon: ImagesToPdfIcon, desc: 'Gabungkan foto JPG, PNG, atau WebP menjadi satu dokumen PDF rapi.' },
    { id: 'pdf-to-images' as const, label: 'PDF ke Gambar', icon: PdfToImagesIcon, desc: 'Ekstrak setiap halaman dokumen PDF menjadi berkas foto resolusi tinggi.' },
    { id: 'rotate' as const, label: 'Rotate PDF', icon: RotatePdfIcon, desc: 'Putar orientasi lembar dokumen PDF yang terbalik (90°, 180°, 270°).' },
    { id: 'watermark' as const, label: 'Watermark PDF', icon: WatermarkPdfIcon, desc: 'Bubuhkan stempel tanda hak cipta atau teks khusus di lembar PDF.' },
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
              Pilih Berkas Lain
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
              className={`flex items-center gap-2 h-8 px-4 rounded-full text-xs font-medium whitespace-nowrap transition-all border select-none ${
                isActive
                  ? 'bg-[#C2E7FF] text-[#001D35] border-[#C2E7FF] dark:bg-[#004A77] dark:text-[#C2E7FF] dark:border-[#004A77]'
                  : 'bg-transparent text-[#444746] border-[#E0E3E7] hover:bg-[#F0F4F9] dark:text-[#C4C7C5] dark:border-[#36373A] dark:hover:bg-[#28292A]'
              }`}
            >
              <Icon size={20} />
              <span>{tool.label}</span>
            </button>
          )
        })}
      </div>

      {/* Main Content: Loading State OR Hero Dropzone OR Merge Focused View OR Active Grid */}
      {isProcessing ? (
        <ToolProcessingCard
          title={
            currentTool === 'compress'
              ? 'Sedang Mengecilkan Dokumen PDF...'
              : currentTool === 'pdf-to-images'
              ? 'Sedang Mengubah Lembar PDF ke Gambar...'
              : currentTool === 'merge'
              ? 'Sedang Menggabungkan Dokumen PDF...'
              : 'Sedang Memproses Dokumen PDF...'
          }
          message="Mohon tunggu sebentar, dokumen PDF Anda sedang diproses langsung di browser secara aman."
          icon={activeSubtoolObj?.icon}
          iconColor="#EA4335"
        />
      ) : queue.length === 0 ? (
        <div className="w-full py-4 flex flex-col space-y-6">
          <ToolUploadHero
            title={
              currentTool === 'images-to-pdf'
                ? 'Tarik & lepaskan gambar untuk dijadikan PDF'
                : 'Tarik & lepaskan dokumen PDF ke sini, atau pilih berkas'
            }
            description={activeSubtoolObj?.desc || 'Pengolahan berkas PDF aman dan cepat langsung di browser.'}
            acceptedFormats={currentTool === 'images-to-pdf' ? ['JPG', 'PNG', 'WEBP'] : ['PDF']}
            accept={currentTool === 'images-to-pdf' ? 'image/*,.png,.jpg,.jpeg,.webp' : '.pdf,application/pdf'}
            icon={activeSubtoolObj?.icon}
            iconColor="#EA4335"
            maxSizeText="Pemrosesan PDF di browser"
            multiple={currentTool === 'merge' || currentTool === 'images-to-pdf' || currentTool === 'compress'}
            onFilesSelected={addFilesToQueue}
            onOpenDrivePicker={() => setDrivePickerOpen(true)}
          />
        </div>
      ) : (
        /* Full-width workspace spanning natural canvas width */
        <div className="w-full flex-1 flex flex-col space-y-4 py-2">
          {/* Header info banner for Merge PDF */}
          {currentTool === 'merge' && (
            <div className="p-3.5 rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-[#F8FAFD] dark:bg-[#1E1F20]/50 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                  Susunan Urutan Berkas PDF ({queue.length} berkas)
                </p>
                <p className="text-[11px] text-[#747775] dark:text-[#8E918F]">
                  Gunakan tombol panah untuk mengatur urutan dokumen sebelum digabungkan menjadi satu PDF.
                </p>
              </div>
            </div>
          )}

          {/* Minimal inline options if Split PDF */}
          {currentTool === 'split' && (
            <div className="p-3.5 rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-medium text-[#1F1F1F] dark:text-[#E3E3E3] block">Rentang Halaman:</span>
                <span className="text-[11px] text-[#747775] dark:text-[#8E918F]">
                  Ketik nomor halaman atau rentang (contoh: 1-3, 5, atau 'all')
                </span>
              </div>
              <Input
                type="text"
                value={splitRanges}
                onChange={(e) => setSplitRanges(e.target.value)}
                placeholder="contoh: 1-3, 5, 7-10 atau 'all'"
                className="h-8 max-w-xs text-xs rounded-lg"
              />
            </div>
          )}

          {/* Minimal inline options if Rotate PDF */}
          {currentTool === 'rotate' && (
            <div className="p-3.5 rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">Sudut Rotasi:</span>
              <div className="flex gap-1.5">
                {[90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => setRotationAngle(deg)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg border transition-all ${
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

          {/* Minimal inline options if Watermark PDF */}
          {currentTool === 'watermark' && (
            <div className="p-3.5 rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">Teks Watermark:</span>
              <Input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="CONFIDENTIAL"
                className="h-8 max-w-xs text-xs rounded-lg"
              />
            </div>
          )}

          <BatchFileQueue
            items={queue}
            onAddFiles={addFilesToQueue}
            onRemoveItem={(id) => setQueue((prev) => prev.filter((q) => q.id !== id))}
            onReorder={(newOrder) => setQueue(newOrder)}
            onClear={handleReset}
            onOpenDrivePicker={() => setDrivePickerOpen(true)}
            accept={currentTool === 'images-to-pdf' ? 'image/*' : '.pdf,application/pdf'}
            allowReorder={currentTool === 'merge' || currentTool === 'images-to-pdf'}
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
                    <span>
                      {currentTool === 'images-to-pdf'
                        ? `Unduh PDF (${selectedIds.length})`
                        : currentTool === 'merge'
                        ? `Unduh PDF Gabungan (${selectedIds.length})`
                        : currentTool === 'compress'
                        ? `Unduh PDF Kompres (${selectedIds.length})`
                        : currentTool === 'pdf-to-images'
                        ? `Unduh Gambar (${selectedIds.length})`
                        : `Unduh Hasil (${selectedIds.length})`}
                    </span>
                  </>
                )}
              </Button>
            }
          />
        </div>
      )}

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
