import { useEffect, useState } from 'react'
import { CheckCircle, Database, HardDrive, Link2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { PageHeader } from '@/components/drive/PageHeader'
import { apiFetch, formatBytes } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useToast } from '@/context/ToastContext'

type StorageSummary = { totalBytes: string; usedBytes: string; availableBytes: string }
type ConnectedAccount = {
  id: string
  email: string
  displayName?: string | null
  provider: string
  status: string
  storageAccount?: {
    totalBytes: string | null
    usedBytes: string
    availableBytes: string | null
    lastSyncedAt: string | null
  } | null
}
type RoutingMode = 'most_available' | 'round_robin' | 'priority'
type RoutingPolicy = { mode: RoutingMode; priorityAccountIds: string[]; roundRobinCursor: number }

function providerLabel(provider: string) {
  if (provider === 's3') return 'S3 Storage'
  return 'Google Drive'
}

function ProviderIcon({ provider }: { provider: string }) {
  const Icon = provider === 's3' ? Database : HardDrive
  return <Icon className="h-5 w-5" />
}

function storageLimitLabel(account: ConnectedAccount) {
  if (account.provider === 's3' && account.storageAccount?.totalBytes === null) return 'Unlimited'
  return formatBytes(account.storageAccount?.totalBytes)
}

function availableLabel(account: ConnectedAccount) {
  if (account.provider === 's3' && account.storageAccount?.availableBytes === null) return 'Unlimited'
  return formatBytes(account.storageAccount?.availableBytes)
}

function pct(account: ConnectedAccount) {
  const total = Number(account.storageAccount?.totalBytes ?? 0)
  const used = Number(account.storageAccount?.usedBytes ?? 0)
  return total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
}

export function QuotaTrackerPage() {
  const [summary, setSummary] = useState<StorageSummary | null>(null)
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [routingPolicy, setRoutingPolicy] = useState<RoutingPolicy>({
    mode: 'most_available',
    priorityAccountIds: [],
    roundRobinCursor: 0,
  })
  const { toast } = useToast()
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null)

  async function load() {
    const [summaryData, accountData, policyData] = await Promise.all([
      apiFetch<StorageSummary>('/storage/summary'),
      apiFetch<{ accounts: ConnectedAccount[] }>('/connected-accounts'),
      apiFetch<{ policy: RoutingPolicy }>('/storage/routing-policy'),
    ])
    setSummary(summaryData)
    setAccounts(accountData.accounts)
    setRoutingPolicy(policyData.policy)
  }

  async function refresh() {
    setRefreshing(true)
    try {
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load().catch((error) =>
      toast.error(error instanceof Error ? error.message : 'Failed to load quota tracker')
    )
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const timer = window.setInterval(() => load().catch(() => undefined), 35_000)
    return () => window.clearInterval(timer)
  }, [autoRefresh])

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.data?.type !== 'GOOGLE_CONNECTED') return
      if (event.data.status === 'success') {
        toast.success('Google Drive connected successfully.')
      } else {
        toast.error('Google Drive connection failed.')
      }
      load().catch(() => undefined)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  async function connectDrive() {
    const popup = window.open('', 'google-drive-connect', 'width=540,height=720')
    if (popup) {
      popup.document.write(
        '<html><head><title>Connecting...</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;color:#64748b;}</style></head><body><div style="text-align:center;"><h2>Connecting to Google...</h2><p>Please wait while we redirect you.</p></div></body></html>'
      )
    }
    try {
      const data = await apiFetch<{ url: string }>('/connected-accounts/google/connect-url')
      if (popup) {
        popup.location.href = data.url
      } else {
        window.location.href = data.url
      }
    } catch (e) {
      if (popup) popup.close()
      console.error('Failed to start Google Drive connection from Quota Tracker', e)
    }
  }

  async function sync(accountId: string) {
    setSyncingAccountId(accountId)
    try {
      await apiFetch(`/connected-accounts/${accountId}/sync-quota`, { method: 'POST' })
      await load()
    } finally {
      setSyncingAccountId(null)
    }
  }

  async function saveRoutingPolicy(nextPolicy: RoutingPolicy) {
    setRoutingPolicy(nextPolicy)
    const data = await apiFetch<{ policy: RoutingPolicy }>('/storage/routing-policy', {
      method: 'PATCH',
      body: JSON.stringify({ mode: nextPolicy.mode, priorityAccountIds: nextPolicy.priorityAccountIds }),
    })
    setRoutingPolicy(data.policy)
    toast.success('Upload routing policy updated.')
  }

  function orderedAccounts() {
    const byId = new Map(accounts.map((account) => [account.id, account]))
    const ordered = routingPolicy.priorityAccountIds
      .map((id) => byId.get(id))
      .filter((account): account is ConnectedAccount => Boolean(account))
    const orderedIds = new Set(ordered.map((account) => account.id))
    return [...ordered, ...accounts.filter((account) => !orderedIds.has(account.id))]
  }

  function moveAccount(accountId: string, direction: -1 | 1) {
    const ids = orderedAccounts().map((account) => account.id)
    const index = ids.indexOf(accountId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= ids.length) return
    const nextIds = [...ids]
    const [item] = nextIds.splice(index, 1)
    nextIds.splice(target, 0, item)
    saveRoutingPolicy({ ...routingPolicy, priorityAccountIds: nextIds }).catch((error) =>
      toast.error(error instanceof Error ? error.message : 'Failed to update routing policy')
    )
  }

  const totalUsed = Number(summary?.usedBytes ?? 0)
  const totalMax = Number(summary?.totalBytes ?? 0)
  const totalPercent = totalMax > 0 ? Math.min(100, Math.round((totalUsed / totalMax) * 100)) : 0

  return (
    <div className="flex flex-col min-h-full w-full min-w-0">
      <PageHeader
        title="Storage"
        description="Monitor combined Google Drive storage quota and routing."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setAutoRefresh(!autoRefresh)}>
              <CheckCircle className="h-4 w-4" /> Auto-refresh {autoRefresh ? 'On' : 'Off'}
            </Button>
            <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing}>
              <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button size="sm" onClick={connectDrive}>
              <Link2 className="h-4 w-4" /> Connect Drive
            </Button>
          </div>
        }
      />



      {/* Main Quota Overview Card */}
      <div className="mt-6 rounded-2xl border border-[#E0E3E7] bg-white p-6 dark:border-[#36373A] dark:bg-[#1E1F20]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-[#747775] dark:text-[#8E918F]">
              Total Storage Usage
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-normal text-[#1F1F1F] dark:text-[#E3E3E3]">
                {formatBytes(summary?.usedBytes)}
              </span>
              <span className="text-sm text-[#747775] dark:text-[#8E918F]">
                of {formatBytes(summary?.totalBytes)} used ({totalPercent}%)
              </span>
            </div>
          </div>
          <div className="text-xs text-[#747775] dark:text-[#8E918F]">
            <span>{accounts.length} connected account(s)</span>
          </div>
        </div>

        {/* Big Progress Bar */}
        <div className="mt-4 h-3 w-full rounded-full bg-[#E0E3E7] dark:bg-[#36373A] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#0B57D0] transition-all duration-300"
            style={{ width: `${totalPercent}%` }}
          />
        </div>
      </div>

      {/* Upload Routing Card */}
      <div className="mt-6 rounded-2xl border border-[#E0E3E7] bg-white p-5 dark:border-[#36373A] dark:bg-[#1E1F20]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-[#E0E3E7]/60 dark:border-[#36373A]/60">
          <div>
            <h2 className="text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
              Upload Routing Policy
            </h2>
            <p className="text-xs text-[#747775] dark:text-[#8E918F]">
              Define which connected Google Drive account receives uploads.
            </p>
          </div>
          <div className="w-full sm:w-60">
            <Select
              variant="sm"
              value={routingPolicy.mode}
              onChange={(value) =>
                saveRoutingPolicy({ ...routingPolicy, mode: value as RoutingMode }).catch(
                  (error) =>
                    toast.error(error instanceof Error ? error.message : 'Failed to update policy')
                )
              }
              options={[
                { value: 'most_available', label: 'Most available free space' },
                { value: 'round_robin', label: 'Round robin' },
                { value: 'priority', label: 'Priority order' },
              ]}
            />
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {orderedAccounts().map((account, index) => (
            <div
              key={account.id}
              className="flex items-center justify-between rounded-xl bg-[#F8FAFD] p-3 border border-[#E0E3E7]/60 dark:bg-[#28292A] dark:border-[#36373A]/60 text-xs"
            >
              <div className="flex items-center gap-3">
                <ProviderIcon provider={account.provider} />
                <div>
                  <p className="font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">{account.email}</p>
                  <p className="text-[#747775] dark:text-[#8E918F]">
                    {formatBytes(account.storageAccount?.usedBytes)} used • {availableLabel(account)} free
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveAccount(account.id, -1)}
                  disabled={index === 0}
                >
                  Up
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveAccount(account.id, 1)}
                  disabled={index === accounts.length - 1}
                >
                  Down
                </Button>
              </div>
            </div>
          ))}
          {accounts.length === 0 && (
            <p className="text-xs text-[#747775] py-2">No connected accounts yet.</p>
          )}
        </div>
      </div>

      {/* Connected Accounts Cards */}
      <div className="mt-6">
        <h2 className="text-xs font-medium uppercase tracking-wider text-[#747775] dark:text-[#8E918F] mb-3">
          Connected Accounts Detail
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map((account) => {
            const percent = pct(account)
            return (
              <div
                key={account.id}
                className="rounded-2xl border border-[#E0E3E7] bg-white p-5 dark:border-[#36373A] dark:bg-[#1E1F20]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EDF2FC] text-[#0B57D0] dark:bg-[#28292A] dark:text-[#A8C7FA]">
                      <ProviderIcon provider={account.provider} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                        {account.email}
                      </p>
                      <p className="text-xs text-[#747775] dark:text-[#8E918F]">
                        {providerLabel(account.provider)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => sync(account.id)}
                    disabled={syncingAccountId === account.id}
                    title="Sync Quota"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5]"
                  >
                    <RefreshCw
                      className={cn('h-4 w-4', syncingAccountId === account.id && 'animate-spin')}
                    />
                  </button>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-[#444746] dark:text-[#C4C7C5] mb-1.5">
                    <span>{formatBytes(account.storageAccount?.usedBytes)} used</span>
                    <span>{percent}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#E0E3E7] dark:bg-[#36373A] overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        percent >= 90 ? 'bg-[#D93025]' : percent >= 75 ? 'bg-[#FBBC04]' : 'bg-[#0B57D0]'
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-[#747775] dark:text-[#8E918F]">
                    <span>Total: {storageLimitLabel(account)}</span>
                    <span>Free: {availableLabel(account)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
