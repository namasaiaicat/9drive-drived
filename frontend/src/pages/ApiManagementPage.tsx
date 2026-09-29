import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle, Clipboard, KeyRound, ShieldCheck, Trash2, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DummyModal } from '@/components/drive/DummyModal'
import { API_URL, apiFetch, formatDate } from '@/lib/api'

type ApiKey = {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  status: string
  lastUsedAt: string | null
  expiresAt: string | null
  revokedAt: string | null
  createdAt: string
}

const curlExample = `curl -X POST "${API_URL}/api/v1/uploads" \\
  -H "Authorization: Bearer 9d_live_xxx" \\
  -F 'filesMeta=[{"fieldName":"file-0","fileName":"hello.txt","mimeType":"text/plain","sizeBytes":"12"}]' \\
  -F "file-0=@hello.txt;type=text/plain"`

const jsExample = `const form = new FormData()
form.append('filesMeta', JSON.stringify([
  { fieldName: 'file-0', fileName: file.name, mimeType: file.type, sizeBytes: String(file.size) },
]))
form.append('file-0', file)

await fetch('${API_URL}/api/v1/uploads', {
  method: 'POST',
  headers: { Authorization: 'Bearer 9d_live_xxx' },
  body: form,
})`

export function ApiManagementPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [secret, setSecret] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function load() {
    const data = await apiFetch<{ apiKeys: ApiKey[] }>('/api-keys')
    setApiKeys(data.apiKeys)
  }

  useEffect(() => {
    load().catch((error) => setMessage(error instanceof Error ? error.message : 'Failed to load API keys'))
  }, [])

  async function createKey(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const data = await apiFetch<{ apiKey: ApiKey; secret: string }>('/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: keyName }),
      })
      setSecret(data.secret)
      setKeyName('')
      setCreateOpen(false)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to create API key')
    } finally {
      setLoading(false)
    }
  }

  async function revokeKey(id: string) {
    await apiFetch(`/api-keys/${id}`, { method: 'DELETE' })
    await load()
  }

  function copy(value: string) {
    navigator.clipboard
      .writeText(value)
      .then(() => setMessage('Copied to clipboard.'))
      .catch(() => setMessage('Failed to copy.'))
  }

  const activeKeys = apiKeys.filter((apiKey) => apiKey.status === 'active').length
  const usedKeys = apiKeys.filter((apiKey) => apiKey.lastUsedAt).length

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-[22px] font-normal tracking-tight text-[#1F1F1F] dark:text-[#E3E3E3]">
            API Management
          </h1>
          <p className="text-xs text-[#747775] dark:text-[#8E918F] mt-0.5">
            Create API keys, copy examples, and upload files from external applications.
          </p>
        </div>

        <Button
          className="rounded-full h-9 px-4 text-xs font-medium"
          onClick={() => setCreateOpen(true)}
        >
          <KeyRound className="h-4 w-4" />
          Create API Key
        </Button>
      </div>

      {message && (
        <div className="flex items-center justify-between rounded-xl bg-[#EDF2FC] dark:bg-[#004A77]/30 px-4 py-2.5 text-xs text-[#0B57D0] dark:text-[#A8C7FA]">
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage('')}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {secret && (
        <Card className="rounded-2xl border border-[#0B57D0]/30 bg-[#EDF2FC] dark:bg-[#004A77]/20 p-5">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0B57D0] text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[#001D35] dark:text-[#C2E7FF]">
                Copy your API key now
              </p>
              <p className="mt-0.5 text-xs text-[#0B57D0] dark:text-[#A8C7FA]">
                This secret is shown only once. Store it securely before navigating away.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="block flex-1 min-w-[200px] overflow-x-auto rounded-xl bg-white dark:bg-[#1E1F20] border border-[#E0E3E7] dark:border-[#36373A] px-3 py-2 text-xs font-mono text-[#1F1F1F] dark:text-[#E3E3E3]">
                  {secret}
                </code>
                <Button size="sm" className="rounded-full" onClick={() => copy(secret)}>
                  <Clipboard className="h-3.5 w-3.5" />
                  Copy key
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Metrics Row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] p-4">
          <KeyRound className="h-5 w-5 text-[#0B57D0] dark:text-[#A8C7FA]" />
          <p className="mt-2 text-2xl font-normal text-[#1F1F1F] dark:text-[#E3E3E3]">{activeKeys}</p>
          <p className="text-xs text-[#747775] dark:text-[#8E918F]">Active keys</p>
        </Card>
        <Card className="rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] p-4">
          <CheckCircle className="h-5 w-5 text-[#137333] dark:text-[#81C995]" />
          <p className="mt-2 text-2xl font-normal text-[#1F1F1F] dark:text-[#E3E3E3]">{usedKeys}</p>
          <p className="text-xs text-[#747775] dark:text-[#8E918F]">Used keys</p>
        </Card>
        <Card className="rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] p-4">
          <UploadCloud className="h-5 w-5 text-[#0B57D0] dark:text-[#A8C7FA]" />
          <p className="mt-2 text-2xl font-normal text-[#1F1F1F] dark:text-[#E3E3E3]">1</p>
          <p className="text-xs text-[#747775] dark:text-[#8E918F]">Upload endpoint</p>
        </Card>
      </div>

      {/* Main Sections */}
      <div className="grid gap-4">
        {/* Keys List */}
        <Card className="rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] p-5">
          <div>
            <h2 className="text-base font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">API Keys</h2>
            <p className="text-xs text-[#747775] dark:text-[#8E918F] mt-0.5">
              API keys allow programmatic uploads. Raw secrets are never stored.
            </p>
          </div>

          <div className="mt-4 grid gap-3">
            {apiKeys.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#E0E3E7] dark:border-[#36373A] p-8 text-center">
                <KeyRound className="mx-auto h-8 w-8 text-[#747775] dark:text-[#8E918F]" />
                <p className="mt-2 text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">No API keys yet</p>
                <p className="text-xs text-[#747775] dark:text-[#8E918F] mt-0.5">Create a key to authenticate external upload requests.</p>
                <Button className="mt-4 rounded-full" size="sm" onClick={() => setCreateOpen(true)}>
                  Create API Key
                </Button>
              </div>
            ) : (
              apiKeys.map((apiKey) => (
                <div
                  key={apiKey.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#E0E3E7] dark:border-[#36373A] bg-[#F8FAFD] dark:bg-[#18191A] p-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-sm text-[#1F1F1F] dark:text-[#E3E3E3]">{apiKey.name}</p>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          apiKey.status === 'active'
                            ? 'bg-[#E6F4EA] text-[#137333] dark:bg-[#0F5223]/30 dark:text-[#81C995]'
                            : 'bg-[#F1F3F4] text-[#747775] dark:bg-[#303134] dark:text-[#8E918F]'
                        }`}
                      >
                        {apiKey.status}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1 text-xs text-[#747775] dark:text-[#8E918F] sm:grid-cols-2">
                      <p><span className="font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">Prefix:</span> {apiKey.keyPrefix}...</p>
                      <p><span className="font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">Created:</span> {formatDate(apiKey.createdAt)}</p>
                      <p><span className="font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">Last used:</span> {apiKey.lastUsedAt ? formatDate(apiKey.lastUsedAt) : 'Never'}</p>
                      <p><span className="font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">Scope:</span> {apiKey.scopes.join(', ')}</p>
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    className="rounded-full self-start sm:self-center"
                    onClick={() => revokeKey(apiKey.id)}
                    disabled={apiKey.status === 'revoked'}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Revoke
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Documentation Card */}
        <Card className="rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] p-5">
          <div>
            <h2 className="text-base font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">Upload API Reference</h2>
            <p className="text-xs text-[#747775] dark:text-[#8E918F] mt-0.5">
              Multipart upload uses the same smart routing as the web interface.
            </p>
          </div>

          <div className="mt-4 grid gap-4 text-xs text-[#1F1F1F] dark:text-[#E3E3E3]">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="font-medium">Endpoint</p>
                <button
                  type="button"
                  onClick={() => copy(`${API_URL}/api/v1/uploads`)}
                  className="inline-flex items-center gap-1 text-[11px] text-[#0B57D0] hover:underline"
                >
                  <Clipboard className="h-3 w-3" />
                  Copy
                </button>
              </div>
              <code className="block rounded-xl border border-[#E0E3E7] dark:border-[#36373A] bg-[#F8FAFD] dark:bg-[#18191A] p-2.5 font-mono text-[#0B57D0] dark:text-[#A8C7FA]">
                POST {API_URL}/api/v1/uploads
              </code>
            </div>

            <div>
              <p className="mb-1.5 font-medium">Authorization Header</p>
              <code className="block rounded-xl border border-[#E0E3E7] dark:border-[#36373A] bg-[#F8FAFD] dark:bg-[#18191A] p-2.5 font-mono text-[#747775] dark:text-[#8E918F]">
                Authorization: Bearer 9d_live_xxx
              </code>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="font-medium">cURL Example</p>
                <button
                  type="button"
                  onClick={() => copy(curlExample)}
                  className="inline-flex items-center gap-1 text-[11px] text-[#0B57D0] hover:underline"
                >
                  <Clipboard className="h-3 w-3" />
                  Copy
                </button>
              </div>
              <pre className="max-h-64 overflow-auto rounded-xl bg-[#1E1F20] text-[#E3E3E3] p-3 font-mono leading-relaxed border border-[#36373A]">
                {curlExample}
              </pre>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="font-medium">JavaScript (Fetch) Example</p>
                <button
                  type="button"
                  onClick={() => copy(jsExample)}
                  className="inline-flex items-center gap-1 text-[11px] text-[#0B57D0] hover:underline"
                >
                  <Clipboard className="h-3 w-3" />
                  Copy
                </button>
              </div>
              <pre className="max-h-64 overflow-auto rounded-xl bg-[#1E1F20] text-[#E3E3E3] p-3 font-mono leading-relaxed border border-[#36373A]">
                {jsExample}
              </pre>
            </div>
          </div>
        </Card>
      </div>

      {/* Create Modal */}
      <DummyModal
        open={createOpen}
        title="Create API Key"
        description="Enter a friendly name for this key to identify external integrations."
        onClose={() => setCreateOpen(false)}
      >
        <form className="grid gap-4 mt-2" onSubmit={createKey}>
          <input
            className="h-11 rounded-xl border border-[#747775]/40 bg-white dark:bg-[#1E1F20] px-3.5 text-sm text-[#1F1F1F] dark:text-[#E3E3E3] placeholder:text-[#747775] focus:border-[#0B57D0] focus:outline-none focus:ring-1 focus:ring-[#0B57D0]"
            placeholder="e.g. CI/CD Backup Server"
            value={keyName}
            onChange={(event) => setKeyName(event.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="outline"
              type="button"
              className="rounded-full"
              onClick={() => setCreateOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Key'}
            </Button>
          </div>
        </form>
      </DummyModal>
    </div>
  )
}
