import { ClipboardPaste, FolderPlus, Upload } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

type Props = {
  x: number
  y: number
  open: boolean
  canPasteFolder?: boolean
  onClose: () => void
  onUpload: () => void
  onCreateFolder: () => void
  onPasteFolder?: () => void
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-full items-center gap-3 px-3.5 text-[13px] font-normal text-[#1F1F1F] transition-all duration-150 active:scale-[0.98] hover:bg-[#F0F4F9] text-left select-none dark:text-[#E3E3E3] dark:hover:bg-[#28292A]"
    >
      <Icon className="h-4 w-4 shrink-0 text-[#444746] dark:text-[#C4C7C5]" />
      <span className="flex-1 truncate">{label}</span>
    </button>
  )
}

export function EmptyAreaContextMenu({
  x,
  y,
  open,
  canPasteFolder = false,
  onClose,
  onUpload,
  onCreateFolder,
  onPasteFolder,
}: Props) {
  const { t } = useLanguage()
  if (!open) return null
  const safeX = Math.max(12, Math.min(x, window.innerWidth - 240))
  const safeY = Math.max(12, Math.min(y, window.innerHeight - 180))

  return (
    <>
      <div
        className="fixed inset-0 z-40 cursor-default"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        className="fixed z-50 w-56 overflow-hidden rounded-2xl border border-[#E0E3E7] bg-white py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:border-[#36373A] dark:bg-[#1E1F20] dark:shadow-[0_12px_36px_rgba(0,0,0,0.6)] animate-m3-popover"
        style={
          window.innerWidth >= 640
            ? { left: safeX, top: safeY }
            : { insetInline: '0.75rem', bottom: '0.75rem', position: 'fixed' }
        }
      >
        <div className="py-1">
          <MenuItem icon={FolderPlus} label={t('action.new_folder', 'New folder')} onClick={onCreateFolder} />
          <div className="my-1.5 h-px bg-[#E0E3E7] dark:bg-[#36373A]" />
          <MenuItem icon={Upload} label={t('action.file_upload', 'File upload')} onClick={onUpload} />
          {canPasteFolder && onPasteFolder ? (
            <>
              <div className="my-1.5 h-px bg-[#E0E3E7] dark:bg-[#36373A]" />
              <MenuItem icon={ClipboardPaste} label={t('menu.paste_folder', 'Paste folder here')} onClick={onPasteFolder} />
            </>
          ) : null}
        </div>
      </div>
    </>
  )
}
