import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download, ExternalLink, FileArchive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FileIcon } from '@/components/drive/FileIcon'
import { API_URL, apiFetch, formatBytes, formatDate } from '@/lib/api'
import { createPlyr, ensurePlyr } from '@/lib/plyr'
import { getPreviewKind, officeViewerUrl } from '@/lib/preview'

type PublicFile = {
  name: string
  mimeType: string
  sizeBytes: string
  createdAt: string
}

function mimeToKind(mimeType: string): 'doc' | 'image' | 'video' | 'pdf' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.includes('pdf')) return 'pdf'
  return 'doc'
}

function UnsupportedPreview({ file, downloadUrl }: { file: PublicFile; downloadUrl: string }) {
  return (
    <div className="flex h-full min-h-[360px] flex-col items-center justify-center px-6 text-center text-[#C4C7C5]">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#1E1F20] text-[#E3E3E3] border border-[#36373A]">
        <FileArchive className="h-9 w-9 stroke-[1.5]" />
      </div>
      <h2 className="mt-5 text-lg font-medium text-white">Preview not available</h2>
      <p className="mt-1.5 max-w-sm text-xs text-[#8E918F]">
        {file.name} cannot be previewed in the browser. Download the file to open it locally.
      </p>
      <a href={downloadUrl} download className="mt-6">
        <Button className="rounded-full px-5">
          <Download className="h-4 w-4" />
          Download
        </Button>
      </a>
    </div>
  )
}

export function PublicFilePage({ embed = false }: { embed?: boolean }) {
  const { token } = useParams()
  const [file, setFile] = useState<PublicFile | null>(null)
  const [failed, setFailed] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const previewUrl = `${API_URL}/public/files/${token}/preview`
  const downloadUrl = `${API_URL}/public/files/${token}/download`
  const kind = getPreviewKind(file?.mimeType)

  useEffect(() => {
    setFailed(false)
    apiFetch<{ file: PublicFile }>(`/public/files/${token}`, { skipAuth: true })
      .then((data) => setFile(data.file))
      .catch(() => {
        setFile(null)
        setFailed(true)
      })
  }, [token])

  useEffect(() => {
    document.title = file ? `${file.name} - Google Drive` : 'Google Drive'
    return () => {
      document.title = 'Google Drive - 9Drive'
    }
  }, [file])

  useEffect(() => {
    if (kind !== 'video' || !videoRef.current) return undefined
    let disposed = false
    let player: { destroy: () => void } | null = null

    ensurePlyr().then(() => {
      if (disposed || !videoRef.current) return
      player = createPlyr(videoRef.current)
    }).catch(() => undefined)

    return () => {
      disposed = true
      player?.destroy()
    }
  }, [kind, previewUrl])

  if (failed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#131314] p-6 text-white">
        <div className="max-w-md rounded-2xl border border-[#36373A] bg-[#1E1F20] p-8 text-center shadow-lg">
          <FileArchive className="mx-auto h-12 w-12 text-[#8E918F] stroke-[1.5]" />
          <h1 className="mt-4 text-xl font-normal text-[#E3E3E3]">Shared file not found</h1>
          <p className="mt-1.5 text-xs text-[#8E918F]">The link may be expired, revoked, or the file was deleted.</p>
        </div>
      </main>
    )
  }

  if (!file) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#131314] text-xs text-[#8E918F]">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#A8C7FA] border-t-transparent" />
          <span>Loading shared file...</span>
        </div>
      </main>
    )
  }

  const preview = (
    <div className="flex h-full w-full items-center justify-center">
      {kind === 'image' ? (
        <img
          src={previewUrl}
          alt={file.name}
          className="max-h-full max-w-full object-contain"
        />
      ) : null}
      {kind === 'video' ? (
        <div className="shared-video-shell w-full max-w-4xl max-h-full flex items-center justify-center">
          <video ref={videoRef} controls playsInline preload="metadata">
            <source src={previewUrl} type={file.mimeType} />
          </video>
        </div>
      ) : null}
      {kind === 'document' ? (
        <iframe src={previewUrl} title={file.name} className="h-full w-full border-0 bg-white" />
      ) : null}
      {kind === 'office' ? (
        <iframe src={officeViewerUrl(previewUrl)} title={file.name} className="h-full w-full border-0 bg-white" />
      ) : null}
      {!kind ? <UnsupportedPreview file={file} downloadUrl={downloadUrl} /> : null}
    </div>
  )

  if (embed) {
    return <main className="h-screen overflow-hidden bg-black text-white">{preview}</main>
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#131314] text-white flex flex-col">
      {/* Google Drive Previewer Top Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#36373A] bg-[#1E1F20] px-4 sm:px-6 z-20">
        <div className="flex min-w-0 items-center gap-3">
          <FileIcon
            kind={mimeToKind(file.mimeType)}
            className="h-6 w-6 shrink-0"
          />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-medium text-[#E3E3E3]">{file.name}</h1>
            <p className="truncate text-[11px] text-[#8E918F]">
              {formatBytes(file.sizeBytes)} · Uploaded {formatDate(file.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <a href={`/public/files/${token}/embed`} target="_blank" rel="noreferrer" className="hidden sm:block">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-xs text-[#C4C7C5] hover:bg-[#282A2C] hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Embed
            </Button>
          </a>
          <a href={downloadUrl} download>
            <Button
              size="sm"
              className="rounded-full px-4 text-xs font-medium bg-[#A8C7FA] hover:bg-[#8AB4F8] text-[#001D35]"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          </a>
        </div>
      </header>

      {/* Preview Canvas */}
      <section className="flex flex-1 items-center justify-center p-2 sm:p-6 overflow-hidden">
        <div className="relative h-full w-full overflow-hidden rounded-xl border border-[#36373A] bg-[#0E0E0E] flex items-center justify-center">
          {preview}
        </div>
      </section>
    </main>
  )
}
