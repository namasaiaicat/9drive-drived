import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  ChevronDown,
  Layers,
  Search,
  Settings2,
  X
} from 'lucide-react'
import { useDriveFilter } from '@/context/DriveFilterContext'
import { formatBytes } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/LanguageContext'

function GoogleDriveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 87.3 78" className={className} aria-hidden="true">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
      <path d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44C.4 49.9 0 51.45 0 53h27.5z" fill="#00ac47" />
      <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 10.1z" fill="#ea4335" />
      <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
      <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.5c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
    </svg>
  )
}

export function DriveAccountSelector({
  className,
}: {
  className?: string
}) {
  const navigate = useNavigate()
  const { language } = useLanguage()
  const isId = language === 'id'
  const {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    defaultAccountId,
    activeAccount,
    isAll,
    isLoadingAccounts,
    accountsError,
    refreshAccounts,
  } = useDriveFilter()

  const [open, setOpen] = useState(false)
  const listId = useId()
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    } else {
      setSearchTerm('')
    }
  }, [open])

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Filter accounts in real-time
  const filteredAccounts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return accounts
    return accounts.filter((acc) => {
      const email = acc.email.toLowerCase()
      const provider = acc.provider.toLowerCase()
      const displayName = (acc.displayName || '').toLowerCase()
      return email.includes(q) || provider.includes(q) || displayName.includes(q)
    })
  }, [accounts, searchTerm])

  function handleSelect(id: string) {
    setSelectedAccountId(id)
    setOpen(false)
  }

  const displayText = isAll ? (isId ? 'Semua Akun' : 'All accounts') : (activeAccount?.email ?? (isId ? 'Pilih akun' : 'Choose account'))

  return (
    <div className={cn('relative inline-block text-left', className)} ref={containerRef} onKeyDown={(event) => {
      if (event.key === 'Escape') { setOpen(false); containerRef.current?.querySelector('button')?.focus(); return }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
      if (!open) { event.preventDefault(); setOpen(true); return }
      if (event.target instanceof HTMLInputElement && !event.key.startsWith('Arrow')) return
      const options = [...(containerRef.current?.querySelectorAll<HTMLButtonElement>('button[role="option"]') ?? [])]
      const current = options.indexOf(document.activeElement as HTMLButtonElement)
      if (!options.length) return
      event.preventDefault()
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
      options[next]?.focus()
    }}>
      {/* Trigger Button - Clean Google Drive Style */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'group flex h-10 items-center gap-2 rounded-full border border-[#E0E3E7] bg-white px-3.5 text-xs font-normal transition-all duration-150 hover:bg-[#F0F4F9] hover:border-[#C4C7C5] active:scale-[0.98] dark:border-[#36373A] dark:bg-[#1E1F20] dark:hover:bg-[#28292A] dark:hover:border-[#444746]',
          open && 'border-[#0B57D0] ring-2 ring-[#0B57D0]/15 dark:border-[#A8C7FA]'
        )}
        title={displayText}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
      >
        {isAll ? (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E8F0FE] text-[#0B57D0] dark:bg-[#004A77] dark:text-[#C2E7FF]">
            <Layers className="h-3.5 w-3.5" />
          </div>
        ) : (
          <GoogleDriveIcon className="h-4 w-4 shrink-0" />
        )}

        <span className="truncate max-w-[110px] sm:max-w-[190px] text-[#1F1F1F] dark:text-[#E3E3E3]">
          {isLoadingAccounts ? (isId ? 'Memuat akun…' : 'Loading accounts…') : accountsError ? (isId ? 'Coba muat akun' : 'Retry accounts') : displayText}
        </span>

        <ChevronDown
          className={cn(
            'h-4 w-4 text-[#747775] transition-transform duration-200 dark:text-[#8E918F]',
            open && 'rotate-180 text-[#0B57D0] dark:text-[#A8C7FA]'
          )}
        />
      </button>

      {/* Popover Dropdown */}
      {open && (
        <div
          className="absolute left-0 top-12 z-50 w-72 max-w-[calc(100vw-24px)] sm:w-80 xl:left-auto xl:right-0 rounded-2xl border border-[#E0E3E7] bg-white shadow-xl dark:border-[#36373A] dark:bg-[#1E1F20] animate-m3-popover overflow-hidden"
          role="dialog"
          id={listId}
          aria-label={isId ? 'Akun penyimpanan' : 'Storage accounts'}
        >
          {/* Header */}
          {accountsError && <div role="alert" className="p-3 text-sm text-[#B3261E] dark:text-[#F2B8B5]"><p>{accountsError}</p><button className="min-h-11 underline" onClick={() => void refreshAccounts()}>{isId ? 'Coba lagi' : 'Retry'}</button></div>}
          <div className="border-b border-[#E0E3E7] bg-[#F8FAFD] px-3.5 py-3 dark:border-[#36373A] dark:bg-[#28292A]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                {isId ? 'Pilih akun penyimpanan' : 'Choose storage account'}
              </p>
              <span className="rounded-full bg-[#E0E3E7] px-2 py-0.5 text-[10px] font-medium text-[#444746] dark:bg-[#36373A] dark:text-[#C4C7C5]">
                {isLoadingAccounts ? (isId ? 'Memuat…' : 'Loading…') : `${accounts.length} ${isId ? 'Akun' : 'Accounts'}`}
              </span>
            </div>

            {/* Real-time Search Box inside Popover */}
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#747775] dark:text-[#8E918F]" />
              <input
                ref={searchInputRef}
                type="text"
                aria-label={isId ? 'Cari akun penyimpanan' : 'Search storage accounts'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isId ? 'Cari email akun…' : 'Search account email…'}
                className="h-8 w-full rounded-lg border border-[#E0E3E7] bg-white pl-8 pr-7 text-xs text-[#1F1F1F] placeholder:text-[#747775] outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] dark:border-[#444746] dark:bg-[#1E1F20] dark:text-[#E3E3E3] dark:placeholder:text-[#8E918F] dark:focus:border-[#A8C7FA]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#747775] hover:text-[#1F1F1F] dark:text-[#8E918F] dark:hover:text-[#E3E3E3]"
                  title="Hapus pencarian"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Accounts List */}
          <div role="listbox" aria-label={isId ? 'Pilihan akun' : 'Account choices'} className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
            {/* 1. Opsi Tampilkan Semua Akun */}
            {(!searchTerm || 'semua akun all'.includes(searchTerm.toLowerCase())) && (
              <button
                type="button"
                onClick={() => handleSelect('all')}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors text-left',
                  isAll
                    ? 'bg-[#E8F0FE] text-[#0B57D0] font-medium dark:bg-[#004A77]/50 dark:text-[#C2E7FF]'
                    : 'text-[#1F1F1F] hover:bg-[#F0F4F9] dark:text-[#E3E3E3] dark:hover:bg-[#28292A]'
                )}
                role="option"
                aria-selected={isAll}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      isAll
                        ? 'bg-[#0B57D0] text-white dark:bg-[#A8C7FA] dark:text-[#003062]'
                        : 'bg-[#E0E3E7] text-[#444746] dark:bg-[#36373A] dark:text-[#C4C7C5]'
                    )}
                  >
                    <Layers className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-normal truncate">{isId ? 'Semua akun' : 'All accounts'}</p>
                      {defaultAccountId === 'all' && (
                        <span className="shrink-0 rounded px-1.5 py-0.2 text-[9px] font-medium bg-[#E6F4EA] text-[#137333] dark:bg-[#0E3D1E] dark:text-[#A8DAB5]">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#747775] dark:text-[#8E918F] truncate">
                      {isId ? 'Tampilkan seluruh file dan folder' : 'Show all files and folders'}
                    </p>
                  </div>
                </div>
                {isAll && <Check className="h-4 w-4 shrink-0 text-[#0B57D0] dark:text-[#A8C7FA]" />}
              </button>
            )}

            <div className="my-1 border-t border-[#E0E3E7] dark:border-[#36373A]" />

            {/* 2. Daftar Akun */}
            {filteredAccounts.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-[#747775] dark:text-[#8E918F]">
                {isId ? 'Tidak ada akun yang cocok' : 'No matching accounts'}
              </div>
            ) : (
              filteredAccounts.map((account) => {
                const isSelected = selectedAccountId === account.id
                const isDefault = defaultAccountId === account.id
                const used = account.storageAccount?.usedBytes
                const total = account.storageAccount?.totalBytes

                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => handleSelect(account.id)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors text-left group',
                      isSelected
                        ? 'bg-[#E8F0FE] text-[#0B57D0] dark:bg-[#004A77]/50 dark:text-[#C2E7FF]'
                        : 'text-[#1F1F1F] hover:bg-[#F0F4F9] dark:text-[#E3E3E3] dark:hover:bg-[#28292A]'
                    )}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F0F4F9] dark:bg-[#28292A]">
                        <GoogleDriveIcon className="h-3.5 w-3.5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-normal truncate text-[#1F1F1F] dark:text-[#E3E3E3]">
                            {account.email}
                          </p>
                          {isDefault && (
                            <span className="shrink-0 rounded px-1.5 py-0.2 text-[9px] font-medium bg-[#E6F4EA] text-[#137333] dark:bg-[#0E3D1E] dark:text-[#A8DAB5]">
                              {isId ? 'Utama' : 'Default'}
                            </span>
                          )}
                        </div>
                        {total && (
                          <p className="text-[10px] text-[#747775] dark:text-[#8E918F] truncate">
                            {formatBytes(used)} {isId ? 'dari' : 'of'} {formatBytes(total)}
                          </p>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0 text-[#0B57D0] dark:text-[#A8C7FA]" />
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#E0E3E7] bg-[#F8FAFD] p-2 dark:border-[#36373A] dark:bg-[#28292A]">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/settings')
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-[#444746] hover:bg-[#E9EEF6] dark:text-[#C4C7C5] dark:hover:bg-[#36373A]"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>{isId ? 'Kelola akun di Pengaturan' : 'Manage accounts in Settings'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
