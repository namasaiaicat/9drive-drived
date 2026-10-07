import { API_URL } from './api'
import { getAccessToken } from './auth'

export type LocalAiConfig = {
  endpointUrl: string
  selectedModel: string
  fetchLiveDrive: boolean
}

export type LocalAiStatusResponse = {
  online: boolean
  provider: 'ollama' | 'openai-compatible' | 'none'
  endpoint: string
  models: string[]
  defaultModel?: string
  message?: string
}

export type DirectoryContextResponse = {
  folder: {
    id: string | null
    name: string
    path: string
    providerFolderId: string | null
  }
  stats: {
    totalFiles: number
    totalSubfolders: number
    totalSizeBytes: string
    totalSizeFormatted: string
    categories: {
      documents: number
      spreadsheets: number
      presentations: number
      images: number
      videos: number
      audio: number
      archives: number
      codeAndData: number
      others: number
    }
  }
  subfolders: Array<{ id: string; name: string; updatedAt: string }>
  files: Array<{
    id: string
    name: string
    mimeType: string
    sizeBytes: string
    sizeFormatted: string
    updatedAt: string
  }>
  textManifest: string
}

const AI_CONFIG_KEY = '9drive:local-ai-config'

export function getLocalAiConfig(): LocalAiConfig {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        endpointUrl: parsed.endpointUrl || 'http://localhost:11434',
        selectedModel: parsed.selectedModel || '',
        fetchLiveDrive: Boolean(parsed.fetchLiveDrive),
      }
    }
  } catch {}
  return {
    endpointUrl: 'http://localhost:11434',
    selectedModel: '',
    fetchLiveDrive: false,
  }
}

export function saveLocalAiConfig(config: Partial<LocalAiConfig>) {
  const current = getLocalAiConfig()
  const updated = { ...current, ...config }
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(updated))
  return updated
}

/**
 * Checks connection to local AI runner.
 */
export async function checkLocalAiStatus(customEndpoint?: string): Promise<LocalAiStatusResponse> {
  const token = getAccessToken()
  const endpoint = customEndpoint ?? getLocalAiConfig().endpointUrl
  const url = `${API_URL}/ai/status?endpoint=${encodeURIComponent(endpoint)}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Gagal memeriksa status Local AI')
  }

  return response.json() as Promise<LocalAiStatusResponse>
}

/**
 * Fetches structured directory context for a folder.
 */
export async function fetchDirectoryContext(
  folderId?: string | null,
  fetchLiveDrive?: boolean
): Promise<DirectoryContextResponse> {
  const token = getAccessToken()
  const config = getLocalAiConfig()
  const response = await fetch(`${API_URL}/ai/folder-context`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      folderId: folderId ?? null,
      fetchLiveDrive: fetchLiveDrive ?? config.fetchLiveDrive,
    }),
  })

  if (!response.ok) {
    throw new Error('Gagal mengambil data struktur direktori')
  }

  return response.json() as Promise<DirectoryContextResponse>
}

/**
 * Streams chat response from backend /ai/chat.
 */
export async function streamDirectoryChat(params: {
  folderId?: string | null
  question: string
  fetchLiveDrive?: boolean
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  signal?: AbortSignal
  onMeta?: (meta: { folderName: string; stats: any }) => void
  onToken: (token: string) => void
  onError: (error: string) => void
  onDone: () => void
}) {
  const token = getAccessToken()
  const config = getLocalAiConfig()

  try {
    const response = await fetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      signal: params.signal,
      body: JSON.stringify({
        folderId: params.folderId ?? null,
        question: params.question,
        fetchLiveDrive: params.fetchLiveDrive ?? config.fetchLiveDrive,
        endpointUrl: config.endpointUrl,
        modelName: config.selectedModel || undefined,
        conversationHistory: params.conversationHistory || [],
      }),
    })

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({ message: response.statusText }))
      params.onError(errJson.message || 'Gagal memulai obrolan dengan Local AI')
      params.onDone()
      return
    }

    if (!response.body) {
      params.onError('Tidak ada aliran data respons dari server')
      params.onDone()
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const dataStr = trimmed.slice(6).trim()
        if (dataStr === '[DONE]') {
          params.onDone()
          return
        }

        try {
          const parsed = JSON.parse(dataStr)
          if (parsed.type === 'token' && typeof parsed.token === 'string') {
            params.onToken(parsed.token)
          } else if (parsed.type === 'meta' && params.onMeta) {
            params.onMeta(parsed)
          } else if (parsed.type === 'error' && typeof parsed.message === 'string') {
            params.onError(parsed.message)
          }
        } catch {
          // Ignore partial chunk parsing errors
        }
      }
    }

    params.onDone()
  } catch (error: any) {
    if (error.name === 'AbortError') {
      params.onDone()
      return
    }
    params.onError(error.message || 'Terjadi kesalahan saat streaming respons AI')
    params.onDone()
  }
}
