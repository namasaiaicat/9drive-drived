import { Edit3, ExternalLink, Folder, Link2, Scissors, Trash2, UserPlus } from 'lucide-react'
import type { FolderItem } from '@/data/drive-data'
import { useLanguage } from '@/context/LanguageContext'
import { useMenuFocus } from '@/hooks/useMenuFocus'

type Props = {
  x: number
  y: number
  folder: FolderItem | null
  onClose: () => void
  onCut: () => void
  onRename: () => void
  onShare: () => void
  onCopyLink: () => void
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
      role="menuitem"
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

export function FolderContextMenu({
  x,
  y,
  folder,
  onClose,
  onCut,
  onRename,
  onShare,
  onCopyLink,
  onDelete,
}: Props) {
  const { t } = useLanguage()
  const menuRef = useMenuFocus(Boolean(folder), onClose)
  if (!folder) return null

  const safeX = Math.max(12, Math.min(x, window.innerWidth - 240))
  const safeY = Math.max(12, Math.min(y, window.innerHeight - 300))

  return (
    <>
      <div
        className="fixed inset-0 z-40 cursor-default"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={menuRef} role="menu" aria-label={folder.name} data-menu-surface
        className="fixed z-50 w-56 max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-y-auto rounded-2xl border border-[#E0E3E7] bg-white py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:border-[#36373A] dark:bg-[#1E1F20] dark:shadow-[0_12px_36px_rgba(0,0,0,0.6)] animate-m3-popover"
        style={
          window.innerWidth >= 640
            ? { left: safeX, top: safeY }
            : { insetInline: '0.75rem', bottom: '0.75rem', position: 'fixed' }
        }
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-[#E0E3E7] px-3.5 py-2.5 dark:border-[#36373A]">
          <Folder className="h-4 w-4 shrink-0 text-[#0B57D0]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">{folder.name}</p>
            <p className="text-[11px] text-[#747775] dark:text-[#8E918F]">Folder</p>
          </div>
        </div>

        {/* Actions */}
        <div className="py-1">
          {folder?.driveUrl ? (
            <MenuItem
              icon={ExternalLink}
              label={t('menu.open_in_gdrive', 'Open in Google Drive')}
              onClick={() => {
                window.open(folder.driveUrl, '_blank')
                onClose()
              }}
            />
          ) : null}
          <MenuItem icon={UserPlus} label={t('menu.share', 'Share')} onClick={onShare} />
          <MenuItem icon={Link2} label={t('menu.copy_link', 'Copy link')} onClick={onCopyLink} />
          <MenuItem icon={Scissors} label={t('menu.cut_folder', 'Move / Cut')} onClick={onCut} kbd="Ctrl+X" />
          <MenuItem icon={Edit3} label={t('menu.rename', 'Rename')} onClick={onRename} />
          <div className="my-1.5 h-px bg-[#E0E3E7] dark:bg-[#36373A]" />
          <MenuItem icon={Trash2} label={t('menu.move_to_trash', 'Move to trash')} onClick={onDelete} danger />
        </div>
      </div>
    </>
  )
}
