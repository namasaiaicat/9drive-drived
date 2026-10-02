import { useEffect, useState, useRef, type FormEvent } from 'react'
import { Bell, Check, Cloud, Database, Globe, HardDrive, Layers, Link2, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { DummyModal } from '@/components/drive/DummyModal'
import { GoogleOAuthAiHelper } from '@/components/drive/GoogleOAuthAiHelper'
import { apiFetch, formatBytes, API_URL } from '@/lib/api'
import { getGravatarUrl } from '@/lib/gravatar'
import { getStoredUser, getAccessToken, clearAuthSession } from '@/lib/auth'
import { useDriveFilter } from '@/context/DriveFilterContext'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/utils'

type ConnectedAccount = { id: string; provider: string; email: string; displayName?: string | null; status: string; storageAccount?: { totalBytes: string | null; usedBytes: string; availableBytes: string | null; lastSyncedAt: string | null } | null }

function providerLabel(provider: string) {
  if (provider === 's3') return 'S3 Storage'
  return 'Google Drive'
}

function storageLimitLabel(account: ConnectedAccount) {
  if (account.provider === 's3' && account.storageAccount?.totalBytes === null) return 'Unlimited'
  return formatBytes(account.storageAccount?.totalBytes)
}

function availableLabel(account: ConnectedAccount) {
  if (account.provider === 's3' && account.storageAccount?.availableBytes === null) return 'Unlimited'
  return formatBytes(account.storageAccount?.availableBytes)
}

export function SettingsPage() {
  const user = getStoredUser()
  const { defaultAccountId, setDefaultAccountId } = useDriveFilter()
  const { language, setLanguage, t } = useLanguage()
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const { toast } = useToast()
  const [connecting, setConnecting] = useState(false)
  const [s3Open, setS3Open] = useState(false)
  const [connectingS3, setConnectingS3] = useState(false)
  const [s3Form, setS3Form] = useState({ name: '', bucket: '', region: 'us-east-1', endpoint: '', accessKeyId: '', secretAccessKey: '', forcePathStyle: false, quotaBytes: '' })
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null)
  const [disconnectingAccountId, setDisconnectingAccountId] = useState<string | null>(null)
  const [accountToDisconnect, setAccountToDisconnect] = useState<ConnectedAccount | null>(null)
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [avatarError, setAvatarError] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [updatingSystem, setUpdatingSystem] = useState(false)
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [updateModalTitle, setUpdateModalTitle] = useState('')

  // Google OAuth Config states
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleClientSecret, setGoogleClientSecret] = useState('')
  const [googleRedirectUri, setGoogleRedirectUri] = useState('')
  const [defaultRedirectUri, setDefaultRedirectUri] = useState('')
  const [hasSecret, setHasSecret] = useState(false)
  const [savingGoogleConfig, setSavingGoogleConfig] = useState(false)
  const [showGoogleHelp, setShowGoogleHelp] = useState(false)

  // Live log polling states
  const [isPollingLog, setIsPollingLog] = useState(false)
  const [updateLog, setUpdateLog] = useState('')
  const [updateFinished, setUpdateFinished] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState<boolean | null>(null)
  const [reconnectCount, setReconnectCount] = useState(0)
  const logContainerRef = useRef<HTMLDivElement>(null)

  // Backup & Restore states
  const [downloadingBackup, setDownloadingBackup] = useState(false)
  const [restoringBackup, setRestoringBackup] = useState(false)
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [restoreMessage, setRestoreMessage] = useState('')
  const [restoreSuccess, setRestoreSuccess] = useState(false)

  async function downloadBackup() {
    setDownloadingBackup(true)
    try {
      const token = getAccessToken()
      const response = await fetch(`${API_URL}/system/backup`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) {
        const errJson = await response.json().catch(() => null)
        throw new Error(errJson?.message || 'Failed to retrieve database backup.')
      }

      // Read filename from Content-Disposition header if available
      const disposition = response.headers.get('Content-Disposition')
      let filename = '9drive-backup.json'
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, '').trim()
        }
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Backup downloaded successfully!')
    } catch (err: any) {
      toast.error('Failed to download backup: ' + err.message)
    } finally {
      setDownloadingBackup(false)
    }
  }

  function handleRestoreFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setRestoreFile(e.target.files[0])
      setRestoreMessage('')
    } else {
      setRestoreFile(null)
    }
  }

  async function restoreBackup() {
    if (!restoreFile) return
    if (!confirm(`WARNING: Restoring from "${restoreFile.name}" will overwrite current database records (accounts, folders, files, and users). Are you sure you want to proceed?`)) {
      return
    }

    setRestoringBackup(true)
    setRestoreMessage('')
    setRestoreSuccess(false)

    try {
      const token = getAccessToken()
      const formData = new FormData()
      formData.append('file', restoreFile)

      const response = await fetch(`${API_URL}/system/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Failed to restore database.')
      }

      setRestoreSuccess(true)
      setRestoreMessage(data.message || 'Database restored successfully! Logging you out to refresh your session...')
      toast.success('Database restored successfully!')

      setTimeout(() => {
        clearAuthSession()
        window.location.href = '/login'
      }, 3000)

    } catch (err: any) {
      setRestoreSuccess(false)
      const msg = err.message || 'Failed to restore database.'
      setRestoreMessage(msg)
      toast.error('Restore failed: ' + msg)
    } finally {
      setRestoringBackup(false)
    }
  }

  useEffect(() => {
    if (!isPollingLog) return

    let intervalId: any
    let active = true

    async function fetchLog() {
      try {
        const data = await apiFetch<{ log: string }>('/system/update-log')
        if (!active) return

        setUpdateLog(data.log)
        setReconnectCount(0)

        if (data.log.includes('=== System Update Completed:')) {
          setUpdateFinished(true)
          setUpdateSuccess(true)
          setIsPollingLog(false)
          setUpdateModalTitle('System Updated')
        }
      } catch (err) {
        if (!active) return
        setReconnectCount((prev) => prev + 1)
      }
    }

    fetchLog()
    intervalId = setInterval(fetchLog, 2000)

    return () => {
      active = false
      clearInterval(intervalId)
    }
  }, [isPollingLog])

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [updateLog])

  async function runSystemUpdate() {
    setUpdatingSystem(true)
    setUpdateLog('Initiating system update in the background...\n')
    setUpdateFinished(false)
    setUpdateSuccess(null)
    setReconnectCount(0)
    setUpdateModalTitle('System Updating')
    setUpdateModalOpen(true)

    try {
      await apiFetch<{ message: string }>('/system/update', { method: 'POST' })
      setIsPollingLog(true)
    } catch (error) {
      setUpdateModalTitle('System Update Failed')
      const errMsg = error instanceof Error ? error.message : 'System update failed to initiate.'
      setUpdateLog((prev) => prev + `\nError: ${errMsg}`)
      setUpdateFinished(true)
      setUpdateSuccess(false)
    } finally {
      setUpdatingSystem(false)
    }
  }

  async function saveGoogleConfig(event: FormEvent) {
    event.preventDefault()
    setSavingGoogleConfig(true)
    try {
      const res = await apiFetch<{ message: string }>('/system/google-config', {
        method: 'POST',
        body: JSON.stringify({
          clientId: googleClientId,
          clientSecret: googleClientSecret || undefined,
          redirectUri: googleRedirectUri || defaultRedirectUri,
        }),
      })
      toast.success(res.message || 'Google OAuth credentials saved.')
      setHasSecret(true)
      setGoogleClientSecret('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save Google OAuth configuration')
    } finally {
      setSavingGoogleConfig(false)
    }
  }

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? accounts[0] ?? null

  async function load() {
    const data = await apiFetch<{ accounts: ConnectedAccount[] }>('/connected-accounts')
    setAccounts(data.accounts)

    try {
      const configData = await apiFetch<{ exists: boolean; clientId: string; redirectUri: string; hasSecret: boolean; defaultRedirectUri: string }>('/system/google-config')
      if (configData.exists) {
        setGoogleClientId(configData.clientId || '')
        setGoogleRedirectUri(configData.redirectUri || '')
        setHasSecret(configData.hasSecret || false)
      }
      setDefaultRedirectUri(configData.defaultRedirectUri || '')
    } catch (e) {
      console.error('Failed to load global Google config', e)
    }
  }

  useEffect(() => {
    load().catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load settings'))
  }, [])

  useEffect(() => {
    setAvatarError(false)
    getGravatarUrl(user?.email, 96).then(setProfileImageUrl).catch(() => setProfileImageUrl(''))
  }, [user?.email])

  useEffect(() => {
    if (accounts.length === 0) {
      setSelectedAccountId('')
      return
    }
    if (!accounts.some((account) => account.id === selectedAccountId)) setSelectedAccountId(accounts[0].id)
  }, [accounts, selectedAccountId])

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.data?.type !== 'GOOGLE_CONNECTED') return
      if (event.data.status === 'success') {
        toast.success('Google Drive connected.')
      } else {
        toast.error('Google Drive connection failed.')
      }
      load().then(() => {
        window.dispatchEvent(new Event('9drive:storage-changed'))
        window.dispatchEvent(new Event('9drive:accounts-changed'))
      }).catch(() => undefined)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  async function connectDrive() {
    setConnecting(true)
    const popup = window.open('', 'google-drive-connect', 'width=540,height=720')
    if (popup) {
      popup.document.write('<html><head><title>Connecting...</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;color:#64748b;}</style></head><body><div style="text-align:center;"><h2>Connecting to Google...</h2><p>Please wait while we redirect you.</p></div></body></html>')
    }
    try {
      const data = await apiFetch<{ url: string }>('/connected-accounts/google/connect-url')
      if (popup) {
        popup.location.href = data.url
      } else {
        window.location.href = data.url
      }
    } catch (error) {
      if (popup) popup.close()
      toast.error(error instanceof Error ? error.message : 'Failed to start Google Drive connection')
    } finally {
      setConnecting(false)
    }
  }

  async function sync(accountId: string) {
    setSyncingAccountId(accountId)
    try {
      await apiFetch(`/connected-accounts/${accountId}/sync-quota`, { method: 'POST' })
      await load()
      window.dispatchEvent(new Event('9drive:storage-changed'))
    } finally {
      setSyncingAccountId(null)
    }
  }

  async function disconnect() {
    if (!accountToDisconnect) return
    setDisconnectingAccountId(accountToDisconnect.id)
    try {
      await apiFetch(`/connected-accounts/${accountToDisconnect.id}`, { method: 'DELETE' })
      setAccountToDisconnect(null)
      toast.success('Storage account disconnected.')
      await load()
      window.dispatchEvent(new Event('9drive:storage-changed'))
      window.dispatchEvent(new Event('9drive:accounts-changed'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to disconnect Google Drive account')
    } finally {
      setDisconnectingAccountId(null)
    }
  }

  async function connectS3(event: FormEvent) {
    event.preventDefault()
    setConnectingS3(true)
    try {
      await apiFetch('/connected-accounts/s3', { method: 'POST', body: JSON.stringify({ ...s3Form, endpoint: s3Form.endpoint || undefined, quotaBytes: s3Form.quotaBytes || null }) })
      setS3Open(false)
      setS3Form({ name: '', bucket: '', region: 'us-east-1', endpoint: '', accessKeyId: '', secretAccessKey: '', forcePathStyle: false, quotaBytes: '' })
      toast.success('S3 storage connected.')
      await load()
      window.dispatchEvent(new Event('9drive:storage-changed'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to connect S3 storage')
    } finally {
      setConnectingS3(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-[22px] font-normal tracking-tight text-[#1F1F1F] dark:text-[#E3E3E3]">
            Settings
          </h1>
          <p className="text-xs text-[#747775] dark:text-[#8E918F] mt-0.5">
            Manage your account, storage connections, and system settings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-full h-8 text-xs font-medium" onClick={() => setS3Open(true)}>
            <Database className="h-3.5 w-3.5" />
            Connect S3
          </Button>
          <Button size="sm" className="rounded-full h-8 text-xs font-medium" onClick={connectDrive} disabled={connecting}>
            <Link2 className="h-3.5 w-3.5" />
            {connecting ? 'Connecting...' : 'Connect Drive'}
          </Button>
        </div>
      </div>



      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="grid gap-4">
          {/* User Profile Card */}
          <Card className="rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] p-5">
            <div className="flex items-center gap-4">
              {!profileImageUrl || avatarError ? (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0B57D0] text-xl font-medium text-white shadow-xs">
                  {(user?.name ?? user?.email ?? 'U').trim().charAt(0).toUpperCase()}
                </div>
              ) : (
                <img
                  src={profileImageUrl}
                  alt="User avatar"
                  className="h-14 w-14 rounded-full object-cover border border-[#E0E3E7] dark:border-[#36373A]"
                  onError={() => setAvatarError(true)}
                />
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-medium text-[#1F1F1F] dark:text-[#E3E3E3] truncate">
                  {user?.name ?? 'User'}
                </h2>
                <p className="text-xs text-[#747775] dark:text-[#8E918F] mt-0.5 truncate">
                  {user?.email ?? '-'}
                </p>
                <span className="inline-block mt-1 text-[11px] font-medium text-[#0B57D0] dark:text-[#A8C7FA]">
                  Google Workspace Account
                </span>
              </div>
            </div>
          </Card>

          {/* Language Preference Card */}
          <Card className="rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <Globe className="h-5 w-5 text-[#0B57D0]" />
                  <h2 className="text-base font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                    {t('settings.language_title', 'Language / Bahasa')}
                  </h2>
                </div>
                <p className="mt-1 text-xs text-[#747775] dark:text-[#8E918F]">
                  {t('settings.language_desc', 'Select your preferred interface language.')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150',
                    language === 'en'
                      ? 'bg-[#0B57D0] text-white shadow-xs dark:bg-[#A8C7FA] dark:text-[#001D35]'
                      : 'border border-[#E0E3E7] text-[#444746] hover:bg-black/5 dark:border-[#36373A] dark:text-[#C4C7C5] dark:hover:bg-white/10'
                  )}
                >
                  {language === 'en' && <Check className="h-3.5 w-3.5" />}
                  <span>{t('settings.lang_en', 'English (Default)')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('id')}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150',
                    language === 'id'
                      ? 'bg-[#0B57D0] text-white shadow-xs dark:bg-[#A8C7FA] dark:text-[#001D35]'
                      : 'border border-[#E0E3E7] text-[#444746] hover:bg-black/5 dark:border-[#36373A] dark:text-[#C4C7C5] dark:hover:bg-white/10'
                  )}
                >
                  {language === 'id' && <Check className="h-3.5 w-3.5" />}
                  <span>{t('settings.lang_id', 'Bahasa Indonesia')}</span>
                </button>
              </div>
            </div>
          </Card>

          {/* Google Drive Connection Card */}
          <Card className="rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <Cloud className="h-5 w-5 text-[#0B57D0]" />
                  <h2 className="text-base font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                    {t('settings.google_title', 'Google Drive')}
                  </h2>
                </div>
                <p className="mt-1 text-xs text-[#747775] dark:text-[#8E918F]">
                  {t('settings.google_desc', 'Connect Google Drive accounts. 9Drive routes uploads to accounts with available quota.')}
                </p>
              </div>
              <Button
                className="rounded-full h-8 text-xs font-medium shrink-0"
                size="sm"
                onClick={connectDrive}
                disabled={connecting}
              >
                <Link2 className="h-3.5 w-3.5" />
                {connecting ? (language === 'id' ? 'Membuka...' : 'Opening...') : t('settings.connect_drive', 'Connect Drive')}
              </Button>
            </div>
          </Card>

          {/* S3 Compatible Storage Card */}
          <Card className="rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <Database className="h-5 w-5 text-[#0B57D0]" />
                  <h2 className="text-base font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">S3 Compatible Storage</h2>
                </div>
                <p className="mt-1 text-xs text-[#747775] dark:text-[#8E918F]">
                  Connect AWS S3, Cloudflare R2, MinIO, Wasabi, Backblaze B2, or custom endpoint storage.
                </p>
              </div>
              <Button
                className="rounded-full h-8 text-xs font-medium shrink-0"
                size="sm"
                variant="outline"
                onClick={() => setS3Open(true)}
              >
                <Database className="h-3.5 w-3.5" />
                Connect S3
              </Button>
            </div>
          </Card>

          {/* Akun Default Platform */}
          <Card className="rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <Layers className="h-5 w-5 text-[#0B57D0]" />
                  <h2 className="text-base font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                    Akun Default Platform
                  </h2>
                </div>
                <p className="mt-1 text-xs text-[#747775] dark:text-[#8E918F]">
                  Pilih akun Google Drive atau opsi default yang otomatis aktif setiap kali membuka 9Drive.
                </p>
              </div>
              <div className="w-full sm:w-64 shrink-0">
                <Select
                  variant="sm"
                  value={defaultAccountId}
                  onChange={(value) => {
                    setDefaultAccountId(value)
                    const label = value === 'all' ? 'Semua Akun' : (accounts.find((a) => a.id === value)?.email || value)
                    toast.success(`Akun default berhasil diatur ke: ${label}`)
                  }}
                  options={[
                    { value: 'all', label: 'Semua Akun (Tampilkan Seluruh File)' },
                    ...accounts.map((acc) => ({
                      value: acc.id,
                      label: acc.displayName ? `${acc.email} (${acc.displayName})` : acc.email,
                    })),
                  ]}
                />
              </div>
            </div>
          </Card>

          {/* Connected Storage Accounts */}
          <Card className="rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] p-5">
            <h2 className="text-base font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
              Connected Storage Accounts
            </h2>
            <div className="mt-3.5 grid gap-3">
              {accounts.length === 0 ? (
                <p className="text-xs text-[#747775] dark:text-[#8E918F]">
                  No connected storage account yet.
                </p>
              ) : (
                <>
                  <div className="grid gap-1.5 text-xs font-medium text-[#747775] dark:text-[#8E918F]">
                    <span>Select Account</span>
                    <Select
                      variant="sm"
                      value={selectedAccount?.id ?? ''}
                      onChange={(value) => setSelectedAccountId(value)}
                      options={accounts.map((account) => ({
                        value: account.id,
                        label: `${providerLabel(account.provider)} - ${account.displayName || account.email} (${account.status})${account.id === defaultAccountId ? ' [Default]' : ''}`,
                      }))}
                    />
                  </div>

                  {selectedAccount ? (
                    <div className="rounded-xl bg-[#F8FAFD] dark:bg-[#18191A] p-4 border border-[#E0E3E7] dark:border-[#36373A]">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="break-all font-medium text-sm text-[#1F1F1F] dark:text-[#E3E3E3]">
                              {selectedAccount.displayName || selectedAccount.email}
                            </p>
                            {selectedAccount.id === defaultAccountId && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F4EA] px-2 py-0.5 text-[10px] font-medium text-[#137333] dark:bg-[#0E3D1E] dark:text-[#A8DAB5]">
                                <Check className="h-3 w-3" />
                                Akun Default
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#747775] dark:text-[#8E918F] mt-0.5">
                            {providerLabel(selectedAccount.provider)} · {selectedAccount.status}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedAccount.id !== defaultAccountId && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full h-8 text-xs font-medium"
                              onClick={() => {
                                setDefaultAccountId(selectedAccount.id)
                                toast.success(`Akun ${selectedAccount.email} berhasil dijadikan sebagai akun default.`)
                              }}
                            >
                              Jadikan Default
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full h-8 text-xs font-medium"
                            onClick={() => sync(selectedAccount.id)}
                            disabled={syncingAccountId === selectedAccount.id}
                          >
                            <RefreshCw className={syncingAccountId === selectedAccount.id ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
                            {syncingAccountId === selectedAccount.id ? 'Syncing...' : 'Sync'}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            className="rounded-full h-8 text-xs font-medium"
                            onClick={() => setAccountToDisconnect(selectedAccount)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Disconnect
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-xl bg-white dark:bg-[#1E1F20] p-2.5 border border-[#E0E3E7] dark:border-[#36373A]">
                          <p className="font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">{formatBytes(selectedAccount.storageAccount?.usedBytes)}</p>
                          <p className="mt-0.5 text-[11px] text-[#747775] dark:text-[#8E918F]">Used</p>
                        </div>
                        <div className="rounded-xl bg-white dark:bg-[#1E1F20] p-2.5 border border-[#E0E3E7] dark:border-[#36373A]">
                          <p className="font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">{storageLimitLabel(selectedAccount)}</p>
                          <p className="mt-0.5 text-[11px] text-[#747775] dark:text-[#8E918F]">Total</p>
                        </div>
                        <div className="rounded-xl bg-white dark:bg-[#1E1F20] p-2.5 border border-[#E0E3E7] dark:border-[#36373A]">
                          <p className="font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">{availableLabel(selectedAccount)}</p>
                          <p className="mt-0.5 text-[11px] text-[#747775] dark:text-[#8E918F]">Free</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </Card>

          {/* Google OAuth Credentials */}
          <Card className="rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] p-5">
            <div className="flex items-center justify-between border-b border-[#E0E3E7] dark:border-[#36373A] pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <Cloud className="h-5 w-5 text-[#0B57D0]" />
                <h2 className="text-base font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">Google OAuth Credentials</h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full h-7 text-xs font-medium"
                type="button"
                onClick={() => setShowGoogleHelp(!showGoogleHelp)}
              >
                {showGoogleHelp ? 'Hide Guide' : 'Setup Guide'}
              </Button>
            </div>

            {showGoogleHelp && (
              <div className="mb-4">
                <GoogleOAuthAiHelper
                  redirectUri={googleRedirectUri || defaultRedirectUri}
                />
              </div>
            )}

            <form onSubmit={saveGoogleConfig} className="grid gap-3.5">
              <label className="grid gap-1.5 text-xs font-medium text-[#747775] dark:text-[#8E918F]">
                Client ID
                <input
                  className="h-10 rounded-xl border border-[#747775]/40 bg-white dark:bg-[#1E1F20] px-3 text-xs text-[#1F1F1F] dark:text-[#E3E3E3] focus:border-[#0B57D0] focus:outline-none"
                  placeholder="Enter Google Client ID"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  required
                />
              </label>

              <label className="grid gap-1.5 text-xs font-medium text-[#747775] dark:text-[#8E918F]">
                Client Secret {hasSecret && <span className="font-normal text-[#137333] dark:text-[#81C995]">(Configured)</span>}
                <input
                  className="h-10 rounded-xl border border-[#747775]/40 bg-white dark:bg-[#1E1F20] px-3 text-xs text-[#1F1F1F] dark:text-[#E3E3E3] focus:border-[#0B57D0] focus:outline-none"
                  type="password"
                  placeholder={hasSecret ? "••••••••••••••••••••••••" : "Enter Google Client Secret"}
                  value={googleClientSecret}
                  onChange={(e) => setGoogleClientSecret(e.target.value)}
                  required={!hasSecret}
                />
              </label>

              <label className="grid gap-1.5 text-xs font-medium text-[#747775] dark:text-[#8E918F]">
                Redirect URI (Optional)
                <input
                  className="h-10 rounded-xl border border-[#747775]/40 bg-white dark:bg-[#1E1F20] px-3 text-xs text-[#1F1F1F] dark:text-[#E3E3E3] focus:border-[#0B57D0] focus:outline-none"
                  placeholder={defaultRedirectUri}
                  value={googleRedirectUri}
                  onChange={(e) => setGoogleRedirectUri(e.target.value)}
                />
              </label>

              <div className="flex justify-end mt-1">
                <Button type="submit" disabled={savingGoogleConfig} size="sm" className="rounded-full">
                  {savingGoogleConfig ? 'Saving...' : 'Save Credentials'}
                </Button>
              </div>
            </form>
          </Card>

          {/* System Update */}
          <Card className="rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] p-5">
            <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <RefreshCw className="h-5 w-5 text-[#0B57D0]" />
                  <h2 className="text-base font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">System Update</h2>
                </div>
                <p className="mt-1 text-xs text-[#747775] dark:text-[#8E918F]">
                  Pull the latest release code from GitHub repository. Dev servers will automatically restart.
                </p>
              </div>
              <Button
                className="rounded-full h-8 text-xs font-medium shrink-0"
                variant="outline"
                size="sm"
                onClick={runSystemUpdate}
                disabled={updatingSystem}
              >
                <RefreshCw className={updatingSystem ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
                {updatingSystem ? 'Updating...' : 'Update Code'}
              </Button>
            </div>
          </Card>

          {/* Backup & Restore Database */}
          <Card className="rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] p-5">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#E0E3E7] dark:border-[#36373A] pb-3">
                <div className="flex items-center gap-2.5">
                  <Database className="h-5 w-5 text-[#0B57D0]" />
                  <h2 className="text-base font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">Backup & Restore Database</h2>
                </div>
                <span className="text-[11px] text-[#747775] dark:text-[#8E918F] font-medium uppercase tracking-wider">
                  System Database Snapshot
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Download Backup Section */}
                <div className="rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-[#F8FAFD] dark:bg-[#18191A] p-5 flex flex-col justify-between">
                  <div className="flex items-start gap-3.5">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-[#EDF2FC] dark:bg-[#004A77]/30 text-[#0B57D0] dark:text-[#A8C7FA] flex items-center justify-center">
                      <HardDrive className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">Download Backup</h3>
                      <p className="mt-1 text-xs text-[#747775] dark:text-[#8E918F]">
                        Export a full snapshot of your active database (users, connected accounts, folder hierarchy, and file metadata).
                      </p>
                    </div>
                  </div>
                  <Button
                    className="mt-5 w-full rounded-full"
                    onClick={downloadBackup}
                    disabled={downloadingBackup}
                  >
                    <HardDrive className={downloadingBackup ? 'h-4 w-4 animate-bounce' : 'h-4 w-4'} />
                    {downloadingBackup ? 'Downloading Backup...' : 'Download Backup'}
                  </Button>
                </div>

                {/* Restore Backup Section */}
                <div className="rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-[#F8FAFD] dark:bg-[#18191A] p-5 flex flex-col justify-between">
                  <div className="flex items-start gap-3.5">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-[#FEF7E0] dark:bg-[#724300]/30 text-[#B06000] dark:text-[#FDD663] flex items-center justify-center">
                      <RefreshCw className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">Restore Backup</h3>
                      <p className="mt-1 text-xs text-[#747775] dark:text-[#8E918F]">
                        Upload a previously saved 9Drive backup file (.json) to restore all database records.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    <input
                      type="file"
                      accept=".json,.db,.sql"
                      onChange={handleRestoreFileChange}
                      className="block w-full text-xs text-[#747775] file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-[#EDF2FC] file:text-[#0B57D0] hover:file:bg-[#D3E3FD] cursor-pointer border border-[#E0E3E7] dark:border-[#36373A] rounded-xl p-1 bg-white dark:bg-[#1E1F20]"
                    />
                    {restoreFile && (
                      <div className="flex items-center justify-between rounded-xl bg-white dark:bg-[#28292A] border border-[#E0E3E7] dark:border-[#36373A] px-3 py-1.5 text-xs">
                        <span className="truncate max-w-[200px] font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                          {restoreFile.name}
                        </span>
                        <span className="text-[11px] text-[#747775] dark:text-[#8E918F]">
                          {formatBytes(restoreFile.size)}
                        </span>
                      </div>
                    )}
                    <Button
                      variant={restoreFile ? "danger" : "outline"}
                      className="w-full rounded-full"
                      onClick={restoreBackup}
                      disabled={restoringBackup || !restoreFile}
                    >
                      <RefreshCw className={restoringBackup ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                      {restoringBackup ? 'Restoring Database...' : 'Restore Backup'}
                    </Button>
                  </div>
                </div>
              </div>

              {restoreMessage && (
                <p className={`rounded-xl px-4 py-2.5 text-xs font-medium ${
                  restoreSuccess
                    ? "bg-[#E6F4EA] text-[#137333] dark:bg-[#0F5223]/30 dark:text-[#81C995]"
                    : "bg-[#FCE8E6] text-[#C5221F] dark:bg-[#8C1D18]/30 dark:text-[#F28B82]"
                }`}>
                  {restoreMessage}
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Right Info Column */}
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 lg:gap-3 self-start">
          <Card className="rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] p-4">
            <HardDrive className="h-5 w-5 text-[#0B57D0]" />
            <h2 className="mt-2 text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">Storage</h2>
            <p className="mt-0.5 text-xs text-[#747775] dark:text-[#8E918F]">Connected accounts: {accounts.length}</p>
          </Card>
          <Card className="rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] p-4">
            <Bell className="h-5 w-5 text-[#0B57D0]" />
            <h2 className="mt-2 text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">Notifications</h2>
            <p className="mt-0.5 text-xs text-[#747775] dark:text-[#8E918F]">System and sync alerts are active.</p>
          </Card>
          <Card className="rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] p-4">
            <Globe className="h-5 w-5 text-[#0B57D0]" />
            <h2 className="mt-2 text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">Region</h2>
            <p className="mt-0.5 text-xs text-[#747775] dark:text-[#8E918F]">Workspace region: Local Gateway.</p>
          </Card>
        </div>
      </div>

      <DummyModal open={s3Open} title="Connect S3 Storage" description="Use any S3-compatible provider with custom endpoint support." onClose={() => setS3Open(false)}>
        <form className="grid gap-4" onSubmit={connectS3}>
          <input className="h-10 rounded-xl border border-[#747775]/40 bg-white dark:bg-[#1E1F20] px-3 text-xs text-[#1F1F1F] dark:text-[#E3E3E3]" placeholder="Display name" value={s3Form.name} onChange={(event) => setS3Form({ ...s3Form, name: event.target.value })} required />
          <input className="h-10 rounded-xl border border-[#747775]/40 bg-white dark:bg-[#1E1F20] px-3 text-xs text-[#1F1F1F] dark:text-[#E3E3E3]" placeholder="Bucket" value={s3Form.bucket} onChange={(event) => setS3Form({ ...s3Form, bucket: event.target.value })} required />
          <input className="h-10 rounded-xl border border-[#747775]/40 bg-white dark:bg-[#1E1F20] px-3 text-xs text-[#1F1F1F] dark:text-[#E3E3E3]" placeholder="Region" value={s3Form.region} onChange={(event) => setS3Form({ ...s3Form, region: event.target.value })} required />
          <input className="h-10 rounded-xl border border-[#747775]/40 bg-white dark:bg-[#1E1F20] px-3 text-xs text-[#1F1F1F] dark:text-[#E3E3E3]" placeholder="Endpoint URL (optional)" value={s3Form.endpoint} onChange={(event) => setS3Form({ ...s3Form, endpoint: event.target.value })} />
          <input className="h-10 rounded-xl border border-[#747775]/40 bg-white dark:bg-[#1E1F20] px-3 text-xs text-[#1F1F1F] dark:text-[#E3E3E3]" placeholder="Access key ID" value={s3Form.accessKeyId} onChange={(event) => setS3Form({ ...s3Form, accessKeyId: event.target.value })} required />
          <input className="h-10 rounded-xl border border-[#747775]/40 bg-white dark:bg-[#1E1F20] px-3 text-xs text-[#1F1F1F] dark:text-[#E3E3E3]" placeholder="Secret access key" type="password" value={s3Form.secretAccessKey} onChange={(event) => setS3Form({ ...s3Form, secretAccessKey: event.target.value })} required />
          <input className="h-10 rounded-xl border border-[#747775]/40 bg-white dark:bg-[#1E1F20] px-3 text-xs text-[#1F1F1F] dark:text-[#E3E3E3]" placeholder="Quota bytes (optional)" inputMode="numeric" value={s3Form.quotaBytes} onChange={(event) => setS3Form({ ...s3Form, quotaBytes: event.target.value })} />
          <label className="flex items-center gap-2 text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3]"><input type="checkbox" checked={s3Form.forcePathStyle} onChange={(event) => setS3Form({ ...s3Form, forcePathStyle: event.target.checked })} />Force path style</label>
          <div className="grid gap-3 sm:flex sm:justify-end"><Button variant="outline" type="button" className="rounded-full" onClick={() => setS3Open(false)} disabled={connectingS3}>Cancel</Button><Button type="submit" className="rounded-full" disabled={connectingS3}>{connectingS3 ? 'Connecting...' : 'Connect S3'}</Button></div>
        </form>
      </DummyModal>

      <DummyModal open={Boolean(accountToDisconnect)} title="Disconnect storage?" description="This will remove this storage account from 9Drive. Existing file records for this account may no longer be usable." onClose={() => setAccountToDisconnect(null)}>
        <div className="grid gap-4">
          <div className="rounded-xl bg-[#F8FAFD] dark:bg-[#18191A] p-4 text-xs text-[#444746] dark:text-[#C4C7C5] border border-[#E0E3E7] dark:border-[#36373A]">
            <p className="font-medium text-sm text-[#1F1F1F] dark:text-[#E3E3E3]">{accountToDisconnect?.email}</p>
            <p className="mt-1">Used storage: {formatBytes(accountToDisconnect?.storageAccount?.usedBytes)}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setAccountToDisconnect(null)} disabled={Boolean(disconnectingAccountId)}>Cancel</Button>
            <Button variant="danger" className="rounded-full" onClick={disconnect} disabled={Boolean(disconnectingAccountId)}><Trash2 className="h-3.5 w-3.5" />{disconnectingAccountId ? 'Disconnecting...' : 'Disconnect'}</Button>
          </div>
        </div>
      </DummyModal>

      <DummyModal
        open={updateModalOpen}
        title={updateModalTitle}
        description={
          updateFinished
            ? (updateSuccess ? 'System updated successfully' : 'Update failed')
            : 'Live installation logs'
        }
        className="max-w-2xl"
        onClose={() => {
          if (!updateFinished) {
            if (!confirm('The update is still running in the background. Close log viewer?')) {
              return
            }
          }
          setUpdateModalOpen(false)
          setIsPollingLog(false)
          if (updateFinished && updateSuccess) {
            window.location.reload()
          }
        }}
      >
        <div className="grid gap-4">
          <div
            ref={logContainerRef}
            className="relative rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-300 leading-relaxed border border-slate-800 h-80 overflow-y-auto select-text"
          >
            <pre className="whitespace-pre-wrap">{updateLog}</pre>
            {!updateFinished && (
              <div className="mt-3 flex items-center gap-2 text-blue-400">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>
                  {reconnectCount > 0
                    ? `Rebooting server and reconnecting... (attempt ${reconnectCount})`
                    : 'Installing updates...'}
                </span>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (!updateFinished) {
                  if (!confirm('The update is still running. Close log viewer?')) return
                }
                setUpdateModalOpen(false)
                setIsPollingLog(false)
                if (updateFinished && updateSuccess) {
                  window.location.reload()
                }
              }}
            >
              Close
            </Button>
            {updateFinished && updateSuccess && (
              <Button onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            )}
          </div>
        </div>
      </DummyModal>
    </div>
  )
}
