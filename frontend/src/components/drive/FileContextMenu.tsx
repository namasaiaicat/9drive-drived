import { useNavigate } from 'react-router-dom'
import {
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  FolderInput,
  Globe,
  Info,
  Link2,
  Sparkles,
  Trash2,
  UserPlus,
} from 'lucide-react'
import type { FileItem } from '@/data/drive-data'
import { FileIcon } from '@/components/drive/FileIcon'
import { API_URL } from '@/lib/api'
import { getAccessToken } from '@/lib/auth'
import { useToast } from '@/context/ToastContext'

type Props = {
  x: number
  y: number
  file: FileItem | null
  onClose: () => void
  onView: () => void
  onDownload: () => void
  onRename: () => void
  onMove: () => void
  onDetails: () => void
  onShare: () => void
  onCopyLink: () => void
  onCopyCdnUrl?: () => void
  onDelete: () => void
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger = false,
  kbd,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
  danger?: boolean
  kbd?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex h-9 w-full items-center gap-3 px-3.5 text-[13px] font-normal transition-all duration-150 active:scale-[0.98] text-left select-none',
        danger
          ? 'text-[#B3261E] hover:bg-[#F9DEDC]/50 dark:text-[#F2B8B5] dark:hover:bg-[#8C1D18]/30'
          : 'text-[#1F1F1F] hover:bg-[#F0F4F9] dark:text-[#E3E3E3] dark:hover:bg-[#28292A]',
      ].join(' ')}
    >
      <Icon className="h-4 w-4 shrink-0 text-[#444746] dark:text-[#C4C7C5]" />
      <span className="flex-1 truncate">{label}</span>
      {kbd && (
        <span className="text-[11px] text-[#747775] dark:text-[#8E918F]">
          {kbd}
        </span>
      )}
    </button>
  )
}

export function FileContextMenu({
  x,
  y,
  file,
  onClose,
  onView,
  onDownload,
  onRename,
  onMove,
  onDetails,
  onShare,
  onCopyLink,
  onCopyCdnUrl,
  onDelete,
}: Props) {
  const navigate = useNavigate()
  const { toast } = useToast()
  if (!file) return null

  const handleCopyCdn = () => {
    if (onCopyCdnUrl) {
      onCopyCdnUrl()
    } else {
      const url = `${API_URL}/cdn/view/${file.id}`
      navigator.clipboard
        .writeText(url)
        .then(() => toast.success('CDN Direct URL copied to clipboard!'))
        .catch(() => toast.error('Failed to copy CDN URL'))
      onClose()
    }
  }

  const fetchAsFileObj = async (): Promise<File | null> => {
    try {
      const token = getAccessToken()
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API_URL}/cdn/raw/${file.id}`, { headers })
      if (!res.ok) return null
      const blob = await res.blob()
      return new File([blob], file.name, { type: file.mimeType || 'application/octet-stream' })
    } catch {
      return null
    }
  }

  const handleRemoveBg = async () => {
    onClose()
    toast.info('Loading image into Background Remover...')
    const fileObj = await fetchAsFileObj()
    if (fileObj) {
      navigate('/tools/remove-bg', { state: { initialFiles: [fileObj] } })
    } else {
      navigate('/tools/remove-bg')
    }
  }

  const handleConvertToPdf = async () => {
    onClose()
    toast.info('Loading image into PDF Studio...')
    const fileObj = await fetchAsFileObj()
    if (fileObj) {
      navigate('/tools/pdf?mode=images-to-pdf', { state: { initialFiles: [fileObj] } })
    } else {
      navigate('/tools/pdf?mode=images-to-pdf')
    }
  }

  const handleOpenPdfTools = async () => {
    onClose()
    toast.info('Loading document into PDF Studio...')
    const fileObj = await fetchAsFileObj()
    if (fileObj) {
      navigate('/tools/pdf', { state: { initialFiles: [fileObj] } })
    } else {
      navigate('/tools/pdf')
    }
  }

  const isImage = file.kind === 'image' || file.mimeType?.startsWith('image/')
  const isPdf = file.kind === 'pdf' || file.mimeType?.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')

  const safeX = Math.max(12, Math.min(x, window.innerWidth - 240))
  const safeY = Math.max(12, Math.min(y, window.innerHeight - 440))

  return (
    <>
      <div
        className="fixed inset-0 z-40 cursor-default"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        className="fixed z-50 w-60 overflow-hidden rounded-2xl border border-[#E0E3E7] bg-white py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:border-[#36373A] dark:bg-[#1E1F20] dark:shadow-[0_12px_36px_rgba(0,0,0,0.6)] animate-m3-popover"
        style={
          window.innerWidth >= 640
            ? { left: safeX, top: safeY }
            : { insetInline: '0.75rem', bottom: '0.75rem', position: 'fixed' }
        }
      >
        {/* Header: file name + icon */}
        <div className="flex items-center gap-2.5 border-b border-[#E0E3E7] px-3.5 py-2.5 dark:border-[#36373A]">
          <FileIcon kind={file.kind} className="h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">{file.name}</p>
            <p className="text-[11px] text-[#747775] dark:text-[#8E918F]">{file.size}</p>
          </div>
        </div>

        {/* Actions list */}
        <div className="py-1">
          {file.driveUrl ? (
            <MenuItem
              icon={ExternalLink}
              label="Open in Google Drive"
              onClick={() => {
                window.open(file.driveUrl, '_blank')
                onClose()
              }}
            />
          ) : null}
          <MenuItem icon={Eye} label="Preview" onClick={onView} kbd="↵" />
          <MenuItem icon={Download} label="Download" onClick={onDownload} />

          {/* Quick Tools Action */}
          {isImage && (
            <>
              <MenuItem
                icon={Sparkles}
                label="Remove Background (AI)"
                onClick={handleRemoveBg}
              />
              <MenuItem
                icon={FileText}
                label="Convert to PDF"
                onClick={handleConvertToPdf}
              />
            </>
          )}

          {isPdf && (
            <MenuItem
              icon={FileText}
              label="Process with PDF Tools"
              onClick={handleOpenPdfTools}
            />
          )}

          <MenuItem icon={Edit3} label="Rename" onClick={onRename} />
          <MenuItem icon={FolderInput} label="Move to" onClick={onMove} />
          <MenuItem icon={Info} label="File information" onClick={onDetails} />

          <div className="my-1.5 h-px bg-[#E0E3E7] dark:bg-[#36373A]" />

          <MenuItem icon={UserPlus} label="Share" onClick={onShare} />
          <MenuItem icon={Link2} label="Copy link" onClick={onCopyLink} kbd="Ctrl+L" />
          <MenuItem icon={Globe} label="Copy CDN Direct URL" onClick={handleCopyCdn} />

          <div className="my-1.5 h-px bg-[#E0E3E7] dark:bg-[#36373A]" />

          <MenuItem icon={Trash2} label="Move to trash" onClick={onDelete} danger />
        </div>
      </div>
    </>
  )
}
