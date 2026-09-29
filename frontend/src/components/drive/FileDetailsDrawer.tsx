import { ExternalLink, X, UserPlus } from 'lucide-react'
import { formatBytes, formatDate } from '@/lib/api'
import type { FileItem } from '@/data/drive-data'
import { FileIcon } from '@/components/drive/FileIcon'
import { Button } from '@/components/ui/button'

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
  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 lg:hidden"
        aria-hidden="true"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-16 z-40 h-[calc(100vh-4rem)] w-80 border-l border-[#E0E3E7] bg-white shadow-xl dark:border-[#36373A] dark:bg-[#1E1F20] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E0E3E7] px-4 py-3 dark:border-[#36373A]">
          <div className="flex items-center gap-2 min-w-0">
            {file && <FileIcon kind={file.kind} className="h-5 w-5 shrink-0" />}
            <h2 className="truncate text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
              {file?.name ?? 'Details'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5]"
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
                  <span>Share</span>
                </Button>
              )}

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#747775] dark:text-[#8E918F] mb-1">
                  File details
                </h3>
                <DetailRow label="Type" value={file.mimeType ?? 'Unknown'} />
                <DetailRow
                  label="Size"
                  value={file.sizeBytes ? formatBytes(file.sizeBytes) : file.size}
                />
                <DetailRow
                  label="Location"
                  value={file.folderName ? file.folderName : 'My Drive'}
                />
                <DetailRow
                  label="Owner"
                  value={file.accountEmail ?? file.access}
                />
                <DetailRow
                  label="Modified"
                  value={file.createdAt ? formatDate(file.createdAt) : file.date}
                />
                <DetailRow
                  label="Storage provider"
                  value={file.accountProvider ?? 'Google Drive'}
                />
                {file.driveUrl && (
                  <div className="py-2.5 border-b border-[#E0E3E7]/60 dark:border-[#36373A]/60">
                    <p className="text-xs font-medium text-[#747775] dark:text-[#8E918F]">Google Drive Link</p>
                    <a
                      href={file.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-[#0B57D0] dark:text-[#A8C7FA] hover:underline"
                    >
                      <span>Open in Google Drive</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-[#747775]">Select a file to see details</p>
          )}
        </div>
      </aside>
    </>
  )
}
