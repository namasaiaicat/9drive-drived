import { useState } from 'react'
import { Archive, Info, LayoutGrid, List, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FileGrid } from '@/components/drive/FileGrid'
import { FileTable } from '@/components/drive/FileTable'
import { archivedFiles } from '@/data/drive-data'

export function ArchivedPage() {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  return (
    <div className="flex flex-col gap-3">
      {/* Google Drive Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <h1 className="text-[22px] font-normal tracking-tight text-[#1F1F1F] dark:text-[#E3E3E3]">
          Archived
        </h1>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-full h-8 text-xs font-medium">
            <RotateCcw className="h-3.5 w-3.5" />
            Restore all
          </Button>
          <Button variant="danger" size="sm" className="rounded-full h-8 text-xs font-medium">
            <Trash2 className="h-3.5 w-3.5" />
            Delete permanently
          </Button>

          <div className="inline-flex items-center rounded-full border border-[#E0E3E7] dark:border-[#444746] bg-white dark:bg-[#1E1F20] p-0.5 shadow-xs ml-1">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#C2E7FF] text-[#001D35] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                  : 'text-[#444746] hover:bg-[#F0F4F9] dark:text-[#C4C7C5] dark:hover:bg-[#282A2C]'
              }`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#C2E7FF] text-[#001D35] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                  : 'text-[#444746] hover:bg-[#F0F4F9] dark:text-[#C4C7C5] dark:hover:bg-[#282A2C]'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Info notice */}
      <div className="flex items-center gap-2.5 rounded-xl bg-[#F0F4F9] dark:bg-[#282A2C] px-4 py-2.5 text-xs text-[#444746] dark:text-[#C4C7C5]">
        <Info className="h-4 w-4 shrink-0 text-[#0B57D0] dark:text-[#A8C7FA]" />
        <span>
          Archived files are kept safely out of your main drive view but remain accessible whenever you need them.
        </span>
      </div>

      {/* Content */}
      {archivedFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#EDF2FC] dark:bg-[#1E1F20] text-[#0B57D0] dark:text-[#A8C7FA]">
            <Archive className="h-10 w-10 stroke-[1.5]" />
          </div>
          <h2 className="mt-5 text-lg font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
            No archived files
          </h2>
          <p className="mt-1 max-w-sm text-sm text-[#747775] dark:text-[#8E918F]">
            Items you archive from your drive will appear here.
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] overflow-hidden">
          <FileTable files={archivedFiles} mode="archived" />
        </div>
      ) : (
        <FileGrid files={archivedFiles} />
      )}
    </div>
  )
}
