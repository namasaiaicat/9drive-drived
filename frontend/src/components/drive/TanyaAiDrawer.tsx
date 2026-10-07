import { useEffect, useRef, useState, useId } from 'react'
import {
  Sparkles,
  X,
  Send,
  Square,
  RotateCcw,
  Settings2,
  Folder,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react'
import {
  getLocalAiConfig,
  saveLocalAiConfig,
  checkLocalAiStatus,
  fetchDirectoryContext,
  streamDirectoryChat,
  type LocalAiConfig,
  type LocalAiStatusResponse,
  type DirectoryContextResponse,
} from '@/lib/ai-api'
import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'

export type TanyaAiDrawerProps = {
  isOpen: boolean
  onClose: () => void
  currentFolderId?: string | null
  currentFolderName?: string
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

function SimpleMarkdown({ content }: { content: string }) {
  // Parse simple markdown: tables, bold, lists, code blocks, headers
  const lines = content.split('\n')
  const renderedElements: React.ReactNode[] = []
  let tableRows: string[][] = []
  let inTable = false
  let inCodeBlock = false
  let codeBlockLines: string[] = []

  function renderInline(text: string): React.ReactNode {
    // Bold: **text**
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-[#1F1F1F] dark:text-[#E3E3E3]">{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="rounded bg-[#F0F4F9] px-1.5 py-0.5 font-mono text-[11px] text-[#0B57D0] dark:bg-[#28292A] dark:text-[#A8C7FA]">
            {part.slice(1, -1)}
          </code>
        )
      }
      return part
    })
  }

  function flushTable(key: number) {
    if (tableRows.length === 0) return null
    const header = tableRows[0]
    const rows = tableRows.slice(1).filter((r) => !r.every((c) => c.trim().match(/^-+$/)))
    const tableEl = (
      <div key={`table-${key}`} className="my-2 max-w-full overflow-x-auto rounded-lg border border-[#E0E3E7] dark:border-[#36373A]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAFD] border-b border-[#E0E3E7] dark:bg-[#28292A] dark:border-[#36373A]">
            <tr>
              {header.map((col, idx) => (
                <th key={idx} className="p-2 font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">{renderInline(col.trim())}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E0E3E7] dark:divide-[#36373A]">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-[#F0F4F9] dark:hover:bg-[#28292A]">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="p-2 text-[#444746] dark:text-[#C4C7C5]">{renderInline(cell.trim())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
    tableRows = []
    inTable = false
    return tableEl
  }

  function flushCodeBlock(key: number) {
    const codeEl = (
      <pre key={`code-${key}`} className="my-2 overflow-x-auto rounded-lg bg-[#1E1F20] p-3 text-[11px] font-mono text-[#E3E3E3]">
        <code>{codeBlockLines.join('\n')}</code>
      </pre>
    )
    codeBlockLines = []
    inCodeBlock = false
    return codeEl
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        renderedElements.push(flushCodeBlock(i))
      } else {
        if (inTable) renderedElements.push(flushTable(i))
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockLines.push(line)
      continue
    }

    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      inTable = true
      const cells = line.split('|').slice(1, -1)
      tableRows.push(cells)
      continue
    } else if (inTable) {
      renderedElements.push(flushTable(i))
    }

    if (line.startsWith('### ')) {
      renderedElements.push(<h4 key={i} className="mt-3 mb-1 text-sm font-semibold text-[#1F1F1F] dark:text-[#E3E3E3]">{renderInline(line.slice(4))}</h4>)
    } else if (line.startsWith('## ')) {
      renderedElements.push(<h3 key={i} className="mt-3 mb-1 text-base font-semibold text-[#1F1F1F] dark:text-[#E3E3E3]">{renderInline(line.slice(3))}</h3>)
    } else if (line.startsWith('# ')) {
      renderedElements.push(<h2 key={i} className="mt-4 mb-1 text-lg font-bold text-[#1F1F1F] dark:text-[#E3E3E3]">{renderInline(line.slice(2))}</h2>)
    } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      renderedElements.push(
        <div key={i} className="ml-3 my-0.5 flex items-start gap-1.5 text-xs text-[#444746] dark:text-[#C4C7C5]">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0B57D0] dark:bg-[#A8C7FA]" />
          <span>{renderInline(line.trim().slice(2))}</span>
        </div>
      )
    } else if (/^\d+\.\s/.test(line.trim())) {
      const match = line.trim().match(/^(\d+)\.\s(.*)$/)
      if (match) {
        renderedElements.push(
          <div key={i} className="ml-3 my-0.5 flex items-start gap-1.5 text-xs text-[#444746] dark:text-[#C4C7C5]">
            <span className="font-semibold text-[#0B57D0] dark:text-[#A8C7FA] shrink-0 text-[11px]">{match[1]}.</span>
            <span>{renderInline(match[2])}</span>
          </div>
        )
      }
    } else if (line.trim() === '') {
      renderedElements.push(<div key={i} className="h-1.5" />)
    } else {
      renderedElements.push(<p key={i} className="my-1 text-xs leading-relaxed text-[#444746] dark:text-[#C4C7C5]">{renderInline(line)}</p>)
    }
  }

  if (inTable) renderedElements.push(flushTable(lines.length))
  if (inCodeBlock) renderedElements.push(flushCodeBlock(lines.length))

  return <div className="space-y-0.5">{renderedElements}</div>
}

export function TanyaAiDrawer({
  isOpen,
  onClose,
  currentFolderId,
  currentFolderName = 'My Drive',
}: TanyaAiDrawerProps) {
  const { language } = useLanguage()
  const textareaId = useId()
  const endpointInputId = useId()
  const modelSelectId = useId()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Configuration & Status
  const [config, setConfig] = useState<LocalAiConfig>(getLocalAiConfig())
  const [showSettings, setShowSettings] = useState(false)
  const [aiStatus, setAiStatus] = useState<LocalAiStatusResponse | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [directoryContext, setDirectoryContext] = useState<DirectoryContextResponse | null>(null)
  const [loadingContext, setLoadingContext] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  // Check Local AI status on mount or when drawer opens
  useEffect(() => {
    if (isOpen) {
      refreshAiStatus()
      loadDirectoryContext()
    }
  }, [isOpen, currentFolderId])

  async function refreshAiStatus(customEndpoint?: string) {
    setCheckingStatus(true)
    try {
      const res = await checkLocalAiStatus(customEndpoint ?? config.endpointUrl)
      setAiStatus(res)
      if (res.online && res.models.length > 0 && !config.selectedModel) {
        const defaultMod = res.defaultModel || res.models[0]
        updateConfig({ selectedModel: defaultMod })
      }
    } catch (err: any) {
      setAiStatus({
        online: false,
        provider: 'none',
        endpoint: customEndpoint ?? config.endpointUrl,
        models: [],
        message: err.message || 'Koneksi gagal',
      })
    } finally {
      setCheckingStatus(false)
    }
  }

  async function loadDirectoryContext() {
    setLoadingContext(true)
    try {
      const res = await fetchDirectoryContext(currentFolderId, config.fetchLiveDrive)
      setDirectoryContext(res)
    } catch {
      // Ignored
    } finally {
      setLoadingContext(false)
    }
  }

  function updateConfig(newVals: Partial<LocalAiConfig>) {
    const updated = saveLocalAiConfig(newVals)
    setConfig(updated)
  }

  function handleSend(overridePrompt?: string) {
    const textToSend = (overridePrompt ?? inputText).trim()
    if (!textToSend || isStreaming) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    }

    const assistantMsgId = `assistant-${Date.now()}`
    const assistantPlaceholder: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg, assistantPlaceholder])
    setInputText('')
    setIsStreaming(true)

    const controller = new AbortController()
    setAbortController(controller)

    // Build conversation history for context
    const history = messages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }))

    streamDirectoryChat({
      folderId: currentFolderId,
      question: textToSend,
      fetchLiveDrive: config.fetchLiveDrive,
      conversationHistory: history,
      signal: controller.signal,
      onToken: (token) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: msg.content + token } : msg
          )
        )
      },
      onError: (errMsg) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content:
                    msg.content ||
                    `⚠️ **Gagal mendapatkan respons:**\n${errMsg}\n\n*Tips: Pastikan Ollama aktif di terminal Anda dengan menjalankan:*\n\`ollama run ${config.selectedModel || 'llama3.2'}\``,
                }
              : msg
          )
        )
      },
      onDone: () => {
        setIsStreaming(false)
        setAbortController(null)
      },
    })
  }

  function handleStop() {
    if (abortController) {
      abortController.abort()
      setIsStreaming(false)
      setAbortController(null)
    }
  }

  function handleCopy(id: string, text: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function handleClearChat() {
    setMessages([])
  }

  if (!isOpen) return null

  const quickChips = [
    { label: 'Ringkas isi folder', prompt: 'Tolong ringkas isi folder ini: jenis berkas apa saja yang ada, jumlahnya, dan total ukuran seluruh berkas.' },
    { label: 'Kategori & ukuran berkas', prompt: 'Tolong analisis rincian kategori jenis berkas dan hitung ukuran masing-masing kategori di dalam folder ini.' },
    { label: 'Daftar berkas terbaru', prompt: 'Tampilkan berkas-berkas yang paling baru diubah di folder ini beserta tanggal modifikasinya.' },
    { label: 'Struktur subfolder', prompt: 'Jelaskan bagaimana struktur subfolder di dalam folder ini dan susunan organisasinya.' },
  ]

  return (
    <div
      className={cn(
        'fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:bg-[#1E1F20] dark:border-l dark:border-[#36373A]',
        'border-l border-[#E0E3E7]'
      )}
      role="dialog"
      aria-labelledby="tanya-ai-title"
      aria-modal="true"
    >
      {/* 1. Header (Material Design 3 Style) */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#E0E3E7] px-4 dark:border-[#36373A]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8F0FE] text-[#0B57D0] dark:bg-[#0B57D0]/20 dark:text-[#8AB4F8]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 id="tanya-ai-title" className="text-sm font-semibold text-[#1F1F1F] dark:text-[#E3E3E3]">
              Tanya AI
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] text-[#444746] dark:text-[#C4C7C5]">
              <Folder className="h-3 w-3 text-[#5F6368] dark:text-[#8E918F]" />
              <span className="max-w-[150px] truncate font-medium">
                {currentFolderName}
              </span>
              {loadingContext ? (
                <span className="text-[#747775] dark:text-[#8E918F] flex items-center gap-1">
                  <RefreshCw className="h-2.5 w-2.5 animate-spin text-[#0B57D0]" />
                  <span>{language === 'id' ? 'memuat...' : 'loading...'}</span>
                </span>
              ) : directoryContext ? (
                <span className="text-[#747775] dark:text-[#8E918F]">
                  • {directoryContext.stats.totalFiles} {language === 'id' ? 'berkas' : 'files'}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-[#444746] transition-colors hover:bg-[#F0F4F9] dark:text-[#C4C7C5] dark:hover:bg-[#28292A]',
              showSettings && 'bg-[#E8F0FE] text-[#0B57D0] dark:bg-[#28292A]'
            )}
            title="Pengaturan Local AI"
            aria-label="Pengaturan Local AI"
          >
            <Settings2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#444746] transition-colors hover:bg-[#F0F4F9] dark:text-[#C4C7C5] dark:hover:bg-[#28292A]"
            title="Tutup panel"
            aria-label="Tutup panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. Settings Collapsible Section */}
      {showSettings && (
        <div className="border-b border-[#E0E3E7] bg-[#F8FAFD] p-3 text-xs dark:border-[#36373A] dark:bg-[#28292A]">
          <div className="mb-2 flex items-center justify-between font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
            <span>Setelan Runner AI Lokal</span>
            <button
              type="button"
              onClick={() => refreshAiStatus()}
              disabled={checkingStatus}
              className="flex items-center gap-1 text-[11px] text-[#0B57D0] hover:underline dark:text-[#8AB4F8]"
            >
              <RefreshCw className={cn('h-3 w-3', checkingStatus && 'animate-spin')} />
              <span>Cek Ulang</span>
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <label htmlFor={endpointInputId} className="block text-[11px] text-[#444746] dark:text-[#C4C7C5] mb-1">
                Endpoint URL (Ollama / Local Server)
              </label>
              <input
                id={endpointInputId}
                type="text"
                value={config.endpointUrl}
                onChange={(e) => updateConfig({ endpointUrl: e.target.value })}
                placeholder="http://localhost:11434"
                className="w-full rounded-lg border border-[#E0E3E7] bg-white px-2.5 py-1 text-xs text-[#1F1F1F] outline-none focus:border-[#0B57D0] dark:border-[#36373A] dark:bg-[#1E1F20] dark:text-[#E3E3E3]"
              />
            </div>

            <div>
              <label htmlFor={modelSelectId} className="block text-[11px] text-[#444746] dark:text-[#C4C7C5] mb-1">
                Model Local AI
              </label>
              {aiStatus?.models && aiStatus.models.length > 0 ? (
                <select
                  id={modelSelectId}
                  value={config.selectedModel}
                  onChange={(e) => updateConfig({ selectedModel: e.target.value })}
                  className="w-full rounded-lg border border-[#E0E3E7] bg-white px-2 py-1 text-xs text-[#1F1F1F] outline-none focus:border-[#0B57D0] dark:border-[#36373A] dark:bg-[#1E1F20] dark:text-[#E3E3E3]"
                >
                  {aiStatus.models.map((mod) => (
                    <option key={mod} value={mod}>
                      {mod}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={modelSelectId}
                  type="text"
                  value={config.selectedModel}
                  onChange={(e) => updateConfig({ selectedModel: e.target.value })}
                  placeholder="llama3.2 atau qwen2.5"
                  className="w-full rounded-lg border border-[#E0E3E7] bg-white px-2.5 py-1 text-xs text-[#1F1F1F] outline-none focus:border-[#0B57D0] dark:border-[#36373A] dark:bg-[#1E1F20] dark:text-[#E3E3E3]"
                />
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="live-sync-toggle"
                checked={config.fetchLiveDrive}
                onChange={(e) => {
                  updateConfig({ fetchLiveDrive: e.target.checked })
                  loadDirectoryContext()
                }}
                className="rounded border-[#E0E3E7] text-[#0B57D0]"
              />
              <label htmlFor="live-sync-toggle" className="text-[11px] text-[#444746] dark:text-[#C4C7C5] cursor-pointer">
                Live Sync dari Google Drive (bila baru saja upload di cloud)
              </label>
            </div>

            {/* Connection Status Indicator */}
            <div className="mt-2 rounded-lg border border-[#E0E3E7] bg-white p-2 text-[11px] dark:border-[#36373A] dark:bg-[#1E1F20]">
              {checkingStatus ? (
                <p className="flex items-center gap-1.5 text-[#747775]">
                  <RefreshCw className="h-3 w-3 animate-spin text-[#0B57D0]" />
                  Sedang memeriksa koneksi Local AI...
                </p>
              ) : aiStatus?.online ? (
                <p className="flex items-center gap-1.5 text-[#0F9D58] font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Terhubung ke {aiStatus.provider === 'ollama' ? 'Ollama' : 'Server AI'} ({aiStatus.models.length} model terdeteksi)
                </p>
              ) : (
                <div className="text-[#EA4335] space-y-1">
                  <p className="flex items-center gap-1.5 font-medium">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Runner AI Lokal Offline
                  </p>
                  <p className="text-[10px] text-[#747775] dark:text-[#8E918F]">
                    Buka terminal dan jalankan: <code className="bg-[#F0F4F9] px-1 rounded dark:bg-[#28292A]">ollama run {config.selectedModel || 'llama3.2'}</code>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Messages & Conversation Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {/* Welcome Banner when empty */}
        {messages.length === 0 && (
          <div className="space-y-4 pt-2">
            <div className="rounded-2xl border border-[#E0E3E7] bg-[#F8FAFD] p-4 text-center dark:border-[#36373A] dark:bg-[#28292A]">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#E8F0FE] text-[#0B57D0] dark:bg-[#0B57D0]/20 dark:text-[#8AB4F8] mb-2">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#1F1F1F] dark:text-[#E3E3E3]">
                Asisten Cerdas Folder
              </h3>
              <p className="mt-1 text-xs text-[#444746] dark:text-[#C4C7C5] leading-relaxed">
                Tanyakan apa saja tentang struktur berkas, kategori, atau minta ringkasan lengkap isi folder <strong className="text-[#1F1F1F] dark:text-[#E3E3E3] font-medium">"{currentFolderName}"</strong>.
              </p>
            </div>

            {/* Quick Prompt Chips */}
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#747775] dark:text-[#8E918F]">
                Rekomendasi Pertanyaan
              </p>
              <div className="flex flex-col gap-1.5">
                {quickChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(chip.prompt)}
                    className="flex items-center justify-between rounded-xl border border-[#E0E3E7] bg-white px-3 py-2 text-left text-xs font-normal text-[#1F1F1F] transition-all hover:border-[#0B57D0] hover:bg-[#F0F4F9] dark:border-[#36373A] dark:bg-[#1E1F20] dark:text-[#E3E3E3] dark:hover:bg-[#28292A]"
                  >
                    <span>{chip.label}</span>
                    <span className="text-[#0B57D0] dark:text-[#8AB4F8] text-[11px]">→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex flex-col',
              msg.role === 'user' ? 'items-end' : 'items-start'
            )}
          >
            <div
              className={cn(
                'max-w-[88%] rounded-2xl p-3 text-xs transition-all',
                msg.role === 'user'
                  ? 'bg-[#C2E7FF] text-[#001D35] dark:bg-[#004A77] dark:text-[#C2E7FF] rounded-tr-sm'
                  : 'bg-[#F8FAFD] border border-[#E0E3E7] text-[#1F1F1F] dark:bg-[#28292A] dark:border-[#36373A] dark:text-[#E3E3E3] rounded-tl-sm'
              )}
            >
              {msg.role === 'assistant' ? (
                <div>
                  {msg.content ? (
                    <SimpleMarkdown content={msg.content} />
                  ) : (
                    <div className="flex items-center gap-1.5 py-1 text-[#747775] dark:text-[#8E918F]">
                      <RefreshCw className="h-3 w-3 animate-spin text-[#0B57D0]" />
                      <span>Sedang menganalisis direktori...</span>
                    </div>
                  )}
                  {msg.content && (
                    <div className="mt-2 flex justify-end border-t border-[#E0E3E7] pt-1.5 dark:border-[#36373A]">
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="flex items-center gap-1 text-[10px] text-[#747775] hover:text-[#1F1F1F] dark:text-[#8E918F] dark:hover:text-[#E3E3E3]"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="h-3 w-3 text-[#0F9D58]" />
                            <span>Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
            <span className="mt-1 px-1 text-[10px] text-[#747775] dark:text-[#8E918F]">
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Input Area */}
      <div className="shrink-0 border-t border-[#E0E3E7] bg-white p-3 dark:border-[#36373A] dark:bg-[#1E1F20]">
        {messages.length > 0 && (
          <div className="mb-2 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={handleClearChat}
              disabled={isStreaming}
              className="flex items-center gap-1 text-[11px] text-[#747775] hover:text-[#EA4335] dark:text-[#8E918F]"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Bersihkan riwayat</span>
            </button>

            <span className="text-[10px] text-[#747775] dark:text-[#8E918F]">
              Model: {config.selectedModel || 'llama3.2'}
            </span>
          </div>
        )}

        <div className="relative flex items-center rounded-2xl border border-[#E0E3E7] bg-[#F8FAFD] p-1.5 focus-within:border-[#0B57D0] focus-within:bg-white focus-within:shadow-sm dark:border-[#36373A] dark:bg-[#28292A] dark:focus-within:bg-[#1E1F20]">
          <label htmlFor={textareaId} className="sr-only">Pertanyaan untuk AI</label>
          <textarea
            id={textareaId}
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Tanyakan tentang folder ini..."
            className="max-h-24 min-h-[38px] w-full resize-none bg-transparent px-3 py-2 text-xs text-[#1F1F1F] outline-none placeholder:text-[#747775] dark:text-[#E3E3E3] dark:placeholder:text-[#8E918F]"
          />

          {isStreaming ? (
            <button
              type="button"
              onClick={handleStop}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EA4335] text-white transition-all hover:bg-[#D93025]"
              title="Hentikan pembuatan"
              aria-label="Hentikan pembuatan"
            >
              <Square className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!inputText.trim()}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all',
                inputText.trim()
                  ? 'bg-[#0B57D0] text-white hover:bg-[#0842A0] active:scale-95'
                  : 'bg-[#E0E3E7] text-[#747775] cursor-not-allowed dark:bg-[#36373A] dark:text-[#8E918F]'
              )}
              title="Kirim pesan"
              aria-label="Kirim pesan"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
