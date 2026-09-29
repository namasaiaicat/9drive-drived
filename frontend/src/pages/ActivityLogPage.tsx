import { useEffect, useState } from 'react'
import {
  History,
  Clock,
  Plus,
  Trash2,
  RefreshCw,
  Folder,
  FileText,
  Download,
  AlertTriangle,
  Move
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiFetch, formatDate } from '@/lib/api'
import { cn } from '@/lib/utils'

type AuditLog = {
  id: string
  action: string
  entityType: string
  entityId: string | null
  metadata: string | any | null
  createdAt: string
}

export function ActivityLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadLogs() {
    setLoading(true)
    setError('')
    try {
      const data = await apiFetch<{ logs: AuditLog[] }>('/audit-logs')
      setLogs(data.logs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs().catch(() => undefined)
  }, [])

  function getActionBadge(action: string) {
    const act = action.toUpperCase()
    if (act.includes('CREATE') || act.includes('UPLOAD')) {
      return {
        bg: 'bg-[#E6F4EA] text-[#137333] dark:bg-[#0F5223]/30 dark:text-[#81C995]',
        icon: Plus,
        label: action.replace(/_/g, ' ')
      }
    }
    if (act.includes('DELETE') || act.includes('PERMANENT') || act.includes('TRASH')) {
      return {
        bg: 'bg-[#FCE8E6] text-[#C5221F] dark:bg-[#8C1D18]/30 dark:text-[#F28B82]',
        icon: Trash2,
        label: action.replace(/_/g, ' ')
      }
    }
    if (act.includes('RESTORE') || act.includes('SYNC')) {
      return {
        bg: 'bg-[#FEF7E0] text-[#B06000] dark:bg-[#724300]/30 dark:text-[#FDD663]',
        icon: RefreshCw,
        label: action.replace(/_/g, ' ')
      }
    }
    if (act.includes('MOVE')) {
      return {
        bg: 'bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#174EA6]/30 dark:text-[#8AB4F8]',
        icon: Move,
        label: action.replace(/_/g, ' ')
      }
    }
    if (act.includes('DOWNLOAD')) {
      return {
        bg: 'bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#174EA6]/30 dark:text-[#8AB4F8]',
        icon: Download,
        label: action.replace(/_/g, ' ')
      }
    }
    return {
      bg: 'bg-[#F1F3F4] text-[#3C4043] dark:bg-[#303134] dark:text-[#BDC1C6]',
      icon: History,
      label: action.replace(/_/g, ' ')
    }
  }

  function renderMetadata(metadata: any) {
    if (!metadata) return null
    let parsed = metadata
    if (typeof metadata === 'string') {
      try {
        parsed = JSON.parse(metadata)
      } catch {
        return <span className="text-[#747775] dark:text-[#8E918F]">{metadata}</span>
      }
    }

    if (typeof parsed !== 'object') {
      return <span className="text-[#747775] dark:text-[#8E918F]">{String(parsed)}</span>
    }

    const parts: string[] = []
    if (parsed.name) parts.push(`Name: ${parsed.name}`)
    if (parsed.fileName) parts.push(`File: ${parsed.fileName}`)
    if (parsed.folderName) parts.push(`Folder: ${parsed.folderName}`)
    if (parsed.count !== undefined) parts.push(`Count: ${parsed.count}`)
    if (parsed.sizeBytes !== undefined) {
      const bytes = Number(parsed.sizeBytes)
      parts.push(`Size: ${formatBytes(bytes)}`)
    }

    if (parts.length > 0) {
      return <span className="text-xs text-[#747775] dark:text-[#8E918F] font-medium">{parts.join(' · ')}</span>
    }

    return <span className="text-xs text-[#747775] dark:text-[#8E918F] font-mono">{JSON.stringify(parsed)}</span>
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-[22px] font-normal tracking-tight text-[#1F1F1F] dark:text-[#E3E3E3]">
            Activity Log
          </h1>
          <p className="text-xs text-[#747775] dark:text-[#8E918F] mt-0.5">
            Audit trail of file activities, moves, syncs, and deletions.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="rounded-full h-8 text-xs font-medium"
          onClick={loadLogs}
          disabled={loading}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <Card className="overflow-hidden rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20]">
        <div className="border-b border-[#E0E3E7] dark:border-[#36373A] bg-[#F8FAFD] dark:bg-[#18191A] px-6 py-3.5">
          <h2 className="text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3] flex items-center gap-2">
            <History className="h-4 w-4 text-[#747775] dark:text-[#8E918F]" />
            Recent Activity Trail
          </h2>
        </div>

        <div className="divide-y divide-[#E0E3E7] dark:divide-[#36373A]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#747775] dark:text-[#8E918F]">
              <RefreshCw className="h-7 w-7 animate-spin text-[#0B57D0] mb-2" />
              <p className="text-sm">Loading activity logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#747775] dark:text-[#8E918F]">
              <History className="h-12 w-12 stroke-[1.5] mb-3 text-[#C4C7C5] dark:text-[#444746]" />
              <p className="font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">No activity yet</p>
              <p className="text-xs text-[#747775] dark:text-[#8E918F] mt-1">Actions you perform on files and folders will appear here.</p>
            </div>
          ) : (
            logs.map((log) => {
              const badge = getActionBadge(log.action)
              const EntityIcon = log.entityType === 'folder' ? Folder : FileText

              return (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 hover:bg-[#F8FAFD] dark:hover:bg-[#282A2C] transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-full shrink-0", badge.bg)}>
                      <badge.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#E0E3E7] dark:border-[#444746] bg-white dark:bg-[#1E1F20] text-[#1F1F1F] dark:text-[#E3E3E3]">
                          {badge.label}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-[#747775] dark:text-[#8E918F]">
                          <EntityIcon className="h-3.5 w-3.5" />
                          <span className="capitalize">{log.entityType}</span>
                        </div>
                      </div>
                      <div className="mt-1.5 flex flex-col gap-0.5">
                        {renderMetadata(log.metadata)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-[#747775] dark:text-[#8E918F] self-end sm:self-center shrink-0">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatDate(log.createdAt)}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>
    </div>
  )
}
