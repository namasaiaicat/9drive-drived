import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { Outlet, useOutletContext, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  CheckCircle,
  ChevronDown,
  Cloud,
  FolderPlus,
  HardDrive,
  HelpCircle,
  History,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Sun,
  Trash2,
  Upload,
  X,
  Code2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { BrandLogo } from '@/components/drive/BrandLogo'
import { apiFetch, formatBytes } from '@/lib/api'
import { useUpload } from '@/context/UploadContext'
import { clearAuthSession, getStoredUser, updateStoredUser, type AuthUser } from '@/lib/auth'
import { getGravatarUrl } from '@/lib/gravatar'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'My Drive', icon: HardDrive, href: '/all-files' },
  { label: 'Shared with me', icon: Share2, href: '/shared' },
  { label: 'Recent', icon: History, href: '/recent' },
  { label: 'Starred', icon: Star, href: '/starred' },
  { label: 'Trash', icon: Trash2, href: '/trash' },
  { label: 'Storage', icon: Cloud, href: '/quota' },
  { label: 'Activity', icon: History, href: '/activity' },
  { label: 'Settings', icon: Settings, href: '/settings' },
  { label: 'API Keys', icon: Code2, href: '/api' },
]

type StorageSummary = {
  totalBytes: string
  usedBytes: string
  availableBytes: string
}

type ConnectedAccount = {
  id: string
  email: string
  provider: string
}

export type DriveLayoutContext = {
  setHeaderActions: (actions: ReactNode) => void
}

export function useDriveLayoutActions() {
  return useOutletContext<DriveLayoutContext>()
}

function SystemInfoDropdown({ storage, onClose }: { storage: any; onClose: () => void }) {
  const activeGoogle = storage?.accounts?.filter((a: any) => a.provider === 'google_drive' && a.status === 'connected') ?? []

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-[#E0E3E7] bg-white shadow-xl dark:border-[#36373A] dark:bg-[#1E1F20]">
        <div className="border-b border-[#E0E3E7] px-4 py-3 bg-[#F8FAFD] dark:border-[#36373A] dark:bg-[#28292A]">
          <p className="text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">System Status & Info</p>
          <p className="text-xs text-[#747775] dark:text-[#8E918F]">Storage gateway overview</p>
        </div>
        <div className="max-h-80 overflow-y-auto p-4 space-y-3.5 text-xs text-[#444746] dark:text-[#C4C7C5]">
          <div>
            <h4 className="font-medium text-[#1F1F1F] dark:text-[#E3E3E3] flex items-center gap-1.5 mb-1.5">
              <ShieldCheck className="h-4 w-4 text-[#0F9D58]" /> Connected Accounts
            </h4>
            <div className="rounded-lg bg-[#F8FAFD] p-2.5 border border-[#E0E3E7] dark:bg-[#28292A] dark:border-[#36373A]">
              <span className="font-medium">{activeGoogle.length} Google Drive account(s) connected</span>
              {activeGoogle.map((acc: any) => (
                <p key={acc.id} className="text-[11px] text-[#747775] truncate mt-0.5">• {acc.email}</p>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-[#1F1F1F] dark:text-[#E3E3E3] flex items-center gap-1.5 mb-1.5">
              <Cloud className="h-4 w-4 text-[#0B57D0]" /> Storage Engine
            </h4>
            <div className="rounded-lg bg-[#F8FAFD] p-2.5 border border-[#E0E3E7] dark:bg-[#28292A] dark:border-[#36373A] space-y-1 text-[11px]">
              <p>• <b>Storage Folder:</b> <code>9drive</code> on Google Drive</p>
              <p>• <b>Max Upload:</b> 5 GB per file stream</p>
              <p>• <b>Direct Streaming:</b> No local disk caching</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function SidebarNewButton({ onNewFolder, onUploadFile }: { onNewFolder: () => void; onUploadFile: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: globalThis.MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div className="relative mb-4 px-2" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-14 items-center gap-3 rounded-2xl bg-white px-5 text-sm font-medium text-[#1F1F1F] shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)] transition-all duration-200 ease-[cubic-bezier(0.05,0.7,0.1,1.0)] hover:shadow-[0_2px_6px_2px_rgba(60,64,67,0.15),0_1px_2px_0_rgba(60,64,67,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] dark:bg-[#28292A] dark:text-[#E3E3E3] dark:shadow-none dark:border dark:border-[#36373A]"
        aria-expanded={open}
        aria-label="Create new item"
      >
        {/* Google 4-colored plus icon */}
        <svg viewBox="0 0 36 36" className="h-8 w-8 shrink-0">
          <path fill="#4285F4" d="M16 16v14h4V16h14v-4H20V-2h-4v14H2v4h14z" />
          <path fill="#FBBC05" d="M30 16H20l-4-4V-2h4v14h10v4z" />
          <path fill="#4285F4" d="M-2 16h18v4H-2z" opacity="0" />
          <path fill="#34A853" d="M16 30h4v-14h-4z" />
          <path fill="#EA4335" d="M2 16h14v-4H2z" />
        </svg>
        <span className="text-sm font-medium pr-1">New</span>
      </button>

      {open && (
        <div className="absolute left-2 top-16 z-50 w-52 overflow-hidden rounded-2xl border border-[#E0E3E7] bg-white py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:border-[#36373A] dark:bg-[#1E1F20] dark:shadow-[0_12px_36px_rgba(0,0,0,0.6)] animate-m3-popover">
          <button
            type="button"
            className="flex h-10 w-full items-center gap-3 px-4 text-xs font-normal text-[#1F1F1F] transition-all duration-150 active:scale-[0.98] hover:bg-[#F0F4F9] dark:text-[#E3E3E3] dark:hover:bg-[#28292A]"
            onClick={() => {
              setOpen(false)
              onNewFolder()
            }}
          >
            <FolderPlus className="h-4 w-4 text-[#444746] dark:text-[#C4C7C5]" />
            <span>New folder</span>
          </button>
          <div className="my-1 h-px bg-[#E0E3E7] dark:bg-[#36373A]" />
          <button
            type="button"
            className="flex h-10 w-full items-center gap-3 px-4 text-xs font-normal text-[#1F1F1F] transition-all duration-150 active:scale-[0.98] hover:bg-[#F0F4F9] dark:text-[#E3E3E3] dark:hover:bg-[#28292A]"
            onClick={() => {
              setOpen(false)
              onUploadFile()
            }}
          >
            <Upload className="h-4 w-4 text-[#444746] dark:text-[#C4C7C5]" />
            <span>File upload</span>
          </button>
        </div>
      )}
    </div>
  )
}

function SidebarContent({
  onNavigate,
  user,
  storage,
  onLogout,
  onNewFolder,
  onUploadFile,
}: {
  onNavigate?: () => void
  user: AuthUser | null
  storage: StorageSummary | null
  onLogout: () => void
  onNewFolder: () => void
  onUploadFile: () => void
}) {
  const used = Number(storage?.usedBytes ?? 0)
  const total = Number(storage?.totalBytes ?? 0)
  const progress = total > 0 ? Math.min(100, (used / total) * 100) : 0

  return (
    <aside className="flex h-full w-64 flex-col bg-[#F8FAFD] p-3 dark:bg-[#131314]">
      {/* Google "+ New" Button */}
      <SidebarNewButton onNewFolder={onNewFolder} onUploadFile={onUploadFile} />

      {/* Navigation list */}
      <nav className="space-y-0.5 px-1">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.href}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex h-10 items-center gap-4 rounded-full px-4 text-sm font-medium transition-all duration-200 ease-[cubic-bezier(0.05,0.7,0.1,1.0)] active:scale-[0.98] select-none',
                isActive
                  ? 'bg-[#C2E7FF] text-[#001D35] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                  : 'text-[#444746] hover:bg-[#E9EEF6] dark:text-[#C4C7C5] dark:hover:bg-[#28292A]'
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Storage & Bottom user info */}
      <div className="mt-auto px-3 pt-4 border-t border-[#E0E3E7]/60 dark:border-[#36373A]/60">
        <NavLink
          to="/quota"
          onClick={onNavigate}
          className="group block rounded-xl p-2 transition-colors hover:bg-[#F0F4F9] dark:hover:bg-[#28292A]"
        >
          <div className="flex items-center gap-2 text-xs font-medium text-[#444746] dark:text-[#C4C7C5]">
            <Cloud className="h-4 w-4 text-[#0B57D0]" />
            <span>Storage</span>
          </div>
          <div className="mt-2 h-1 w-full rounded-full bg-[#E0E3E7] dark:bg-[#36373A] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#0B57D0] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-[#747775] dark:text-[#8E918F]">
            {formatBytes(storage?.usedBytes)} of {formatBytes(storage?.totalBytes)} used
          </p>
          <span className="mt-1 inline-block text-xs font-medium text-[#0B57D0] group-hover:underline dark:text-[#A8C7FA]">
            Manage storage
          </span>
        </NavLink>

        <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#E0E3E7]/40 dark:border-[#36373A]/40">
          <div className="min-w-0 flex-1 pr-2">
            <p className="truncate text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">{user?.name ?? 'User'}</p>
            <p className="truncate text-[11px] text-[#747775] dark:text-[#8E918F]">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            title="Log out"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#444746] hover:bg-[#F0F4F9] hover:text-[#B3261E] dark:text-[#C4C7C5] dark:hover:bg-[#28292A]"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

export function DriveLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchValue, setSearchValue] = useState(searchParams.get('q') ?? '')
  const [user, setUser] = useState<AuthUser | null>(getStoredUser())
  const [storage, setStorage] = useState<StorageSummary | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [headerActions, setHeaderActions] = useState<ReactNode>(null)
  const { uploadProgress, setUploadProgress, retryFailedUpload } = useUpload()
  const [uploadProgressCollapsed, setUploadProgressCollapsed] = useState(false)
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [avatarError, setAvatarError] = useState(false)

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('9drive:theme')
    if (saved === 'light' || saved === 'dark') return saved
    return 'light'
  })

  // Advanced search states
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterKind, setFilterKind] = useState(searchParams.get('kind') ?? '')
  const [filterAccountId, setFilterAccountId] = useState(searchParams.get('accountId') ?? '')
  const [filterMinSize, setFilterMinSize] = useState(() => {
    const min = searchParams.get('minSize')
    return min ? String(Math.round(Number(min) / (1024 * 1024))) : ''
  })
  const [filterMaxSize, setFilterMaxSize] = useState(() => {
    const max = searchParams.get('maxSize')
    return max ? String(Math.round(Number(max) / (1024 * 1024))) : ''
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
    localStorage.setItem('9drive:theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  }

  useEffect(() => {
    if (user?.email) {
      setAvatarError(false)
      getGravatarUrl(user.email, 64)
        .then(setProfileImageUrl)
        .catch(() => setProfileImageUrl(''))
    }
  }, [user?.email])

  async function loadSidebarStats() {
    await apiFetch<StorageSummary>('/storage/summary').then(setStorage).catch(() => undefined)
  }

  async function loadConnectedAccounts() {
    try {
      const data = await apiFetch<{ accounts: ConnectedAccount[] }>('/connected-accounts')
      setAccounts(data.accounts)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    setSearchValue(searchParams.get('q') ?? '')
    setFilterKind(searchParams.get('kind') ?? '')
    setFilterAccountId(searchParams.get('accountId') ?? '')
  }, [searchParams])

  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/auth/me')
      .then((data) => {
        setUser(data.user)
        updateStoredUser(data.user)
      })
      .catch(() => undefined)
    loadSidebarStats()
    loadConnectedAccounts()
    window.addEventListener('9drive:storage-changed', loadSidebarStats)
    return () => window.removeEventListener('9drive:storage-changed', loadSidebarStats)
  }, [])

  async function logout() {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined)
    clearAuthSession()
    navigate('/login')
  }

  function applyFilters() {
    const nextParams = new URLSearchParams()
    const activeFolderId = searchParams.get('folderId')
    if (activeFolderId && location.pathname === '/all-files') {
      nextParams.set('folderId', activeFolderId)
    }
    const q = searchValue.trim()
    if (q) nextParams.set('q', q)
    if (filterKind) nextParams.set('kind', filterKind)
    if (filterAccountId) nextParams.set('accountId', filterAccountId)

    if (filterMinSize) {
      const bytes = Number(filterMinSize) * 1024 * 1024
      if (!isNaN(bytes)) nextParams.set('minSize', String(bytes))
    }
    if (filterMaxSize) {
      const bytes = Number(filterMaxSize) * 1024 * 1024
      if (!isNaN(bytes)) nextParams.set('maxSize', String(bytes))
    }

    setFiltersOpen(false)
    navigate({ pathname: '/all-files', search: nextParams.toString() })
  }

  function clearFilters() {
    setFilterKind('')
    setFilterAccountId('')
    setFilterMinSize('')
    setFilterMaxSize('')
    setFiltersOpen(false)

    const nextParams = new URLSearchParams()
    const q = searchValue.trim()
    if (q) nextParams.set('q', q)
    navigate({ pathname: '/all-files', search: nextParams.toString() })
  }

  function searchFiles(event: FormEvent) {
    event.preventDefault()
    applyFilters()
  }

  function handleTriggerNewFolder() {
    if (location.pathname !== '/all-files') {
      navigate('/all-files')
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('9drive:open-new-folder'))
      }, 100)
    } else {
      window.dispatchEvent(new CustomEvent('9drive:open-new-folder'))
    }
  }

  function handleTriggerUpload() {
    if (location.pathname !== '/all-files') {
      navigate('/all-files')
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('9drive:open-upload'))
      }, 100)
    } else {
      window.dispatchEvent(new CustomEvent('9drive:open-upload'))
    }
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#F8FAFD] dark:bg-[#131314]">
      {/* 1. Google Drive Top Header (64px) */}
      <header className="flex h-16 w-full shrink-0 items-center justify-between px-4 bg-[#F8FAFD] dark:bg-[#131314] z-20">
        {/* Left: Hamburger + Google Drive Logo & Title */}
        <div className="flex items-center gap-3 w-60 shrink-0">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div
            onClick={() => navigate('/all-files')}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <BrandLogo className="h-10 w-10 shrink-0" />
            <span className="text-[22px] font-normal tracking-tight text-[#1F1F1F] dark:text-[#E3E3E3]">
              9Drive
            </span>
          </div>
        </div>

        {/* Center: Material 3 Search in Drive Pill */}
        <div className="relative flex-1 max-w-2xl px-2">
          <form
            onSubmit={searchFiles}
            className="relative flex items-center h-12 w-full rounded-full bg-[#EDF2FC] transition-all duration-200 ease-[cubic-bezier(0.05,0.7,0.1,1.0)] hover:bg-[#E9EEF6] focus-within:bg-white focus-within:shadow-[0_2px_8px_0_rgba(60,64,67,0.25)] focus-within:ring-2 focus-within:ring-[#0B57D0]/20 dark:bg-[#28292A] dark:hover:bg-[#333537] dark:focus-within:bg-[#1E1F20] dark:focus-within:ring-[#A8C7FA]/20"
          >
            <div className="flex h-full w-12 items-center justify-center text-[#444746] dark:text-[#C4C7C5]">
              <Search className="h-5 w-5" />
            </div>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search in Drive"
              className="h-full flex-1 bg-transparent text-sm text-[#1F1F1F] placeholder:text-[#444746] outline-none dark:text-[#E3E3E3] dark:placeholder:text-[#8E918F]"
            />
            {searchValue ? (
              <button
                type="button"
                onClick={() => {
                  setSearchValue('')
                  navigate('/all-files')
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full mr-1 text-[#444746] hover:bg-black/5 transition-colors dark:text-[#C4C7C5] dark:hover:bg-white/10',
                filtersOpen && 'text-[#0B57D0] bg-[#C2E7FF]/40'
              )}
              aria-label="Search options"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </form>

          {/* Advanced Search Popover */}
          {filtersOpen && (
            <div className="absolute left-2 right-2 top-14 z-50 rounded-2xl border border-[#E0E3E7] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.16)] dark:border-[#36373A] dark:bg-[#1E1F20] dark:shadow-[0_16px_48px_rgba(0,0,0,0.7)] animate-m3-popover">
              <div className="flex items-center justify-between border-b border-[#E0E3E7] pb-3 dark:border-[#36373A]">
                <span className="text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">Search options</span>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-medium text-[#0B57D0] hover:underline dark:text-[#A8C7FA]"
                >
                  Reset
                </button>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-[#444746] dark:text-[#C4C7C5] block mb-1">Type</label>
                  <Select
                    variant="sm"
                    value={filterKind}
                    onChange={(val) => setFilterKind(val)}
                    options={[
                      { value: '', label: 'Any' },
                      { value: 'doc', label: 'Documents' },
                      { value: 'pdf', label: 'PDFs' },
                      { value: 'image', label: 'Photos & images' },
                      { value: 'video', label: 'Videos' },
                      { value: 'archive', label: 'Archives' },
                    ]}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#444746] dark:text-[#C4C7C5] block mb-1">Storage Account</label>
                  <Select
                    variant="sm"
                    value={filterAccountId}
                    onChange={(val) => setFilterAccountId(val)}
                    options={[
                      { value: '', label: 'All accounts' },
                      ...accounts.map((acc) => ({
                        value: acc.id,
                        label: `${acc.email} (${acc.provider})`,
                      })),
                    ]}
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2 border-t border-[#E0E3E7] pt-3 dark:border-[#36373A]">
                <Button variant="ghost" size="sm" type="button" onClick={() => setFiltersOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="button" onClick={applyFilters}>
                  Search
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Header Utilities: Actions slot + Help + Settings + Theme + Profile */}
        <div className="flex items-center gap-1 shrink-0">
          {headerActions ? (
            <div className="hidden lg:flex items-center gap-2 mr-2">{headerActions}</div>
          ) : null}

          <div className="relative">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10"
              onClick={() => setInfoOpen(!infoOpen)}
              aria-label="Support & Info"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
            {infoOpen && <SystemInfoDropdown storage={storage} onClose={() => setInfoOpen(false)} />}
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10"
            onClick={() => navigate('/settings')}
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>

          {/* Profile Circle */}
          <div className="ml-1 pl-1">
            {!profileImageUrl || avatarError ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B57D0] text-xs font-medium text-white shadow-sm">
                {(user?.name ?? user?.email ?? 'U').trim().charAt(0).toUpperCase()}
              </div>
            ) : (
              <img
                src={profileImageUrl}
                alt="Profile"
                className="h-9 w-9 rounded-full object-cover border border-[#E0E3E7] dark:border-[#36373A]"
                onError={() => setAvatarError(true)}
              />
            )}
          </div>
        </div>
      </header>

      {/* 2. Main Body: Sidebar + Floating White Main Container */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block lg:h-full lg:shrink-0">
          <SidebarContent
            user={user}
            storage={storage}
            onLogout={logout}
            onNewFolder={handleTriggerNewFolder}
            onUploadFile={handleTriggerUpload}
          />
        </div>

        {/* Mobile Drawer */}
        <div
          className={cn(
            'fixed inset-0 z-40 bg-black/32 transition-opacity lg:hidden',
            sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
          onClick={() => setSidebarOpen(false)}
        />
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-64 transform bg-[#F8FAFD] shadow-2xl transition-transform duration-200 ease-out lg:hidden dark:bg-[#131314]',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <BrandLogo className="h-8 w-8" />
              <span className="text-xl font-normal text-[#1F1F1F] dark:text-[#E3E3E3]">9Drive</span>
            </div>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5]"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <SidebarContent
            user={user}
            storage={storage}
            onLogout={logout}
            onNavigate={() => setSidebarOpen(false)}
            onNewFolder={() => {
              setSidebarOpen(false)
              handleTriggerNewFolder()
            }}
            onUploadFile={() => {
              setSidebarOpen(false)
              handleTriggerUpload()
            }}
          />
        </div>

        {/* 3. Floating Content Surface (Google Drive Web Shell Card) */}
        <div className="flex-1 min-w-0 p-0 sm:pr-4 sm:pb-4 overflow-hidden">
          <main className="flex h-full w-full flex-col overflow-y-auto rounded-none sm:rounded-[24px] bg-white border-0 sm:border sm:border-[#E0E3E7] p-4 sm:p-6 shadow-sm dark:bg-[#1E1F20] dark:border-[#36373A]">
            <Outlet context={{ setHeaderActions } satisfies DriveLayoutContext} />
          </main>
        </div>
      </div>

      {/* Floating Upload Progress Box (Google Drive bottom right dock) */}
      {uploadProgress.open ? (
        <div className="fixed inset-x-3 bottom-3 z-[70] max-h-[70dvh] overflow-hidden rounded-2xl border border-[#E0E3E7] bg-white shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-6 sm:w-96 dark:border-[#36373A] dark:bg-[#1E1F20]">
          <div className="flex items-center justify-between border-b border-[#E0E3E7] px-4 py-3 bg-[#F8FAFD] dark:border-[#36373A] dark:bg-[#28292A]">
            <div className="flex items-center gap-2 text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
              {uploadProgress.status === 'done' ? (
                <CheckCircle className="h-4 w-4 text-[#0F9D58]" />
              ) : uploadProgress.status === 'partial' || uploadProgress.status === 'error' ? (
                <X className="h-4 w-4 text-[#D93025]" />
              ) : (
                <Upload className="h-4 w-4 text-[#0B57D0]" />
              )}
              <span>
                {uploadProgress.status === 'done'
                  ? 'Upload complete'
                  : uploadProgress.status === 'partial'
                  ? 'Completed with errors'
                  : uploadProgress.status === 'error'
                  ? 'Upload failed'
                  : uploadProgress.percent >= 99
                  ? 'Processing on Drive'
                  : 'Uploading...'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5]"
                onClick={() => setUploadProgressCollapsed(!uploadProgressCollapsed)}
              >
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform', uploadProgressCollapsed && 'rotate-180')}
                />
              </button>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5]"
                onClick={() => setUploadProgress((c) => ({ ...c, open: false }))}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          {!uploadProgressCollapsed && (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-[#444746] dark:text-[#C4C7C5]">
                <p className="truncate font-medium flex-1 pr-2">{uploadProgress.fileName}</p>
                <span>{uploadProgress.percent}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#E0E3E7] dark:bg-[#36373A] overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    uploadProgress.status === 'error' || uploadProgress.status === 'partial'
                      ? 'bg-[#D93025]'
                      : uploadProgress.status === 'done'
                      ? 'bg-[#0F9D58]'
                      : 'bg-[#0B57D0]'
                  )}
                  style={{ width: `${uploadProgress.percent}%` }}
                />
              </div>

              {uploadProgress.files.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-2 pt-1">
                  {uploadProgress.files.map((file, i) => (
                    <div
                      key={`${file.name}-${i}`}
                      className="flex items-center justify-between text-xs rounded-lg p-2 bg-[#F8FAFD] dark:bg-[#28292A]"
                    >
                      <span className="truncate flex-1 pr-2 font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                        {file.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {file.status === 'error' && (
                          <button
                            type="button"
                            onClick={() => retryFailedUpload(file.name)}
                            className="text-[#0B57D0] hover:underline font-medium text-[11px]"
                          >
                            Retry
                          </button>
                        )}
                        <span
                          className={cn(
                            'text-[11px]',
                            file.status === 'error'
                              ? 'text-[#D93025]'
                              : file.status === 'done'
                              ? 'text-[#0F9D58]'
                              : 'text-[#0B57D0]'
                          )}
                        >
                          {file.status === 'error'
                            ? 'Failed'
                            : file.status === 'done'
                            ? 'Done'
                            : `${file.percent}%`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
