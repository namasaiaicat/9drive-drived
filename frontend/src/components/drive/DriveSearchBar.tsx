import { useState, useEffect, useRef, useTransition, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search,
  X,
  SlidersHorizontal,
  ChevronDown,
  Folder,
  CornerDownLeft,
  Loader2,
  Check,
  HardDrive
} from 'lucide-react'
import { useDriveFilter } from '@/context/DriveFilterContext'
import { apiFetch } from '@/lib/api'
import { FileIcon } from './FileIcon'
import { cn } from '@/lib/utils'

type SuggestionAccount = {
  id: string
  email: string
  provider: string
  displayName?: string | null
}

type SuggestionFile = {
  id: string
  name: string
  mimeType: string
  sizeBytes: string
  folderId?: string | null
  provider: string
  providerFileId?: string
  updatedAt: string
  connectedAccount?: SuggestionAccount | null
  folder?: { id: string; name: string } | null
}

type SuggestionFolder = {
  id: string
  name: string
  color: string
  iconUrl?: string | null
  updatedAt: string
  connectedAccount?: SuggestionAccount | null
}

type SuggestionResponse = {
  files: SuggestionFile[]
  folders: SuggestionFolder[]
}

function formatSuggestionDate(dateStr: string): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  const now = new Date()
  const isSameYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(isSameYear ? {} : { year: 'numeric' }),
  })
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)

  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="font-semibold text-[#0B57D0] dark:text-[#A8C7FA]">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  )
}

function mimeToKind(mimeType: string): 'doc' | 'pdf' | 'image' | 'video' | 'archive' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.includes('pdf')) return 'pdf'
  if (
    mimeType.includes('zip') ||
    mimeType.includes('rar') ||
    mimeType.includes('tar') ||
    mimeType.includes('7z') ||
    mimeType.includes('compressed')
  ) {
    return 'archive'
  }
  return 'doc'
}

export function DriveSearchBar() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { accounts, selectedAccountId, getDriveLetter } = useDriveFilter()

  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestionResponse>({ files: [], folders: [] })
  const [focusedIndex, setFocusedIndex] = useState(-1)

  // Filter chips state
  const [filterKind, setFilterKind] = useState<'all' | 'doc' | 'pdf' | 'image' | 'video' | 'archive'>('all')
  const [filterAccountId, setFilterAccountId] = useState<string>(() => {
    return selectedAccountId || 'all'
  })
  const [filterModified, setFilterModified] = useState<'all' | 'today' | '7d' | '30d' | 'year'>('all')

  // Chip dropdown popovers
  const [openChip, setOpenChip] = useState<'type' | 'account' | 'modified' | null>(null)
  const [advancedModalOpen, setAdvancedModalOpen] = useState(false)

  // Advanced search form inputs
  const [advMinSizeMb, setAdvMinSizeMb] = useState('')
  const [advMaxSizeMb, setAdvMaxSizeMb] = useState('')

  const containerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const debounceTimerRef = useRef<any>(null)
  const [, startTransition] = useTransition()

  // Sync with global drive filter changes if user hasn't explicitly changed dropdown account
  useEffect(() => {
    if (selectedAccountId && !searchParams.get('accountId')) {
      setFilterAccountId(selectedAccountId)
    }
  }, [selectedAccountId, searchParams])

  // Sync input text if URL q changes externally
  useEffect(() => {
    const urlQ = searchParams.get('q') ?? ''
    if (urlQ !== query && !isOpen) {
      setQuery(urlQ)
    }
  }, [searchParams])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setOpenChip(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch suggestions with debounce
  useEffect(() => {
    if (!isOpen) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    const trimmed = query.trim()
    const isFiltered = filterKind !== 'all' || (filterAccountId && filterAccountId !== 'all') || filterModified !== 'all'

    // If query is empty and no filters selected, reset suggestions
    if (!trimmed && !isFiltered) {
      setSuggestions({ files: [], folders: [] })
      setLoading(false)
      return
    }

    setLoading(true)
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams()
        if (trimmed) params.set('q', trimmed)
        if (filterKind !== 'all') params.set('kind', filterKind)
        if (filterAccountId && filterAccountId !== 'all') params.set('accountId', filterAccountId)
        if (filterModified !== 'all') params.set('modified', filterModified)
        params.set('limit', '8')

        const data = await apiFetch<SuggestionResponse>(`/files/suggestions?${params.toString()}`)
        startTransition(() => {
          setSuggestions(data)
          setFocusedIndex(-1)
        })
      } catch (err) {
        console.error('Failed to fetch search suggestions:', err)
        setSuggestions({ files: [], folders: [] })
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [query, filterKind, filterAccountId, filterModified, isOpen])

  // Combine items for keyboard navigation: folders first then files
  const combinedItems = [
    ...suggestions.folders.map((f) => ({ type: 'folder' as const, item: f })),
    ...suggestions.files.map((f) => ({ type: 'file' as const, item: f })),
  ]

  function handleSelectFile(file: SuggestionFile) {
    setIsOpen(false)
    setOpenChip(null)
    const folderParam = file.folderId ? `folderId=${file.folderId}&` : ''
    navigate(`/all-files?${folderParam}previewFileId=${file.id}`)
    window.dispatchEvent(new CustomEvent('9drive:preview-file', { detail: { fileId: file.id } }))
  }

  function handleSelectFolder(folder: SuggestionFolder) {
    setIsOpen(false)
    setOpenChip(null)
    navigate(`/all-files?folderId=${folder.id}`)
  }

  function submitSearch(e?: FormEvent) {
    if (e) e.preventDefault()
    setIsOpen(false)
    setOpenChip(null)
    setAdvancedModalOpen(false)

    const nextParams = new URLSearchParams()
    const trimmed = query.trim()
    if (trimmed) nextParams.set('q', trimmed)
    if (filterKind !== 'all') nextParams.set('kind', filterKind)
    if (filterAccountId && filterAccountId !== 'all') nextParams.set('accountId', filterAccountId)

    if (advMinSizeMb) {
      const bytes = Number(advMinSizeMb) * 1024 * 1024
      if (!isNaN(bytes) && bytes > 0) nextParams.set('minSize', String(bytes))
    }
    if (advMaxSizeMb) {
      const bytes = Number(advMaxSizeMb) * 1024 * 1024
      if (!isNaN(bytes) && bytes > 0) nextParams.set('maxSize', String(bytes))
    }

    navigate({ pathname: '/all-files', search: nextParams.toString() })
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setOpenChip(null)
      return
    }

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((prev) => (prev < combinedItems.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : combinedItems.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (focusedIndex >= 0 && combinedItems[focusedIndex]) {
        const target = combinedItems[focusedIndex]
        if (target.type === 'folder') {
          handleSelectFolder(target.item as SuggestionFolder)
        } else {
          handleSelectFile(target.item as SuggestionFile)
        }
      } else {
        submitSearch()
      }
    }
  }

  function clearQuery() {
    setQuery('')
    inputRef.current?.focus()
  }

  function resetAllFilters() {
    setFilterKind('all')
    setFilterAccountId(selectedAccountId || 'all')
    setFilterModified('all')
    setAdvMinSizeMb('')
    setAdvMaxSizeMb('')
  }

  const activeAccountObj = accounts.find((a) => a.id === filterAccountId)
  const accountLabel =
    filterAccountId === 'all'
      ? 'All accounts'
      : activeAccountObj
      ? `Drive ${getDriveLetter(activeAccountObj.id)} (${activeAccountObj.email.split('@')[0]})`
      : 'Account'

  const kindLabelMap: Record<string, string> = {
    all: 'Type',
    doc: 'Documents',
    pdf: 'PDFs',
    image: 'Images',
    video: 'Videos',
    archive: 'Archives',
  }

  const modifiedLabelMap: Record<string, string> = {
    all: 'Modified',
    today: 'Today',
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    year: 'This year',
  }

  return (
    <div ref={containerRef} className="relative flex-1 max-w-2xl px-2">
      {/* Search Input Bar */}
      <div
        className={cn(
          'relative flex items-center h-12 w-full transition-all duration-200 ease-out',
          isOpen
            ? 'rounded-t-2xl bg-white shadow-[0_4px_24px_rgba(0,0,0,0.14)] dark:bg-[#1E1F20] dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)] border-b border-[#E0E3E7] dark:border-[#36373A]'
            : 'rounded-full bg-[#EDF2FC] hover:bg-[#E9EEF6] dark:bg-[#28292A] dark:hover:bg-[#333537]'
        )}
      >
        <div className="flex h-full w-12 items-center justify-center text-[#444746] dark:text-[#C4C7C5]">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#0B57D0] dark:text-[#A8C7FA]" />
          ) : (
            <Search className="h-5 w-5" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search in Drive"
          className="h-full flex-1 bg-transparent text-sm text-[#1F1F1F] placeholder:text-[#444746] outline-none dark:text-[#E3E3E3] dark:placeholder:text-[#8E918F]"
        />

        {query ? (
          <button
            type="button"
            onClick={clearQuery}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10 mr-1"
            title="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => {
            setAdvancedModalOpen((v) => !v)
            setIsOpen(true)
          }}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full mr-1 text-[#444746] hover:bg-black/5 transition-colors dark:text-[#C4C7C5] dark:hover:bg-white/10',
            advancedModalOpen && 'text-[#0B57D0] bg-[#C2E7FF]/40 dark:text-[#A8C7FA]'
          )}
          aria-label="Search options"
          title="Search options"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Autocomplete Dropdown Popover */}
      {isOpen && (
        <div
          className={cn(
            'absolute left-2 right-2 top-12 z-50 bg-white shadow-[0_12px_36px_rgba(0,0,0,0.18)] dark:bg-[#1E1F20] dark:shadow-[0_16px_48px_rgba(0,0,0,0.7)]',
            'rounded-b-2xl border-x border-b border-[#E0E3E7] dark:border-[#36373A]'
          )}
        >
          {/* 1. Filter Chips Row (Type, People/Account, Modified) */}
          <div className="relative z-30 flex items-center gap-2 px-4 py-2.5 border-b border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] flex-wrap">
            {/* Type Chip */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenChip(openChip === 'type' ? null : 'type')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-colors',
                  filterKind !== 'all'
                    ? 'border-[#0B57D0] bg-[#C2E7FF]/30 text-[#0B57D0] dark:border-[#A8C7FA] dark:text-[#A8C7FA] dark:bg-[#004A77]/30'
                    : 'border-[#747775]/40 text-[#444746] hover:bg-black/5 dark:border-[#8E918F]/40 dark:text-[#C4C7C5] dark:hover:bg-white/5'
                )}
              >
                <span>{kindLabelMap[filterKind]}</span>
                <ChevronDown className="h-3 w-3" />
              </button>

              {openChip === 'type' && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenChip(null)} />
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-48 rounded-xl border border-[#E0E3E7] bg-white py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.18)] dark:border-[#36373A] dark:bg-[#28292A] dark:shadow-[0_12px_36px_rgba(0,0,0,0.8)]">
                    {[
                      { value: 'all', label: 'All types' },
                      { value: 'doc', label: 'Documents' },
                      { value: 'pdf', label: 'PDFs' },
                      { value: 'image', label: 'Photos & images' },
                      { value: 'video', label: 'Videos' },
                      { value: 'archive', label: 'Archives' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setFilterKind(option.value as any)
                          setOpenChip(null)
                        }}
                        className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-[#1F1F1F] hover:bg-black/5 dark:text-[#E3E3E3] dark:hover:bg-white/5 text-left"
                      >
                        <span>{option.label}</span>
                        {filterKind === option.value && <Check className="h-3 w-3 text-[#0B57D0] dark:text-[#A8C7FA]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Storage Account / Drive Chip */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenChip(openChip === 'account' ? null : 'account')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap',
                  filterAccountId !== 'all'
                    ? 'border-[#0B57D0] bg-[#C2E7FF]/30 text-[#0B57D0] dark:border-[#A8C7FA] dark:text-[#A8C7FA] dark:bg-[#004A77]/30'
                    : 'border-[#747775]/40 text-[#444746] hover:bg-black/5 dark:border-[#8E918F]/40 dark:text-[#C4C7C5] dark:hover:bg-white/5'
                )}
              >
                <HardDrive className="h-3 w-3" />
                <span>{accountLabel}</span>
                <ChevronDown className="h-3 w-3" />
              </button>

              {openChip === 'account' && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenChip(null)} />
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-64 rounded-xl border border-[#E0E3E7] bg-white py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.18)] dark:border-[#36373A] dark:bg-[#28292A] dark:shadow-[0_12px_36px_rgba(0,0,0,0.8)] max-h-64 overflow-y-auto scrollbar-thin">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterAccountId('all')
                        setOpenChip(null)
                      }}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-[#1F1F1F] hover:bg-black/5 dark:text-[#E3E3E3] dark:hover:bg-white/5 text-left"
                    >
                      <span className="font-medium">All accounts</span>
                      {filterAccountId === 'all' && <Check className="h-3 w-3 text-[#0B57D0] dark:text-[#A8C7FA]" />}
                    </button>
                    <div className="my-1 border-t border-[#E0E3E7] dark:border-[#36373A]" />
                    {accounts.map((acc) => {
                      const letter = getDriveLetter(acc.id)
                      const isSelected = filterAccountId === acc.id
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => {
                            setFilterAccountId(acc.id)
                            setOpenChip(null)
                          }}
                          className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-[#1F1F1F] hover:bg-black/5 dark:text-[#E3E3E3] dark:hover:bg-white/5 text-left"
                        >
                          <div className="truncate pr-2">
                            <span className="font-semibold text-[#0B57D0] dark:text-[#A8C7FA] mr-1.5">
                              Drive {letter}
                            </span>
                            <span className="text-[#444746] dark:text-[#C4C7C5]">{acc.email}</span>
                          </div>
                          {isSelected && <Check className="h-3 w-3 shrink-0 text-[#0B57D0] dark:text-[#A8C7FA]" />}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Modified Chip */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenChip(openChip === 'modified' ? null : 'modified')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-colors',
                  filterModified !== 'all'
                    ? 'border-[#0B57D0] bg-[#C2E7FF]/30 text-[#0B57D0] dark:border-[#A8C7FA] dark:text-[#A8C7FA] dark:bg-[#004A77]/30'
                    : 'border-[#747775]/40 text-[#444746] hover:bg-black/5 dark:border-[#8E918F]/40 dark:text-[#C4C7C5] dark:hover:bg-white/5'
                )}
              >
                <span>{modifiedLabelMap[filterModified]}</span>
                <ChevronDown className="h-3 w-3" />
              </button>

              {openChip === 'modified' && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenChip(null)} />
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-48 rounded-xl border border-[#E0E3E7] bg-white py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.18)] dark:border-[#36373A] dark:bg-[#28292A] dark:shadow-[0_12px_36px_rgba(0,0,0,0.8)]">
                    {[
                      { value: 'all', label: 'Any time' },
                      { value: 'today', label: 'Today' },
                      { value: '7d', label: 'Last 7 days' },
                      { value: '30d', label: 'Last 30 days' },
                      { value: 'year', label: 'This year' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setFilterModified(option.value as any)
                          setOpenChip(null)
                        }}
                        className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-[#1F1F1F] hover:bg-black/5 dark:text-[#E3E3E3] dark:hover:bg-white/5 text-left"
                      >
                        <span>{option.label}</span>
                        {filterModified === option.value && (
                          <Check className="h-3 w-3 text-[#0B57D0] dark:text-[#A8C7FA]" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Clear filters if any active */}
            {(filterKind !== 'all' || (filterAccountId && filterAccountId !== selectedAccountId) || filterModified !== 'all') && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="text-xs text-[#0B57D0] hover:underline dark:text-[#A8C7FA] ml-auto shrink-0"
              >
                Reset
              </button>
            )}
          </div>

          {/* 2. Advanced Search Popover Expandable Section */}
          {advancedModalOpen && (
            <div className="px-5 py-4 bg-[#F8FAFD] dark:bg-[#28292A]/50 border-b border-[#E0E3E7] dark:border-[#36373A] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1F1F1F] dark:text-[#E3E3E3] uppercase tracking-wider">
                  Advanced Filters
                </span>
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-xs text-[#0B57D0] hover:underline dark:text-[#A8C7FA]"
                >
                  Clear all
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#444746] dark:text-[#C4C7C5] block mb-1">
                    Min Size (MB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 10"
                    value={advMinSizeMb}
                    onChange={(e) => setAdvMinSizeMb(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg border border-[#E0E3E7] bg-white text-xs text-[#1F1F1F] dark:border-[#36373A] dark:bg-[#1E1F20] dark:text-[#E3E3E3] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#444746] dark:text-[#C4C7C5] block mb-1">
                    Max Size (MB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 500"
                    value={advMaxSizeMb}
                    onChange={(e) => setAdvMaxSizeMb(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg border border-[#E0E3E7] bg-white text-xs text-[#1F1F1F] dark:border-[#36373A] dark:bg-[#1E1F20] dark:text-[#E3E3E3] outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. Suggestions List */}
          <div className="relative z-10 max-h-[360px] overflow-y-auto py-1 scrollbar-thin">
            {loading && combinedItems.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-[#444746] dark:text-[#8E918F]">
                <Loader2 className="h-4 w-4 animate-spin text-[#0B57D0] dark:text-[#A8C7FA]" />
                <span>Searching in Drive...</span>
              </div>
            ) : combinedItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#444746] dark:text-[#8E918F]">
                {query.trim() || filterKind !== 'all' || filterAccountId !== 'all'
                  ? 'No matching files or folders found.'
                  : 'Start typing to search files, folders, or archives...'}
              </div>
            ) : (
              <div className="divide-y divide-transparent">
                {/* Folders first */}
                {suggestions.folders.map((folder, idx) => {
                  const isFocused = focusedIndex === idx
                  const letter = folder.connectedAccount ? getDriveLetter(folder.connectedAccount.id) : ''
                  return (
                    <div
                      key={`folder-${folder.id}`}
                      onClick={() => handleSelectFolder(folder)}
                      className={cn(
                        'flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors select-none',
                        isFocused
                          ? 'bg-[#C2E7FF]/40 dark:bg-[#004A77]/40'
                          : 'hover:bg-black/5 dark:hover:bg-white/5'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <Folder className="h-5 w-5 shrink-0 text-[#444746] dark:text-[#C4C7C5]" />
                        <div className="min-w-0">
                          <p className="text-sm font-normal text-[#1F1F1F] dark:text-[#E3E3E3] truncate">
                            <HighlightMatch text={folder.name} query={query} />
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-[#444746] dark:text-[#8E918F]">
                            {letter && (
                              <span className="font-medium text-[#0B57D0] dark:text-[#A8C7FA]">
                                Drive {letter}
                              </span>
                            )}
                            {folder.connectedAccount?.email && (
                              <span>• {folder.connectedAccount.email}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-[#444746] dark:text-[#8E918F] shrink-0">
                        {formatSuggestionDate(folder.updatedAt)}
                      </span>
                    </div>
                  )
                })}

                {/* Files */}
                {suggestions.files.map((file, idx) => {
                  const itemIndex = suggestions.folders.length + idx
                  const isFocused = focusedIndex === itemIndex
                  const letter = file.connectedAccount ? getDriveLetter(file.connectedAccount.id) : ''
                  const ownerName =
                    file.connectedAccount?.displayName ||
                    file.connectedAccount?.email?.split('@')[0] ||
                    file.connectedAccount?.email ||
                    ''

                  return (
                    <div
                      key={`file-${file.id}`}
                      onClick={() => handleSelectFile(file)}
                      className={cn(
                        'flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors select-none',
                        isFocused
                          ? 'bg-[#C2E7FF]/40 dark:bg-[#004A77]/40'
                          : 'hover:bg-black/5 dark:hover:bg-white/5'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <FileIcon kind={mimeToKind(file.mimeType)} className="h-5 w-5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-normal text-[#1F1F1F] dark:text-[#E3E3E3] truncate">
                            <HighlightMatch text={file.name} query={query} />
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-[#444746] dark:text-[#8E918F]">
                            {ownerName && <span>{ownerName}</span>}
                            {letter && (
                              <span className="font-medium text-[#0B57D0] dark:text-[#A8C7FA]">
                                [Drive {letter}]
                              </span>
                            )}
                            {file.folder?.name && (
                              <span className="truncate max-w-[120px]">• in {file.folder.name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-[#444746] dark:text-[#8E918F] shrink-0">
                        {formatSuggestionDate(file.updatedAt)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 4. Dropdown Footer: Advanced Search & All Results */}
          <div className="relative z-10 flex items-center justify-between px-4 py-3 border-t border-[#E0E3E7] dark:border-[#36373A] bg-[#F8FAFD] dark:bg-[#1E1F20] rounded-b-2xl">
            <button
              type="button"
              onClick={() => setAdvancedModalOpen((v) => !v)}
              className="text-xs font-medium text-[#0B57D0] hover:underline dark:text-[#A8C7FA]"
            >
              {advancedModalOpen ? 'Hide options' : 'Advanced search'}
            </button>

            <button
              type="button"
              onClick={() => submitSearch()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#1F1F1F] hover:bg-black/5 dark:text-[#E3E3E3] dark:hover:bg-white/5 transition-colors"
            >
              <span>All results</span>
              <CornerDownLeft className="h-3 w-3 text-[#444746] dark:text-[#C4C7C5]" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
