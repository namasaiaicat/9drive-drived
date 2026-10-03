import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  Cloud,
  Download,
  FileAudio,
  Loader2,
  Music,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { extractAudioFromVideo } from '@/lib/tools/audio-service'
import { VideoToAudioIcon } from '@/components/tools/ToolIcons'
import { ToolUploadHero } from '@/components/tools/ToolUploadHero'
import { DriveFilePickerModal } from '@/components/tools/DriveFilePickerModal'
import { SaveDestinationModal, type ProcessedFileItem } from '@/components/tools/SaveDestinationModal'
import { downloadBlob } from '@/lib/tools/zip-service'
import { formatBytes } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useToast } from '@/context/ToastContext'

export function VideoToolsView() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const [activeFile, setActiveFile] = useState<File | null>(null)
  const [processedResults, setProcessedResults] = useState<ProcessedFileItem[]>([])
  const [drivePickerOpen, setDrivePickerOpen] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progressMsg, setProgressMsg] = useState('Mengekstrak audio dari video...')

  // Audio Player State
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  // Preloaded files from route state
  useEffect(() => {
    if (location.state && (location.state as any).initialFiles) {
      const initFiles = (location.state as any).initialFiles as File[]
      if (initFiles.length > 0) {
        handleFileSelect(initFiles)
      }
    }
  }, [location.state])

  // Cleanup object url
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  const handleFileSelect = async (files: File[]) => {
    const validFiles = files.filter(
      (f) => f.type.startsWith('video/') || /\.(mp4|webm|mkv|mov|avi)$/i.test(f.name)
    )
    if (validFiles.length === 0) {
      toast.error('Pilih berkas video yang valid (MP4, WebM, MKV, MOV).')
      return
    }

    const firstFile = validFiles[0]
    setActiveFile(firstFile)
    setIsProcessing(true)
    setProgressMsg(`Mengonversi ${firstFile.name}...`)

    try {
      const results: ProcessedFileItem[] = []
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i]
        setProgressMsg(
          validFiles.length > 1
            ? `Memproses ${i + 1} dari ${validFiles.length} video (${file.name})...`
            : `Mengekstrak gelombang audio kualitas studio dari ${file.name}...`
        )
        const res = await extractAudioFromVideo(file)
        results.push({
          name: res.name,
          blob: res.blob,
          size: res.blob.size,
        })
      }

      setProcessedResults(results)
      if (results.length > 0) {
        const newUrl = URL.createObjectURL(results[0].blob)
        setAudioUrl(newUrl)
        setCurrentTime(0)
        setIsPlaying(false)
      }

      toast.success(`Berhasil mengekstrak audio dari ${results.length} video!`)
    } catch (err: any) {
      console.error('Video audio extraction failed:', err)
      toast.error(err.message || 'Gagal mengekstrak audio dari video')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReset = () => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setActiveFile(null)
    setProcessedResults([])
    setAudioUrl(null)
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const togglePlayPause = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00'
    const mins = Math.floor(secs / 60)
    const remSecs = Math.floor(secs % 60)
    return `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`
  }

  return (
    <div className="flex flex-col min-h-full w-full min-w-0">
      {/* Header Breadcrumb */}
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
            Ekstrak Audio Video
          </span>
        </div>

        {processedResults.length > 0 && (
          <div className="flex items-center gap-2 sm:shrink-0 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-9 px-4 text-xs font-medium rounded-full border-[#E0E3E7] dark:border-[#36373A] text-[#444746] dark:text-[#C4C7C5] hover:bg-[#F0F4F9] dark:hover:bg-[#28292A]"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Ekstrak Video Lain
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setSaveModalOpen(true)}
              className="h-9 px-4 text-xs font-medium rounded-full bg-[#0B57D0] hover:bg-[#0842A0] text-white shadow-xs"
            >
              <Cloud className="w-3.5 h-3.5 mr-1.5" />
              Simpan ke 9Drive
            </Button>
          </div>
        )}
      </div>

      {/* Hero Content Area */}
      <div className="w-full py-4 flex flex-col space-y-6">
        {/* STATE 1: IDLE HERO (Spacious & Clean M3 Dropzone) */}
        {!activeFile && !isProcessing && processedResults.length === 0 && (
          <ToolUploadHero
            title="Tarik & lepaskan video ke sini, atau pilih berkas"
            description="Otomatis mengekstrak audio studio (16-bit PCM WAV) dari rekaman video MP4, WebM, atau MOV Anda secara instan di browser."
            acceptedFormats={['MP4', 'MOV', 'WEBM', 'MKV']}
            accept="video/*,.mp4,.webm,.mkv,.mov"
            icon={VideoToAudioIcon}
            iconColor="#FA7B17"
            maxSizeText="Pemrosesan audio di browser"
            multiple={true}
            onFilesSelected={handleFileSelect}
            onOpenDrivePicker={() => setDrivePickerOpen(true)}
          />
        )}

        {/* STATE 2: AUTO-PROCESSING LOADER */}
        {isProcessing && (
          <div className="flex flex-col items-center justify-center p-12 sm:p-16 rounded-3xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] text-center space-y-5 animate-pulse">
            <div className="w-16 h-16 rounded-2xl bg-[#FEF7E0] dark:bg-[#7C4A00]/30 text-[#B06000] dark:text-[#FDD663] flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>

            <div className="space-y-1.5 max-w-md">
              <h3 className="text-base font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                {progressMsg}
              </h3>
              <p className="text-xs text-[#747775] dark:text-[#8E918F]">
                Mengambil suara dari video langsung di perangkat Anda tanpa diunggah ke internet.
              </p>
            </div>

            {/* Google M3 Linear Progress Bar */}
            <div className="w-full max-w-sm h-1.5 rounded-full bg-[#E0E3E7] dark:bg-[#36373A] overflow-hidden">
              <div className="h-full bg-[#0B57D0] rounded-full animate-[progress_1.5s_ease-in-out_infinite]" />
            </div>
          </div>
        )}

        {/* STATE 3: RESULT HERO (In-Place Interactive Audio Player & Actions) */}
        {!isProcessing && processedResults.length > 0 && (
          <div className="rounded-3xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] p-6 sm:p-8 space-y-6 shadow-xs">
            {/* Header Result */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E0E3E7]/60 dark:border-[#36373A]/60">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#FEF7E0] dark:bg-[#7C4A00]/30 text-[#B06000] dark:text-[#FDD663] flex items-center justify-center shrink-0">
                  <FileAudio className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-[#1F1F1F] dark:text-[#E3E3E3] truncate max-w-md">
                    {processedResults[0].name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[#747775] dark:text-[#8E918F] mt-0.5">
                    <span>{formatBytes(processedResults[0].size || 0)}</span>
                    <span>•</span>
                    <span className="text-[#0F9D58] dark:text-[#81C995] font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      16-bit Stereo PCM WAV
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => downloadBlob(processedResults[0].blob, processedResults[0].name)}
                  className="h-10 px-4 rounded-full text-xs font-medium border-[#E0E3E7] dark:border-[#36373A] hover:bg-[#F0F4F9] dark:hover:bg-[#28292A] text-[#1F1F1F] dark:text-[#E3E3E3]"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Unduh WAV
                </Button>

                <Button
                  type="button"
                  onClick={() => setSaveModalOpen(true)}
                  className="h-10 px-5 rounded-full text-xs font-medium bg-[#0B57D0] hover:bg-[#0842A0] text-white shadow-xs"
                >
                  <Cloud className="w-4 h-4 mr-1.5" />
                  Simpan ke 9Drive
                </Button>
              </div>
            </div>

            {/* Interactive Audio Player Component */}
            {audioUrl && (
              <div className="p-5 rounded-2xl bg-[#F8FAFD] dark:bg-[#28292A] border border-[#E0E3E7] dark:border-[#36373A] space-y-3">
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onTimeUpdate={() => {
                    if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
                  }}
                  onLoadedMetadata={() => {
                    if (audioRef.current) setDuration(audioRef.current.duration)
                  }}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />

                <div className="flex items-center gap-4">
                  {/* Play / Pause Toggle Button */}
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    className="w-12 h-12 rounded-full bg-[#0B57D0] hover:bg-[#0842A0] text-white flex items-center justify-center shrink-0 shadow-xs transition-transform active:scale-95"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>

                  {/* Scrubber & Duration */}
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      step={0.1}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-1.5 bg-[#E0E3E7] dark:bg-[#36373A] rounded-lg appearance-none cursor-pointer accent-[#0B57D0]"
                    />
                    <div className="flex justify-between text-[11px] text-[#747775] dark:text-[#8E918F] font-mono">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Mute Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.muted = !isMuted
                        setIsMuted(!isMuted)
                      }
                    }}
                    className="w-9 h-9 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-[#747775] dark:text-[#8E918F]"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Batch items list if more than 1 video was processed */}
            {processedResults.length > 1 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                  Semua Berkas Hasil Ekstraksi ({processedResults.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {processedResults.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20]"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileAudio className="w-4 h-4 text-[#0B57D0] shrink-0" />
                        <span className="text-xs text-[#1F1F1F] dark:text-[#E3E3E3] truncate">
                          {item.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadBlob(item.blob, item.name)}
                        className="text-xs text-[#0B57D0] hover:underline shrink-0 ml-2"
                      >
                        Unduh
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feature Information Cards (Material 3 Utilities) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="p-4 rounded-2xl border border-[#E0E3E7] bg-white dark:border-[#36373A] dark:bg-[#1E1F20]">
            <span className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3] flex items-center gap-1.5 mb-1">
              <Music className="w-4 h-4 text-[#FA7B17]" />
              Suara Jernih (.WAV)
            </span>
            <p className="text-xs text-[#747775] dark:text-[#8E918F] leading-relaxed">
              Hasil suara jernih dan utuh tanpa penurunan kualitas, siap diputar atau dipindahkan.
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-[#E0E3E7] bg-white dark:border-[#36373A] dark:bg-[#1E1F20]">
            <span className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3] flex items-center gap-1.5 mb-1">
              <Sparkles className="w-4 h-4 text-[#0B57D0] dark:text-[#A8C7FA]" />
              Privat & Tanpa Internet
            </span>
            <p className="text-xs text-[#747775] dark:text-[#8E918F] leading-relaxed">
              Video diproses langsung di perangkat Anda tanpa diunggah ke server mana pun.
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-[#E0E3E7] bg-white dark:border-[#36373A] dark:bg-[#1E1F20]">
            <span className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3] flex items-center gap-1.5 mb-1">
              <Cloud className="w-4 h-4 text-[#0F9D58]" />
              Integrasi Cloud 9Drive
            </span>
            <p className="text-xs text-[#747775] dark:text-[#8E918F] leading-relaxed">
              Simpan langsung ke folder cloud Drive atau unduh berkas .WAV ke perangkat lokal.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <DriveFilePickerModal
        open={drivePickerOpen}
        onClose={() => setDrivePickerOpen(false)}
        onSelectFiles={handleFileSelect}
        acceptFilter="video"
      />

      <SaveDestinationModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        files={processedResults}
        defaultZipName="extracted_audio.zip"
      />
    </div>
  )
}
