import { ExternalLink, X, UserPlus, Globe } from 'lucide-react'
import { API_URL, formatBytes, formatDate } from '@/lib/api'
import { useToast } from '@/context/ToastContext'
import { useLanguage } from '@/context/LanguageContext'
import type { FileItem } from '@/data/drive-data'
import { FileIcon } from '@/components/drive/FileIcon'
import { Button } from '@/components/ui/button'
import { useDialogFocus } from '@/hooks/useDialogFocus'

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2.5 border-b border-[#E0E3E7]/60 dark:border-[#36373A]/60">
      <p className="text-xs font-medium text-[#747775] dark:text-[#8E918F]">{label}</p>
      <p className="mt-0.5 break-words text-sm text-[#1F1F1F] dark:text-[#E3E3E3]">{value}</p>
    </div>
  )
}

export function FileDetailsDrawer({
  open,
  file,
  onClose,
  onShare,
}: {
  open: boolean
  file: FileItem | null
  onClose: () => void
  onShare?: (file: FileItem) => void
}) {
  const dialogRef = useDialogFocus(open, onClose)
  const { toast } = useToast()
  const { t } = useLanguage()
  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/32"
        aria-hidden="true"
        onClick={onClose}
      />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={t('drawer.details', 'Details')} tabIndex={-1} className="fixed right-0 top-0 z-[60] h-dvh w-80 max-w-[90vw] border-l border-[#E0E3E7] bg-white shadow-xl dark:border-[#36373A] dark:bg-[#1E1F20] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E0E3E7] px-4 py-3 dark:border-[#36373A]">
          <div className="flex items-center gap-2 min-w-0">
            {file && <FileIcon kind={file.kind} className="h-5 w-5 shrink-0" />}
            <h2 className="truncate text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
              {file?.name ?? t('drawer.details', 'Details')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5]"
            aria-label="Close details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {file ? (
            <>
              {/* Preview square */}
              <div className="flex h-36 items-center justify-center rounded-xl bg-[#F0F4F9] dark:bg-[#28292A]">
                <FileIcon kind={file.kind} className="h-16 w-16 opacity-80" />
              </div>

              {onShare && (
                <Button
                  onClick={() => onShare(file)}
                  variant="outline"
                  className="w-full gap-2 rounded-full border-[#747775]/40 text-[#0B57D0] hover:bg-[#0B57D0]/10 hover:border-[#0B57D0] dark:border-[#747775]/60 dark:text-[#A8C7FA]"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>{t('action.share', 'Share')}</span>
                </Button>
              )}

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#747775] dark:text-[#8E918F] mb-1">
                  {t('drawer.file_details', 'File details')}
                </h3>
                <DetailRow label={t('drawer.type', 'Type')} value={file.mimeType ?? 'Unknown'} />
                <DetailRow label={t('drawer.file_id', 'File ID')} value={file.providerFileId || file.id || '--'} />
                <DetailRow
                  label={t('drawer.size', 'Size')}
                  value={file.mimeType?.startsWith('application/vnd.google-apps.') ? '--' : file.sizeBytes ? formatBytes(file.sizeBytes) : file.size}
                />
                <DetailRow
                  label={t('drawer.location', 'Location')}
                  value={file.folderName ? file.folderName : 'My Drive'}
                />
                <DetailRow
                  label={t('drawer.storage_account', 'Storage account')}
                  value={file.accountEmail ?? file.access}
                />
                <DetailRow
                  label={t('drawer.modified', 'Modified')}
                  value={file.updatedAt ? formatDate(file.updatedAt) : file.date}
                />
                <DetailRow
                  label={t('drawer.storage_provider', 'Storage provider')}
                  value={file.accountProvider ?? 'Google Drive'}
                />

                <div className="py-2.5 border-b border-[#E0E3E7]/60 dark:border-[#36373A]/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-emerald-500" />
                      <p className="text-xs font-medium text-[#747775] dark:text-[#8E918F]">{t('drawer.cdn_direct', 'CDN Direct URL')}</p>
                    </div>
                    <span className="text-[10px] rounded bg-[#E6F4EA] text-[#137333] dark:bg-[#0E3D1E] dark:text-[#A8DAB5] px-1.5 py-0.5 font-medium">Public</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <input
                      type="text"
                      aria-label={t('drawer.cdn_direct', 'CDN Direct URL')}
                      readOnly
                      value={`${API_URL}/cdn/view/${file.id}`}
                      className="min-w-0 flex-1 rounded-lg border border-[#E0E3E7] bg-[#F8FAFD] dark:bg-[#18191A] dark:border-[#36373A] px-2 py-1 text-[11px] font-mono text-[#1F1F1F] dark:text-[#E3E3E3] select-all outline-none"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs rounded-lg shrink-0"
                      onClick={() => {
                        navigator.clipboard
                          .writeText(`${API_URL}/cdn/view/${file.id}`)
                          .then(() => toast.success(t('action.copied', 'Copied!')))
                          .catch(() => toast.error('Failed to copy'))
                      }}
                    >
                      {t('action.copy', 'Copy')}
                    </Button>
                  </div>
                  <p className="mt-1 text-[10px] text-[#747775] dark:text-[#8E918F]">
                    {t('drawer.cdn_desc', 'Direct embed for <img> tags, web apps, and platforms.')}
                  </p>
                </div>

                {file.driveUrl && (
                  <div className="py-2.5 border-b border-[#E0E3E7]/60 dark:border-[#36373A]/60">
                    <p className="text-xs font-medium text-[#747775] dark:text-[#8E918F]">{t('drawer.gdrive_link', 'Google Drive Link')}</p>
                    <a
                      href={file.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-[#0B57D0] dark:text-[#A8C7FA] hover:underline"
                    >
                      <span>{t('menu.open_in_gdrive', 'Open in Google Drive')}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-[#747775]">{t('drawer.select_file', 'Select a file to see details')}</p>
          )}
        </div>
      </div>
    </>
  )
}
