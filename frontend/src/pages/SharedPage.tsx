import { useEffect, useState } from 'react'
import { Clock, Folder, Trash2, Users, UserCheck, Share2 } from 'lucide-react'
import { MetricCard } from '@/components/drive/MetricCard'
import { PageHeader } from '@/components/drive/PageHeader'
import { Button } from '@/components/ui/button'
import { FileIcon } from '@/components/drive/FileIcon'
import { apiFetch, formatBytes, formatDate } from '@/lib/api'
import { cn } from '@/lib/utils'

type InviteTarget = {
  id: string
  name: string
  type: 'file' | 'folder'
  mimeType?: string
  sizeBytes?: string
}

type Invite = {
  id: string
  email: string
  role: string
  status: string
  targetType: 'file' | 'folder'
  targetId: string
  target: InviteTarget | null
  createdAt: string
  acceptedAt: string | null
  user: { id: string; name: string; email: string } | null
}

function ResourceIcon({ type, mimeType }: { type: 'file' | 'folder'; mimeType?: string }) {
  if (type === 'folder') {
    return <Folder className="h-5 w-5 text-[#0B57D0]" />
  }
  return <FileIcon kind={mimeType ? mimeType.split('/')[0] : 'doc'} className="h-5 w-5" />
}

export function SharedPage() {
  const [sentInvites, setSentInvites] = useState<Invite[]>([])
  const [receivedInvites, setReceivedInvites] = useState<Invite[]>([])
  const [message, setMessage] = useState('')
  const pendingCount = sentInvites.filter((invite) => invite.status === 'pending').length
  const acceptedCount = sentInvites.filter((invite) => invite.status === 'accepted').length

  async function loadInvites() {
    const data = await apiFetch<{ sent: Invite[]; received: Invite[] }>('/invites')
    setSentInvites(data.sent)
    setReceivedInvites(data.received)
  }

  useEffect(() => {
    loadInvites().catch((error) =>
      setMessage(error instanceof Error ? error.message : 'Failed to load shared resources')
    )
    window.addEventListener('9drive:invites-changed', loadInvites)
    return () => window.removeEventListener('9drive:invites-changed', loadInvites)
  }, [])

  async function revokeInvite(id: string) {
    await apiFetch(`/invites/${id}`, { method: 'DELETE' })
    await loadInvites()
  }

  return (
    <div className="flex flex-col min-h-full w-full min-w-0">
      <PageHeader
        title="Shared with me"
        description="Files and folders shared with you or shared with team members."
      />

      {message ? (
        <p className="mt-3 rounded-lg bg-[#C2E7FF]/40 border border-[#C2E7FF] p-2.5 text-xs text-[#001D35] dark:bg-[#004A77]/40 dark:text-[#C2E7FF]">
          {message}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Shared Resources"
          value={String(sentInvites.length + receivedInvites.length)}
          icon={Users}
        />
        <MetricCard label="Collaborators" value={String(acceptedCount)} icon={UserCheck} />
        <MetricCard label="Pending Invites" value={String(pendingCount)} icon={Clock} />
      </div>

      {/* Shared With You */}
      <div className="mt-8">
        <h2 className="text-xs font-medium uppercase tracking-wider text-[#747775] dark:text-[#8E918F] mb-3">
          Shared with you
        </h2>
        {receivedInvites.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-[#E0E3E7] bg-[#F8FAFD] dark:border-[#36373A] dark:bg-[#28292A]">
            <Share2 className="h-8 w-8 text-[#747775] mb-2" />
            <p className="text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">No files shared with you</p>
            <p className="text-xs text-[#747775] mt-0.5">Files and folders people share with you will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {receivedInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-col gap-3 rounded-xl border border-[#E0E3E7] bg-white p-3.5 transition-colors hover:bg-[#F0F4F9] sm:flex-row sm:items-center sm:justify-between dark:border-[#36373A] dark:bg-[#1E1F20] dark:hover:bg-[#28292A]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <ResourceIcon type={invite.targetType} mimeType={invite.target?.mimeType} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                      {invite.target?.name ?? 'Unavailable resource'}
                    </p>
                    <p className="text-xs text-[#747775] capitalize dark:text-[#8E918F]">
                      {invite.targetType} • {invite.role}
                      {invite.target?.sizeBytes ? ` • ${formatBytes(invite.target.sizeBytes)}` : ''}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    'w-fit rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                    invite.status === 'accepted'
                      ? 'bg-[#C2E7FF] text-[#001D35] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                  )}
                >
                  {invite.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resources You Shared */}
      <div className="mt-8">
        <h2 className="text-xs font-medium uppercase tracking-wider text-[#747775] dark:text-[#8E918F] mb-3">
          Shared by you
        </h2>
        {sentInvites.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-[#E0E3E7] bg-[#F8FAFD] dark:border-[#36373A] dark:bg-[#28292A]">
            <Users className="h-8 w-8 text-[#747775] mb-2" />
            <p className="text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">No shared links</p>
            <p className="text-xs text-[#747775] mt-0.5">Use Share on any file or folder to collaborate with others.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {sentInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-col gap-3 rounded-xl border border-[#E0E3E7] bg-white p-3.5 transition-colors hover:bg-[#F0F4F9] sm:flex-row sm:items-center sm:justify-between dark:border-[#36373A] dark:bg-[#1E1F20] dark:hover:bg-[#28292A]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <ResourceIcon type={invite.targetType} mimeType={invite.target?.mimeType} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                      {invite.target?.name ?? 'Unavailable resource'}
                    </p>
                    <p className="truncate text-xs text-[#747775] dark:text-[#8E918F]">
                      Shared with {invite.email} • {invite.role}
                    </p>
                    <p className="text-[11px] text-[#747775] dark:text-[#8E918F]">
                      Invited {formatDate(invite.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                      invite.status === 'accepted'
                        ? 'bg-[#C2E7FF] text-[#001D35] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                    )}
                  >
                    {invite.status}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => revokeInvite(invite.id)}>
                    <Trash2 className="h-4 w-4 text-[#B3261E]" /> Revoke
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
