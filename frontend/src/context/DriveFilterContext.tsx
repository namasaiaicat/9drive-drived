import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { apiFetch } from '@/lib/api'

export type ConnectedAccount = {
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

export type DriveFilterContextType = {
  accounts: ConnectedAccount[]
  selectedAccountId: string
  setSelectedAccountId: (id: string) => void
  activeAccount: ConnectedAccount | null
  isAll: boolean
  defaultAccountId: string
  setDefaultAccountId: (id: string) => void
  isLoadingAccounts: boolean
  accountsError: string
  refreshAccounts: () => Promise<void>
  getDriveLetter: (accountId: string) => string
}

const DriveFilterContext = createContext<DriveFilterContextType | undefined>(undefined)

const STORAGE_KEY = '9drive:selected-drive-id'
const DEFAULT_STORAGE_KEY = '9drive:default-drive-id'

export function DriveFilterProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [selectedAccountId, setSelectedAccountIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || ''
  })
  const [defaultAccountId, setDefaultAccountIdState] = useState<string>(() => {
    return localStorage.getItem(DEFAULT_STORAGE_KEY) || ''
  })
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)
  const [accountsError, setAccountsError] = useState('')
  const generation = useRef(0)

  async function loadAccounts() {
    const request = ++generation.current
    setIsLoadingAccounts(true)
    setAccountsError('')
    try {
      const data = await apiFetch<{ accounts: ConnectedAccount[] }>('/connected-accounts')
      if (request !== generation.current) return
      const connected = (data.accounts || []).filter((acc) => acc.status === 'connected')
      setAccounts(connected)

      // Resolve default account
      const savedDefault = localStorage.getItem(DEFAULT_STORAGE_KEY)
      let resolvedDefault = ''
      if (savedDefault === 'all') {
        resolvedDefault = 'all'
      } else if (savedDefault && connected.some((acc) => acc.id === savedDefault)) {
        resolvedDefault = savedDefault
      } else if (connected.length > 0) {
        resolvedDefault = connected[0].id
      } else {
        resolvedDefault = 'all'
      }
      setDefaultAccountIdState(resolvedDefault)

      // Resolve current selected account
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'all') {
        setSelectedAccountIdState('all')
      } else if (saved && connected.some((acc) => acc.id === saved)) {
        setSelectedAccountIdState(saved)
      } else {
        // Fallback to the default account!
        setSelectedAccountIdState(resolvedDefault)
        localStorage.setItem(STORAGE_KEY, resolvedDefault)
      }
    } catch (err) {
      if (request === generation.current) setAccountsError(err instanceof Error ? err.message : 'Failed to load accounts')
    } finally {
      if (request === generation.current) setIsLoadingAccounts(false)
    }
  }

  useEffect(() => {
    loadAccounts()
    function onStorageChanged() {
      loadAccounts()
    }
    window.addEventListener('9drive:accounts-changed', onStorageChanged)
    return () => { generation.current++; window.removeEventListener('9drive:accounts-changed', onStorageChanged) }
  }, [])

  function setSelectedAccountId(id: string) {
    setSelectedAccountIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
    window.dispatchEvent(new CustomEvent('9drive:filter-drive-changed', { detail: { accountId: id } }))
  }

  function setDefaultAccountId(id: string) {
    setDefaultAccountIdState(id)
    localStorage.setItem(DEFAULT_STORAGE_KEY, id)
    // Also update current active selection so user immediately sees the effect
    setSelectedAccountId(id)
    window.dispatchEvent(new CustomEvent('9drive:default-account-changed', { detail: { accountId: id } }))
  }

  function getDriveLetter(accountId: string): string {
    const idx = accounts.findIndex((acc) => acc.id === accountId)
    if (idx === -1) return ''
    return String.fromCharCode(65 + idx) // 0 -> A, 1 -> B, 2 -> C...
  }

  const isAll = selectedAccountId === 'all'
  const activeAccount = accounts.find((acc) => acc.id === selectedAccountId) || null

  return (
    <DriveFilterContext.Provider
      value={{
        accounts,
        selectedAccountId,
        setSelectedAccountId,
        activeAccount,
        isAll,
        defaultAccountId,
        setDefaultAccountId,
        isLoadingAccounts,
        accountsError,
        refreshAccounts: loadAccounts,
        getDriveLetter,
      }}
    >
      {children}
    </DriveFilterContext.Provider>
  )
}

export function useDriveFilter() {
  const context = useContext(DriveFilterContext)
  if (!context) {
    throw new Error('useDriveFilter must be used within a DriveFilterProvider')
  }
  return context
}
