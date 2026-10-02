import { useEffect, useState, type FormEvent } from 'react'
import {
  BookOpen,
  Check,
  Copy,
  KeyRound,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/drive/PageHeader'
import { DummyModal } from '@/components/drive/DummyModal'
import { API_URL, apiFetch, formatDate } from '@/lib/api'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/context/ToastContext'

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

type CodeTab = 'curl' | 'js' | 'response' | 'html'

export function ApiManagementPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [docsOpen, setDocsOpen] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [secret, setSecret] = useState('')
  const { toast } = useToast()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [activeCodeTab, setActiveCodeTab] = useState<CodeTab>('curl')
  const [copiedSnippet, setCopiedSnippet] = useState(false)
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    const data = await apiFetch<{ apiKeys: ApiKey[] }>('/api-keys')
    setApiKeys(data.apiKeys)
  }

  useEffect(() => {
    load().catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load API keys'))
  }, [])

  async function createKey(event: FormEvent) {
    event.preventDefault()
    if (!keyName.trim()) return
    setLoading(true)
    try {
      const data = await apiFetch<{ apiKey: ApiKey; secret: string }>('/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: keyName.trim() }),
      })
      setSecret(data.secret)
      setKeyName('')
      toast.success('API key created successfully.')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create API key')
    } finally {
      setLoading(false)
    }
  }

  async function toggleKeyStatus(apiKey: ApiKey) {
    const nextStatus = apiKey.status === 'active' ? 'revoked' : 'active'
    
    // Optimistic UI update
    setApiKeys((prev) =>
      prev.map((k) => (k.id === apiKey.id ? { ...k, status: nextStatus } : k))
    )

    try {
      await apiFetch(`/api-keys/${apiKey.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      })
      toast.success(nextStatus === 'active' ? 'API key activated.' : 'API key revoked/paused.')
      await load()
    } catch (error) {
      // Rollback on failure
      setApiKeys((prev) =>
        prev.map((k) => (k.id === apiKey.id ? { ...k, status: apiKey.status } : k))
      )
      toast.error(error instanceof Error ? error.message : 'Failed to update API key status')
    }
  }

  async function handleConfirmDelete() {
    if (!keyToDelete) return
    const target = keyToDelete
    setKeyToDelete(null)
    setDeleting(true)

    // Optimistic UI removal
    const previousKeys = apiKeys
    setApiKeys((prev) => prev.filter((k) => k.id !== target.id))

    try {
      await apiFetch(`/api-keys/${target.id}`, { method: 'DELETE' })
      toast.success('API key deleted successfully.')
      await load()
    } catch (error) {
      // Rollback on failure
      setApiKeys(previousKeys)
      toast.error(error instanceof Error ? error.message : 'Failed to delete API key')
    } finally {
      setDeleting(false)
    }
  }

  function copyText(value: string, label = 'Copied to clipboard') {
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success(label))
      .catch(() => toast.error('Failed to copy.'))
  }

  const codeSnippets: Record<CodeTab, { title: string; lang: string; code: string }> = {
    curl: {
      title: 'cURL',
      lang: 'bash',
      code: `curl -X POST "${API_URL}/api/v1/uploads" \\
  -H "x-api-key: 9d_live_YOUR_KEY" \\
  -F "file=@foto-produk.png"`,
    },
    js: {
      title: 'JavaScript (Fetch)',
      lang: 'javascript',
      code: `const form = new FormData()
form.append('file', fileInput.files[0])

const res = await fetch('${API_URL}/api/v1/uploads', {
  method: 'POST',
  headers: { 'x-api-key': '9d_live_YOUR_KEY' },
  body: form,
})

const { file } = await res.json()
console.log('CDN View URL:', file.url)
// -> ${API_URL}/cdn/view/\${file.id}`,
    },
    response: {
      title: 'JSON Response',
      lang: 'json',
      code: `{
  "success": true,
  "file": {
    "id": "829bd3e0-c6e4-4840-b85b-24599fb4b251",
    "name": "foto-produk.png",
    "mimeType": "image/png",
    "size": 1048576,
    "url": "${API_URL}/cdn/view/829bd3e0-c6e4-4840-b85b-24599fb4b251",
    "downloadUrl": "${API_URL}/cdn/raw/829bd3e0-c6e4-4840-b85b-24599fb4b251"
  }
}`,
    },
    html: {
      title: 'HTML <img> Embed',
      lang: 'html',
      code: `<!-- Fast cached CDN image delivery -->
<img 
  src="${API_URL}/cdn/view/829bd3e0-c6e4-4840-b85b-24599fb4b251" 
  alt="Foto Produk" 
  loading="lazy" 
/>`,
    },
  }

  const currentSnippet = codeSnippets[activeCodeTab]

  function handleCopySnippet() {
    copyText(currentSnippet.code, `${currentSnippet.title} copied!`)
    setCopiedSnippet(true)
    setTimeout(() => setCopiedSnippet(false), 2000)
  }

  const envVariableExample = `NINEDRIVE_URL=${API_URL}/api/v1/uploads`

  return (
    <div className="flex flex-col min-h-full w-full min-w-0">
      <PageHeader
        title={t('api_keys.title', 'API Keys')}
        description={t('api_keys.desc', 'Manage API keys for your applications. Use your keys to authenticate external uploads and deliver media through the local CDN gateway.')}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full h-8 px-3.5 text-xs font-medium gap-1.5 border-[#E0E3E7] dark:border-[#36373A]"
              onClick={() => setDocsOpen(true)}
            >
              <BookOpen className="h-3.5 w-3.5 text-[#747775] dark:text-[#8E918F]" />
              <span>{t('api_keys.docs_btn', 'Documentation')}</span>
            </Button>
            <Button
              size="sm"
              className="rounded-full h-8 px-3.5 text-xs font-medium gap-1.5 bg-[#0B57D0] hover:bg-[#0B57D0]/90 text-white"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              <span>{t('api_keys.generate_btn', 'Generate New Key')}</span>
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-4 mt-4">
        {/* API Environment Variable Bar (Reference 2 style) */}
        <div>
          <p className="text-xs font-medium text-[#747775] dark:text-[#8E918F] mb-1.5">
            {t('api_keys.env_var', 'API environment variable')}
          </p>
          <div className="flex items-center justify-between rounded-xl border border-[#E0E3E7] dark:border-[#36373A] bg-[#F8FAFD] dark:bg-[#18191A] px-3.5 py-2.5">
            <code className="font-mono text-xs text-[#1F1F1F] dark:text-[#E3E3E3] truncate">
              {envVariableExample}
            </code>
            <button
              type="button"
              onClick={() => copyText(envVariableExample, 'Environment variable copied!')}
              className="text-[#747775] hover:text-[#0B57D0] dark:hover:text-[#A8C7FA] p-1 transition-colors"
              title="Copy variable"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

      {/* Clean Table (Reference 2 style) */}
      <div className="rounded-2xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E0E3E7] dark:border-[#36373A] bg-[#F8FAFD]/50 dark:bg-[#18191A]/50 text-[#747775] dark:text-[#8E918F]">
                <th className="py-3 px-4 font-medium">{t('api_keys.table_name', 'Key Name')}</th>
                <th className="py-3 px-4 font-medium">{t('api_keys.table_created', 'Date Created')}</th>
                <th className="py-3 px-4 font-medium">{t('api_keys.table_prefix', 'API Key (Prefix)')}</th>
                <th className="py-3 px-4 font-medium">{t('api_keys.table_secret', 'API Secret')}</th>
                <th className="py-3 px-4 font-medium">{t('api_keys.table_status', 'Status')}</th>
                <th className="py-3 px-4 font-medium text-right">{t('api_keys.table_actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E3E7]/60 dark:divide-[#36373A]/60">
              {apiKeys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#747775] dark:text-[#8E918F]">
                    <KeyRound className="mx-auto h-8 w-8 opacity-40 mb-2" />
                    <p className="text-sm font-medium">{t('api_keys.empty_title', 'No API keys generated yet')}</p>
                    <p className="text-xs mt-0.5">{t('api_keys.empty_desc', 'Click "Generate New Key" above to create one.')}</p>
                  </td>
                </tr>
              ) : (
                apiKeys.map((apiKey) => {
                  const isActive = apiKey.status === 'active'
                  return (
                    <tr
                      key={apiKey.id}
                      className="hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors"
                    >
                      {/* Key Name */}
                      <td className="py-3.5 px-4 font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                        <div className="flex items-center gap-2">
                          <span>{apiKey.name}</span>
                          {apiKey.name.toLowerCase().includes('default') && (
                            <span className="text-[10px] rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5">
                              Default
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date Created */}
                      <td className="py-3.5 px-4 text-[#747775] dark:text-[#8E918F]">
                        {formatDate(apiKey.createdAt)}
                      </td>

                      {/* API Key Prefix */}
                      <td className="py-3.5 px-4 font-mono text-[#1F1F1F] dark:text-[#E3E3E3]">
                        <button
                          type="button"
                          onClick={() => copyText(apiKey.keyPrefix, 'Key prefix copied!')}
                          className="inline-flex items-center gap-1 hover:text-[#0B57D0] dark:hover:text-[#A8C7FA]"
                          title="Click to copy prefix"
                        >
                          <span>{apiKey.keyPrefix}...</span>
                          <Copy className="h-3 w-3 opacity-50" />
                        </button>
                      </td>

                      {/* API Secret (Masked) */}
                      <td className="py-3.5 px-4 font-mono text-[#747775] dark:text-[#8E918F] tracking-wider text-xs">
                        ••••••••••••••••••••
                      </td>

                      {/* Status Toggle Switch */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => toggleKeyStatus(apiKey)}
                          className="inline-flex items-center gap-2 select-none cursor-pointer"
                          title={isActive ? 'Click to pause/revoke' : 'Click to activate'}
                        >
                          <div
                            className={`relative inline-flex h-4 w-7 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                              isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                                isActive ? 'translate-x-3' : 'translate-x-0'
                              }`}
                            />
                          </div>
                          <span className={`text-xs font-medium ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#747775]'}`}>
                            {isActive ? 'Active' : 'Revoked'}
                          </span>
                        </button>
                      </td>

                      {/* Action Menu / Delete */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setKeyToDelete(apiKey)}
                          className="p-1.5 rounded-lg text-[#747775] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Delete API Key"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#E0E3E7] dark:border-[#36373A] bg-[#F8FAFD]/30 dark:bg-[#18191A]/30 text-xs text-[#747775] dark:text-[#8E918F]">
          <span>Total: {apiKeys.length} key{apiKeys.length === 1 ? '' : 's'}</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DummyModal
        open={Boolean(keyToDelete)}
        title="Delete API Key"
        description="This action cannot be undone."
        onClose={() => setKeyToDelete(null)}
        className="sm:max-w-md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-[#444746] dark:text-[#C4C7C5] leading-relaxed">
            Are you sure you want to permanently delete API key{' '}
            <span className="font-semibold text-[#1F1F1F] dark:text-[#E3E3E3]">
              "{keyToDelete?.name}"
            </span>
            ? Any external applications or web platforms using this key will immediately lose access.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full h-8 px-4 text-xs font-medium"
              onClick={() => setKeyToDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-full h-8 px-4 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Key'}
            </Button>
          </div>
        </div>
      </DummyModal>

      {/* Create Key Modal */}
      <DummyModal
        open={createOpen}
        title={secret ? 'API Key Secret' : 'Generate New API Key'}
        description={
          secret
            ? 'Save this key now. For your security, it will never be displayed again.'
            : 'Enter a descriptive label to identify this key.'
        }
        onClose={() => {
          setCreateOpen(false)
          setSecret('')
          setKeyName('')
        }}
      >
        {secret ? (
          <div className="grid gap-4 mt-2">
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded-xl bg-black/5 dark:bg-black/40 border border-[#E0E3E7] dark:border-[#36373A] px-3.5 py-2.5 text-xs font-mono text-emerald-700 dark:text-emerald-300">
                {secret}
              </code>
              <Button
                size="sm"
                className="rounded-full h-9 px-3 text-xs gap-1 shrink-0"
                onClick={() => copyText(secret, 'Secret key copied!')}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                className="rounded-full h-8 px-5 text-xs font-medium"
                onClick={() => {
                  setCreateOpen(false)
                  setSecret('')
                }}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form className="grid gap-4 mt-2" onSubmit={createKey}>
            <input
              className="h-10 rounded-xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] px-3.5 text-xs text-[#1F1F1F] dark:text-[#E3E3E3] placeholder:text-[#747775] focus:border-[#0B57D0] focus:outline-none focus:ring-1 focus:ring-[#0B57D0]"
              placeholder="Key Name (e.g. Production Store, Blog Sync)"
              value={keyName}
              onChange={(event) => setKeyName(event.target.value)}
              required
              autoFocus
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full h-8 px-4 text-xs font-medium"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="rounded-full h-8 px-4 text-xs font-medium bg-[#0B57D0] text-white hover:bg-[#0B57D0]/90"
                disabled={loading || !keyName.trim()}
              >
                {loading ? 'Generating...' : 'Generate Key'}
              </Button>
            </div>
          </form>
        )}
      </DummyModal>

      {/* DEDICATED DOCUMENTATION MODAL (Separate, Zero UI Clutter) */}
      <DummyModal
        open={docsOpen}
        title="Developer API & Code Examples"
        description="Integrate 9Drive object storage directly with standard HTTP requests."
        onClose={() => setDocsOpen(false)}
        className="sm:max-w-2xl"
      >
        <div className="flex flex-col gap-4 text-xs">
          {/* Endpoint summary pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-[#E0E3E7] dark:border-[#36373A] bg-[#F8FAFD] dark:bg-[#18191A] p-2.5">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">POST</span>{' '}
              <span className="font-mono text-[#1F1F1F] dark:text-[#E3E3E3]">{API_URL}/api/v1/uploads</span>
              <p className="text-[10px] text-[#747775] dark:text-[#8E918F] mt-1">Upload endpoint (requires <code className="font-mono">x-api-key</code>)</p>
            </div>

            <div className="rounded-xl border border-[#E0E3E7] dark:border-[#36373A] bg-[#F8FAFD] dark:bg-[#18191A] p-2.5">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">GET</span>{' '}
              <span className="font-mono text-[#1F1F1F] dark:text-[#E3E3E3]">{API_URL}/cdn/view/:id</span>
              <p className="text-[10px] text-[#747775] dark:text-[#8E918F] mt-1">Direct CDN delivery (1-year cache & open CORS)</p>
            </div>
          </div>

          {/* Interactive Code Window */}
          <div className="rounded-xl overflow-hidden border border-[#36373A] bg-[#121314] text-[#E3E3E3] shadow-sm">
            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-[#28292A] bg-[#1A1B1C] px-3 py-2">
              <div className="flex items-center gap-1">
                {(['curl', 'js', 'response', 'html'] as CodeTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveCodeTab(tab)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                      activeCodeTab === tab
                        ? 'bg-[#2C2D2F] text-white shadow-xs'
                        : 'text-[#8E918F] hover:text-[#E3E3E3]'
                    }`}
                  >
                    {codeSnippets[tab].title}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleCopySnippet}
                className="inline-flex items-center gap-1 text-[11px] text-[#A8C7FA] hover:text-white transition-colors p-1"
              >
                {copiedSnippet ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Code Body */}
            <pre className="p-3.5 font-mono text-xs leading-relaxed overflow-x-auto max-h-72">
              <code>{currentSnippet.code}</code>
            </pre>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              className="rounded-full h-8 px-4 text-xs font-medium"
              onClick={() => setDocsOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DummyModal>
    </div>
  )
}
