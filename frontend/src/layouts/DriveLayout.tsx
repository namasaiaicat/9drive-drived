import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Outlet, useOutletContext, NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
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
  Settings,
  Share2,
  ShieldCheck,
  Star,
  Sun,
  Trash2,
  Upload,
  X,
  Code2,
  Sparkles,
  Globe,
  WifiOff,
} from 'lucide-react'
import { BrandLogo } from '@/components/drive/BrandLogo'
import { DriveSearchBar } from '@/components/drive/DriveSearchBar'
import { apiFetch, formatBytes } from '@/lib/api'
import { useUpload } from '@/context/UploadContext'
import { useLanguage } from '@/context/LanguageContext'
import { clearAuthSession, getStoredUser, updateStoredUser, type AuthUser } from '@/lib/auth'
import { getGravatarUrl } from '@/lib/gravatar'
import { cn } from '@/lib/utils'
import { DriveAccountSelector } from '@/components/drive/DriveAccountSelector'
import { useDialogFocus } from '@/hooks/useDialogFocus'
import { useMenuFocus } from '@/hooks/useMenuFocus'

const navItemDefs = [
  { key: 'nav.my_drive', defaultLabel: 'My Drive', icon: HardDrive, href: '/all-files' },
  { key: 'nav.tools', defaultLabel: 'Tools Studio', icon: Sparkles, href: '/tools' },
  { key: 'nav.shared', defaultLabel: 'Shared with me', icon: Share2, href: '/shared' },
  { key: 'nav.recent', defaultLabel: 'Recent', icon: History, href: '/recent' },
  { key: 'nav.starred', defaultLabel: 'Starred', icon: Star, href: '/starred' },
  { key: 'nav.trash', defaultLabel: 'Trash', icon: Trash2, href: '/trash' },
  { key: 'nav.storage', defaultLabel: 'Storage', icon: Cloud, href: '/quota' },
  { key: 'nav.activity', defaultLabel: 'Activity', icon: History, href: '/activity' },
  { key: 'nav.settings', defaultLabel: 'Settings', icon: Settings, href: '/settings' },
  { key: 'nav.api_keys', defaultLabel: 'API Keys', icon: Code2, href: '/api' },
]

type StorageSummary = {
  totalBytes: string
  usedBytes: string
  availableBytes: string
}


export type DriveLayoutContext = {
  setHeaderActions: (actions: ReactNode) => void
}

export function useDriveLayoutActions() {
  return useOutletContext<DriveLayoutContext>()
}

function SystemInfoDropdown({ storage, onClose }: { storage: any; onClose: () => void }) {
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }; document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close) }, [onClose])
  const activeGoogle = storage?.accounts?.filter((a: any) => a.provider === 'google_drive' && a.status === 'connected') ?? []

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-[#E0E3E7] bg-white shadow-xl dark:border-[#36373A] dark:bg-[#1E1F20]">
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
              <p>• Upload limits are configured by your administrator.</p>
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
  const menuRef = useMenuFocus(open, () => setOpen(false))
  const ref = useRef<HTMLDivElement>(null)
  const { t } = useLanguage()

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
        <span className="text-sm font-medium pr-1">{t('action.new', 'New')}</span>
      </button>

      {open && (
        <div ref={menuRef} data-menu-surface className="absolute left-2 top-16 z-50 w-52 overflow-hidden rounded-2xl border border-[#E0E3E7] bg-white py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:border-[#36373A] dark:bg-[#1E1F20] dark:shadow-[0_12px_36px_rgba(0,0,0,0.6)] animate-m3-popover">
          <button
            type="button"
            className="flex h-10 w-full items-center gap-3 px-4 text-xs font-normal text-[#1F1F1F] transition-all duration-150 active:scale-[0.98] hover:bg-[#F0F4F9] dark:text-[#E3E3E3] dark:hover:bg-[#28292A]"
            onClick={() => {
              setOpen(false)
              onNewFolder()
            }}
          >
            <FolderPlus className="h-4 w-4 text-[#444746] dark:text-[#C4C7C5]" />
            <span>{t('action.new_folder', 'New folder')}</span>
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
            <span>{t('action.file_upload', 'File upload')}</span>
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
  const { t, language } = useLanguage()
  const used = Number(storage?.usedBytes ?? 0)
  const total = Number(storage?.totalBytes ?? 0)
  const progress = total > 0 ? Math.min(100, (used / total) * 100) : 0

  return (
    <aside className="flex h-full w-64 flex-col bg-[#F8FAFD] p-3 dark:bg-[#131314]">
      {/* Google "+ New" Button */}
      <SidebarNewButton onNewFolder={onNewFolder} onUploadFile={onUploadFile} />

      {/* Navigation list */}
      <nav className="space-y-0.5 px-1">
        {navItemDefs.map((item) => (
          <NavLink
            key={item.key}
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
            <span className="truncate">{t(item.key, item.defaultLabel)}</span>
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
            <span>{t('nav.storage', 'Storage')}</span>
          </div>
          <div className="mt-2 h-1 w-full rounded-full bg-[#E0E3E7] dark:bg-[#36373A] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#0B57D0] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-[#747775] dark:text-[#8E918F]">
            {formatBytes(storage?.usedBytes)} {language === 'id' ? 'dari' : 'of'} {formatBytes(storage?.totalBytes)} {language === 'id' ? 'terpakai' : 'used'}
          </p>
          <span className="mt-1 inline-block text-xs font-medium text-[#0B57D0] group-hover:underline dark:text-[#A8C7FA]">
            {language === 'id' ? 'Kelola penyimpanan' : 'Manage storage'}
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
            title={t('nav.sign_out', 'Sign out')}
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(getStoredUser())
  const [storage, setStorage] = useState<StorageSummary | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const drawerRef = useDialogFocus(sidebarOpen, () => setSidebarOpen(false))
  const [headerActions, setHeaderActions] = useState<ReactNode>(null)
  const { uploadProgress, setUploadProgress, retryFailedUpload } = useUpload()
  const [uploadProgressCollapsed, setUploadProgressCollapsed] = useState(false)
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [avatarError, setAvatarError] = useState(false)
  const { language, setLanguage } = useLanguage()
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
    }
    function handleOffline() {
      setIsOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('9drive:theme')
    if (saved === 'light' || saved === 'dark') return saved
    return 'light'
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
    root.style.colorScheme = theme
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

  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/auth/me')
      .then((data) => {
        setUser(data.user)
        updateStoredUser(data.user)
      })
      .catch(() => undefined)
    loadSidebarStats()
    window.addEventListener('9drive:storage-changed', loadSidebarStats)
    return () => window.removeEventListener('9drive:storage-changed', loadSidebarStats)
  }, [])

  async function logout() {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined)
    clearAuthSession()
    navigate('/login')
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
      <a href="#drive-main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-[100] focus:rounded-lg focus:bg-white focus:p-3 focus:text-[#0B57D0]">{language === 'id' ? 'Lewati ke konten' : 'Skip to content'}</a>
      <header className="relative z-40 flex min-h-16 w-full shrink-0 flex-wrap items-center gap-y-2 bg-[#F8FAFD] px-3 py-2 xl:h-16 xl:flex-nowrap xl:px-4 xl:py-0 dark:bg-[#131314]">
        {/* Left: Hamburger + Google Drive Logo & Title */}
        <div className="order-1 flex shrink-0 items-center gap-2 xl:w-60">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link
            to="/all-files"
            aria-label={language === 'id' ? '9Drive, Drive Saya' : '9Drive, My Drive'}
            className="flex items-center gap-2.5 select-none"
          >
            <BrandLogo className="h-10 w-10 shrink-0" />
            <span className="hidden text-[22px] font-normal tracking-tight text-[#1F1F1F] sm:inline dark:text-[#E3E3E3]">
              9Drive
            </span>
          </Link>
        </div>

        {/* Center: Material 3 Search in Drive with Dropdown */}
        <DriveSearchBar />

        {/* Right Header Utilities: Account Selector + Actions slot + Help + Settings + Theme + Profile */}
        <div className="order-2 ml-auto flex shrink-0 items-center gap-1 xl:order-4">

          {headerActions ? (
            <div className="hidden xl:flex items-center gap-2 mr-1">{headerActions}</div>
          ) : null}

          <div className="relative hidden xl:block">
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
            className="hidden h-11 w-11 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 xl:flex dark:text-[#C4C7C5] dark:hover:bg-white/10"
            onClick={() => navigate('/settings')}
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>

          <details className="relative xl:hidden" onKeyDown={(event) => { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus() } }}>
            <summary aria-label={language === 'id' ? 'Pengaturan dan bantuan' : 'Settings and help'} className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5]">
              <Settings className="h-5 w-5" />
            </summary>
            <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-[#E0E3E7] bg-white p-2 shadow-lg dark:border-[#36373A] dark:bg-[#1E1F20]">
              <button className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm hover:bg-[#F0F4F9] dark:text-[#E3E3E3] dark:hover:bg-[#28292A]" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); navigate('/settings') }}><Settings className="h-5 w-5" />{language === 'id' ? 'Pengaturan' : 'Settings'}</button>
              <button className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm hover:bg-[#F0F4F9] dark:text-[#E3E3E3] dark:hover:bg-[#28292A]" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); setInfoOpen(true) }}><HelpCircle className="h-5 w-5" />{language === 'id' ? 'Bantuan dan info' : 'Help and info'}</button>
            </div>
          </details>
          {infoOpen && <div className="relative xl:hidden"><SystemInfoDropdown storage={storage} onClose={() => setInfoOpen(false)} /></div>}

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'id' : 'en')}
            className="flex h-11 items-center gap-1.5 rounded-full border border-[#E0E3E7] px-2.5 text-xs font-medium text-[#444746] transition-colors hover:bg-black/5 dark:border-[#36373A] dark:text-[#C4C7C5] dark:hover:bg-white/10 select-none"
            aria-label="Toggle language"
            title={language === 'en' ? 'Ganti ke Bahasa Indonesia' : 'Switch to English'}
          >
            <Globe className="h-3.5 w-3.5 text-[#0B57D0] dark:text-[#A8C7FA]" />
            <span className="uppercase tracking-wider">{language}</span>
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
        <div className="order-3 flex min-w-0 shrink-0 items-center gap-2 pr-2 xl:pr-0">
          <DriveAccountSelector />
          <div className="flex gap-2 xl:hidden">{headerActions}</div>
        </div>
      </header>

      {/* Offline Alert Banner (Material 3 Warning / Error Style) */}
      {!isOnline && (
        <div className="w-full bg-[#B3261E] dark:bg-[#F2B8B5] text-white dark:text-[#601410] px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm font-medium shadow-md transition-all duration-300 z-30">
          <div className="flex items-center gap-2.5">
            <WifiOff className="h-4 w-4 shrink-0 animate-pulse" />
            <span>
              {language === 'id'
                ? 'Tidak ada koneksi internet. Silakan aktifkan Wi-Fi atau internet Anda agar 9Drive dapat mengakses cloud storage.'
                : 'No internet connection. Please enable Wi-Fi or internet connection to allow 9Drive to access cloud storage.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="ml-3 shrink-0 rounded-full bg-white/20 hover:bg-white/30 dark:bg-black/10 dark:hover:bg-black/20 px-3 py-1 text-xs font-semibold transition-colors"
          >
            {language === 'id' ? 'Coba Lagi' : 'Retry'}
          </button>
        </div>
      )}

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
        {sidebarOpen && <><div
          className="fixed inset-0 z-50 bg-black/32 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label={language === 'id' ? 'Navigasi' : 'Navigation'}
          tabIndex={-1}
          className="fixed inset-y-0 left-0 z-[60] flex w-64 max-w-[90vw] flex-col bg-[#F8FAFD] shadow-2xl lg:hidden dark:bg-[#131314]"
        >
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <BrandLogo className="h-8 w-8" />
              <span className="text-xl font-normal text-[#1F1F1F] dark:text-[#E3E3E3]">9Drive</span>
            </div>
            <button
              type="button"
              aria-label={language === 'id' ? 'Tutup navigasi' : 'Close navigation'}
              className="flex h-11 w-11 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5]"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1"><SidebarContent
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
          /></div>
        </div></>}

        {/* 3. Floating Content Surface (Google Drive Web Shell Card) */}
        <div className="flex-1 min-w-0 p-0 sm:pr-4 sm:pb-4 overflow-hidden">
          <main id="drive-main" tabIndex={-1} className="flex h-full w-full flex-col overflow-y-auto rounded-none sm:rounded-[24px] bg-white p-4 sm:p-6 dark:bg-[#1E1F20]">
            <Outlet context={{ setHeaderActions } satisfies DriveLayoutContext} />
          </main>
        </div>
      </div>

      {/* Floating Upload Progress Box (Google Drive bottom right dock) */}
      {uploadProgress.open ? (
        <div className="fixed inset-x-3 bottom-3 z-[70] max-h-[70dvh] overflow-hidden rounded-2xl border border-[#E0E3E7] bg-white shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-6 sm:w-96 dark:border-[#36373A] dark:bg-[#1E1F20] transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between border-b border-[#E0E3E7] px-4 py-3 bg-[#F8FAFD] dark:border-[#36373A] dark:bg-[#28292A]">
            <div className="flex items-center gap-2 text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
              {uploadProgress.status === 'done' ? (
                <CheckCircle className="h-4 w-4 text-[#0F9D58]" />
              ) : uploadProgress.status === 'partial' || uploadProgress.status === 'error' ? (
                <X className="h-4 w-4 text-[#D93025]" />
              ) : (
                <Upload className="h-4 w-4 text-[#0B57D0]" />
              )}
              <span role="status" aria-live="polite">
                {uploadProgress.status === 'done'
                  ? (language === 'id' ? 'Upload selesai' : 'Upload complete')
                  : uploadProgress.status === 'partial'
                  ? (language === 'id' ? 'Selesai dengan kesalahan' : 'Completed with errors')
                  : uploadProgress.status === 'error'
                  ? (language === 'id' ? 'Upload gagal' : 'Upload failed')
                  : uploadProgress.percent >= 99
                  ? (language === 'id' ? 'Diproses di Drive' : 'Processing on Drive')
                  : (language === 'id' ? 'Mengunggah…' : 'Uploading…')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={language === 'id' ? 'Buka atau ciutkan progres upload' : 'Expand or collapse upload progress'}
                aria-expanded={!uploadProgressCollapsed}
                className="flex h-11 w-11 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10"
                onClick={() => setUploadProgressCollapsed(!uploadProgressCollapsed)}
              >
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform', uploadProgressCollapsed && 'rotate-180')}
                />
              </button>
              <button
                type="button"
                aria-label={language === 'id' ? 'Tutup progres upload' : 'Close upload progress'}
                className="flex h-11 w-11 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10"
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
              <div role="progressbar" aria-label={language === 'id' ? 'Progres upload' : 'Upload progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress.percent} className="h-1.5 w-full rounded-full bg-[#E0E3E7] dark:bg-[#36373A] overflow-hidden">
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
                            className="min-h-11 px-2 text-sm text-[#0B57D0] hover:underline dark:text-[#A8C7FA]"
                          >
                            {language === 'id' ? 'Coba lagi' : 'Retry'}
                          </button>
                        )}
                        <span
                          className={cn(
                            'text-[11px]',
                            file.status === 'error'
                              ? 'text-[#B3261E] dark:text-[#F2B8B5]'
                              : file.status === 'done'
                              ? 'text-[#137333] dark:text-[#81C995]'
                              : 'text-[#0B57D0] dark:text-[#A8C7FA]'
                          )}
                        >
                          {file.status === 'error'
                            ? (language === 'id' ? 'Gagal' : 'Failed')
                            : file.status === 'done'
                            ? (language === 'id' ? 'Selesai' : 'Done')
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
