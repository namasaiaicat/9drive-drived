import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Lock,
  Globe,
  Link2,
  Check,
  ExternalLink,
  Loader2,
  ChevronDown,
  X,
  UserPlus,
  Settings,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'
import { getStoredUser, type AuthUser } from '@/lib/auth'
import { getGravatarUrl } from '@/lib/gravatar'
import { cn } from '@/lib/utils'
import { useToast } from '@/context/ToastContext'

export type ShareFileTarget = {
  id?: string
  name: string
  driveUrl?: string | null
  provider?: string
  mimeType?: string
  type?: 'file' | 'folder'
}

type PermissionsResponse = {
  fileId?: string
  folderId?: string
  name?: string
  provider?: string
  generalAccess: 'restricted' | 'anyone'
  role: 'reader' | 'commenter' | 'writer'
  isInherited?: boolean
  inheritedFrom?: string | null
  parentName?: string | null
  shareUrl: string | null
  driveUrl: string | null
}

type InviteItem = {
  id: string
  email: string
  role: string
  status: string
  createdAt: string
}

export function ShareModal({
  open,
  file,
  onClose,
}: {
  open: boolean
  file: ShareFileTarget | null
  onClose: () => void
}) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const { toast } = useToast()
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [generalAccess, setGeneralAccess] = useState<'restricted' | 'anyone'>('restricted')
  const [role, setRole] = useState<'reader' | 'commenter' | 'writer'>('reader')
  const [isInherited, setIsInherited] = useState(false)
  const [parentName, setParentName] = useState<string | null>(null)
  const [confirmCascadeOpen, setConfirmCascadeOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Custom Dropdown states
  const [accessMenuOpen, setAccessMenuOpen] = useState(false)
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)
  const accessMenuRef = useRef<HTMLDivElement>(null)
  const roleMenuRef = useRef<HTMLDivElement>(null)

  // Quick invite
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor'>('viewer')
  const [inviting, setInviting] = useState(false)
  const [collaborators, setCollaborators] = useState<InviteItem[]>([])
  const [inviteSuccess, setInviteSuccess] = useState('')

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (accessMenuRef.current && !accessMenuRef.current.contains(e.target as Node)) {
        setAccessMenuOpen(false)
      }
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setRoleMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Initial load
  useEffect(() => {
    if (!open || !file || !file.id) {
      setCopied(false)
      setError(null)
      setInviteEmail('')
      setInviteSuccess('')
      setAccessMenuOpen(false)
      setRoleMenuOpen(false)
      return
    }

    const user = getStoredUser()
    setCurrentUser(user)
    if (user?.email) {
      getGravatarUrl(user.email, 64).then((url) => setAvatarUrl(url))
    }

    let isMounted = true
    setLoading(true)
    setError(null)

    if (file.driveUrl) {
      setShareUrl(file.driveUrl)
    }

    const endpoint = file.type === 'folder'
      ? `/folders/${file.id}/permissions`
      : `/files/${file.id}/permissions`

    apiFetch<PermissionsResponse>(endpoint)
      .then((data) => {
        if (!isMounted) return
        setGeneralAccess(data.generalAccess)
        setRole(data.role || 'reader')
        setIsInherited(Boolean(data.isInherited))
        setParentName(data.parentName ?? null)
        if (data.shareUrl) {
          setShareUrl(data.shareUrl)
        } else if (file.driveUrl) {
          setShareUrl(file.driveUrl)
        }
      })
      .catch((err) => {
        if (!isMounted) return
        if (file.driveUrl) {
          setShareUrl(file.driveUrl)
        }
        setError(err instanceof Error ? err.message : 'Failed to fetch permissions')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    // Load collaborators for this target
    apiFetch<{ sent: InviteItem[] }>('/invites')
      .then((data) => {
        if (!isMounted) return
        setCollaborators(data.sent.filter((inv: any) => inv.targetId === file.id && inv.status !== 'revoked'))
      })
      .catch(() => undefined)

    return () => {
      isMounted = false
    }
  }, [open, file])

  async function handleAccessChange(newAccess: 'restricted' | 'anyone', cascadeParent = false) {
    if (!file?.id || updating || (!cascadeParent && newAccess === generalAccess)) {
      setAccessMenuOpen(false)
      return
    }

    if (newAccess === 'restricted' && isInherited && !cascadeParent) {
      setAccessMenuOpen(false)
      setConfirmCascadeOpen(true)
      return
    }

    setUpdating(true)
    setError(null)
    setAccessMenuOpen(false)

    try {
      const endpoint = file.type === 'folder'
        ? `/folders/${file.id}/permissions`
        : `/files/${file.id}/permissions`

      const data = await apiFetch<PermissionsResponse>(endpoint, {
        method: 'PUT',
        body: JSON.stringify({
          generalAccess: newAccess,
          role,
          cascadeParent,
        }),
      })
      setGeneralAccess(data.generalAccess)
      setRole(data.role || 'reader')
      setIsInherited(Boolean(data.isInherited))
      setParentName(data.parentName ?? null)
      setConfirmCascadeOpen(false)
      if (data.shareUrl) setShareUrl(data.shareUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update access permission')
    } finally {
      setUpdating(false)
    }
  }

  async function handleRoleChange(newRole: 'reader' | 'commenter' | 'writer') {
    if (!file?.id || updating || newRole === role) {
      setRoleMenuOpen(false)
      return
    }
    setUpdating(true)
    setError(null)
    setRoleMenuOpen(false)

    try {
      const endpoint = file.type === 'folder'
        ? `/folders/${file.id}/permissions`
        : `/files/${file.id}/permissions`

      const data = await apiFetch<PermissionsResponse>(endpoint, {
        method: 'PUT',
        body: JSON.stringify({
          generalAccess,
          role: newRole,
        }),
      })
      setRole(data.role || 'reader')
      setIsInherited(Boolean(data.isInherited))
      if (data.shareUrl) setShareUrl(data.shareUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role permission')
    } finally {
      setUpdating(false)
    }
  }

  async function copyLink() {
    let url = shareUrl || file?.driveUrl
    if (!url && file?.id) {
      try {
        const res = await apiFetch<{ url: string }>(`/files/${file.id}/share`, { method: 'POST' })
        url = res.url
        setShareUrl(url)
      } catch {
        url = window.location.href
      }
    }
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Link copied to clipboard!')
    setTimeout(() => setCopied(false), 2500)
  }

  async function handleSendInvite(e: FormEvent) {
    e.preventDefault()
    if (!file?.id || !inviteEmail.trim() || inviting) return
    setInviting(true)
    setError(null)
    setInviteSuccess('')

    try {
      const res = await apiFetch<{ invite: InviteItem }>('/invites', {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          targetType: file.type === 'folder' ? 'folder' : 'file',
          targetId: file.id,
        }),
      })
      setCollaborators((prev) => [res.invite, ...prev.filter((i) => i.email !== res.invite.email)])
      setInviteEmail('')
      setInviteSuccess(`Invitation sent to ${res.invite.email}`)
      setTimeout(() => setInviteSuccess(''), 3000)
      window.dispatchEvent(new Event('9drive:invites-changed'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite collaborator')
    } finally {
      setInviting(false)
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    try {
      await apiFetch(`/invites/${inviteId}`, { method: 'DELETE' })
      setCollaborators((prev) => prev.filter((i) => i.id !== inviteId))
      window.dispatchEvent(new Event('9drive:invites-changed'))
    } catch {
      /* ignore */
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px] animate-m3-scrim"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Google Drive Material 3 Share Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-h-[92vh] overflow-visible rounded-[28px] border border-[#E0E3E7] bg-white p-6 shadow-2xl animate-m3-dialog sm:max-w-[560px] dark:border-[#36373A] dark:bg-[#1E1F20]"
      >
        {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-2">
            <div className="min-w-0 pr-2">
              <h2 className="truncate text-[22px] font-normal tracking-tight text-[#1F1F1F] dark:text-[#E3E3E3]">
                Share &ldquo;{file?.name ?? 'Item'}&rdquo;
              </h2>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10"
                title="Settings"
                onClick={() => toast.info('Editors can change permissions and share. Viewers and commenters can see the option to download, print, and copy.')}
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10 transition-transform duration-200 hover:rotate-90 active:scale-90"
                onClick={onClose}
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Error / Success Banners */}
          {error ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          ) : null}
          {inviteSuccess ? (
            <div className="mt-3 rounded-xl border border-[#C2E7FF] bg-[#C2E7FF]/40 p-3 text-xs text-[#001D35] dark:bg-[#004A77]/40 dark:text-[#C2E7FF]">
              {inviteSuccess}
            </div>
          ) : null}

          {/* Section 1: Add people and groups */}
          <form onSubmit={handleSendInvite} className="mt-4">
            <div className="flex items-center gap-2 rounded-2xl border border-[#747775]/40 bg-white px-3.5 py-2.5 transition-all focus-within:border-[#0B57D0] focus-within:ring-2 focus-within:ring-[#0B57D0]/20 hover:border-[#1F1F1F] dark:border-[#747775]/50 dark:bg-[#1E1F20] dark:focus-within:border-[#A8C7FA]">
              <UserPlus className="h-5 w-5 text-[#747775] shrink-0" />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Add people, groups, or calendar events"
                className="w-full bg-transparent text-sm text-[#1F1F1F] placeholder-[#747775] outline-none dark:text-[#E3E3E3] dark:placeholder-[#8E918F]"
              />
              {inviteEmail.trim() ? (
                <div className="flex items-center gap-2 shrink-0 animate-in fade-in">
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'viewer' | 'editor')}
                    className="rounded-lg border border-[#E0E3E7] bg-white px-2 py-1 text-xs font-medium text-[#1F1F1F] dark:border-[#36373A] dark:bg-[#28292A] dark:text-[#E3E3E3]"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={inviting}
                    className="rounded-full bg-[#0B57D0] px-3.5 text-xs text-white hover:bg-[#0842A0] dark:bg-[#A8C7FA] dark:text-[#001D35]"
                  >
                    {inviting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Send'}
                  </Button>
                </div>
              ) : null}
            </div>
          </form>

          {/* Section 2: People with access */}
          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#444746] dark:text-[#C4C7C5] mb-2.5">
              People with access
            </h3>

            <div className="space-y-2">
              {/* Owner Row */}
              <div className="flex items-center justify-between gap-3 py-1.5">
                <div className="flex items-center gap-3 min-w-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={currentUser?.name ?? 'User'}
                      className="h-9 w-9 rounded-full object-cover shrink-0 ring-1 ring-black/5"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0B57D0] text-xs font-bold text-white uppercase">
                      {currentUser?.name?.[0] || 'U'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                      {currentUser?.name ?? 'You'} <span className="text-xs text-[#747775] font-normal">(you)</span>
                    </p>
                    <p className="truncate text-xs text-[#747775] dark:text-[#8E918F]">
                      {currentUser?.email ?? 'Owner'}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-normal text-[#747775] dark:text-[#8E918F] shrink-0">
                  Owner
                </span>
              </div>

              {/* Collaborators */}
              {collaborators.length > 0 && (
                <div className="max-h-40 overflow-y-auto scrollbar-thin space-y-2 pr-1">
                  {collaborators.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 py-1.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-[#444746] dark:bg-[#28292A] dark:text-[#C4C7C5] uppercase">
                          {c.email[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                            {c.email}
                          </p>
                          <p className="text-xs text-[#747775] capitalize dark:text-[#8E918F]">
                            {c.role} • {c.status}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        title="Remove collaborator"
                        onClick={() => handleRevokeInvite(c.id)}
                        className="p-1 text-[#747775] hover:text-[#B3261E] dark:hover:text-[#F2B8B5] transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: General access */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#444746] dark:text-[#C4C7C5]">
                General access
              </h3>
              {updating || loading ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-[#0B57D0] dark:text-[#A8C7FA]">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Updating access...
                </span>
              ) : null}
            </div>

            <div className="flex items-start justify-between gap-3 rounded-2xl border border-[#E0E3E7] bg-[#F8FAFD] p-3.5 dark:border-[#36373A] dark:bg-[#131314]">
              {/* Left: Round Status Icon */}
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors',
                    generalAccess === 'anyone'
                      ? 'bg-[#C2E7FF] text-[#001D35] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                      : 'bg-[#E0E3E7] text-[#444746] dark:bg-[#28292A] dark:text-[#C4C7C5]'
                  )}
                >
                  {generalAccess === 'anyone' ? (
                    <Globe className="h-5 w-5" />
                  ) : (
                    <Lock className="h-5 w-5" />
                  )}
                </div>

                {/* Center: Custom General Access Popover Dropdown */}
                <div className="min-w-0">
                  <div className="relative inline-block" ref={accessMenuRef}>
                    <button
                      type="button"
                      disabled={updating || loading}
                      onClick={() => setAccessMenuOpen(!accessMenuOpen)}
                      className="flex items-center gap-1.5 rounded-lg px-2 py-0.5 -ml-2 text-sm font-semibold text-[#1F1F1F] hover:bg-black/5 dark:text-[#E3E3E3] dark:hover:bg-white/5 transition-colors"
                    >
                      <span>{generalAccess === 'anyone' ? 'Anyone with the link' : 'Restricted'}</span>
                      <ChevronDown className={cn('h-4 w-4 text-[#747775] transition-transform duration-200', accessMenuOpen && 'rotate-180')} />
                    </button>

                    {/* Popover Menu - Opens cleanly downwards right under the button */}
                    {accessMenuOpen && (
                      <div className="absolute left-0 top-full z-50 mt-1.5 w-56 sm:w-60 overflow-hidden rounded-2xl border border-[#E0E3E7] bg-white py-1.5 shadow-2xl animate-in fade-in zoom-in-95 origin-top-left dark:border-[#36373A] dark:bg-[#1E1F20]">
                        {/* Option: Restricted */}
                        <button
                          type="button"
                          onClick={() => handleAccessChange('restricted')}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm hover:bg-[#F0F4F9] dark:hover:bg-[#28292A] transition-colors"
                        >
                          <div className="w-4 shrink-0">
                            {generalAccess === 'restricted' && (
                              <Check className="h-4 w-4 text-[#0B57D0] dark:text-[#A8C7FA]" />
                            )}
                          </div>
                          <span className={cn('text-sm font-medium', generalAccess === 'restricted' ? 'text-[#0B57D0] dark:text-[#A8C7FA]' : 'text-[#1F1F1F] dark:text-[#E3E3E3]')}>
                            Restricted
                          </span>
                        </button>

                        {/* Option: Anyone with the link */}
                        <button
                          type="button"
                          onClick={() => handleAccessChange('anyone')}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm hover:bg-[#F0F4F9] dark:hover:bg-[#28292A] transition-colors"
                        >
                          <div className="w-4 shrink-0">
                            {generalAccess === 'anyone' && (
                              <Check className="h-4 w-4 text-[#0B57D0] dark:text-[#A8C7FA]" />
                            )}
                          </div>
                          <span className={cn('text-sm font-medium', generalAccess === 'anyone' ? 'text-[#0B57D0] dark:text-[#A8C7FA]' : 'text-[#1F1F1F] dark:text-[#E3E3E3]')}>
                            Anyone with the link
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-[#747775] dark:text-[#8E918F] mt-0.5">
                    {generalAccess === 'anyone'
                      ? 'Anyone on the internet with the link can access'
                      : 'Only people with access can open with the link'}
                  </p>
                  {isInherited && generalAccess === 'anyone' ? (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                      <Lock className="h-3 w-3" /> Inherited from parent folder
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Right: Custom Role Dropdown (Only visible if Anyone with the link is active) */}
              {generalAccess === 'anyone' ? (
                <div className="relative shrink-0 self-center" ref={roleMenuRef}>
                  <button
                    type="button"
                    disabled={updating || loading}
                    onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                    className="flex items-center gap-2 rounded-xl border border-[#E0E3E7] bg-white px-3.5 py-1.5 text-xs font-medium text-[#1F1F1F] shadow-sm hover:bg-[#F0F4F9] dark:border-[#36373A] dark:bg-[#1E1F20] dark:text-[#E3E3E3] dark:hover:bg-[#28292A] transition-colors"
                  >
                    <span className="capitalize">{role === 'writer' ? 'Editor' : role === 'commenter' ? 'Commenter' : 'Viewer'}</span>
                    <ChevronDown className={cn('h-3.5 w-3.5 text-[#747775] transition-transform duration-200', roleMenuOpen && 'rotate-180')} />
                  </button>

                  {/* Popover Role Menu - Opens cleanly downwards */}
                  {roleMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-2xl border border-[#E0E3E7] bg-white py-1.5 shadow-2xl animate-in fade-in zoom-in-95 origin-top-right dark:border-[#36373A] dark:bg-[#1E1F20]">
                      {[
                        { value: 'reader', label: 'Viewer' },
                        { value: 'commenter', label: 'Commenter' },
                        { value: 'writer', label: 'Editor' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleRoleChange(opt.value as any)}
                          className="flex w-full items-center justify-between px-3.5 py-2 text-xs hover:bg-[#F0F4F9] dark:hover:bg-[#28292A] text-left transition-colors"
                        >
                          <span className={cn(role === opt.value ? 'font-semibold text-[#0B57D0] dark:text-[#A8C7FA]' : 'text-[#1F1F1F] dark:text-[#E3E3E3]')}>
                            {opt.label}
                          </span>
                          {role === opt.value && <Check className="h-3.5 w-3.5 text-[#0B57D0] dark:text-[#A8C7FA]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

        {/* Footer Actions */}
        <div className="mt-5 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Pill Copy Link Button */}
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2 rounded-full border-[#747775]/40 px-5 text-sm font-medium text-[#0B57D0] hover:bg-[#0B57D0]/10 hover:border-[#0B57D0] active:scale-95 transition-all dark:border-[#747775]/60 dark:text-[#A8C7FA]"
            onClick={copyLink}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400">Link copied</span>
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" />
                <span>Copy link</span>
              </>
            )}
          </Button>

          <div className="flex items-center justify-end gap-2">
            {file?.driveUrl ? (
              <Button
                type="button"
                variant="ghost"
                className="flex items-center gap-1.5 text-xs text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10 rounded-full px-3"
                onClick={() => window.open(file.driveUrl ?? '', '_blank')}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in Drive
              </Button>
            ) : null}

            <Button
              type="button"
              className="rounded-full bg-[#0B57D0] hover:bg-[#0842A0] text-white px-7 text-sm font-medium shadow-sm transition-all active:scale-95 dark:bg-[#A8C7FA] dark:text-[#001D35] dark:hover:bg-[#D3E3FD]"
              onClick={onClose}
            >
              Done
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Cascading Restricted Access to Parent Folder */}
      {confirmCascadeOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-[#E0E3E7] bg-white p-6 shadow-2xl dark:border-[#36373A] dark:bg-[#1E1F20] animate-in zoom-in-95">
            <h3 className="text-base font-semibold text-[#1F1F1F] dark:text-[#E3E3E3]">
              Ubah akses folder induk ke Restricted?
            </h3>
            <p className="mt-2.5 text-xs text-[#444746] dark:text-[#C4C7C5] leading-relaxed">
              File ini mewarisi hak akses publik dari folder induk <b>"{parentName || 'Folder Induk'}"</b>.
              Mengubahnya ke Restricted akan membuat folder induk beserta seluruh file di dalamnya ikut menjadi Restricted.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                className="rounded-full px-4 text-xs font-medium"
                onClick={() => setConfirmCascadeOpen(false)}
                disabled={updating}
              >
                Batal
              </Button>
              <Button
                type="button"
                className="rounded-full bg-[#0B57D0] hover:bg-[#0842A0] text-white px-5 text-xs font-medium transition-all active:scale-95 dark:bg-[#A8C7FA] dark:text-[#001D35] dark:hover:bg-[#D3E3FD]"
                onClick={() => handleAccessChange('restricted', true)}
                disabled={updating}
              >
                {updating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                Ubah Folder Induk
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
