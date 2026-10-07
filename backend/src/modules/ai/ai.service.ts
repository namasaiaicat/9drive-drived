import { google } from 'googleapis'
import { prisma } from '../../config/prisma.js'
import { getAuthedGoogleClient, ensureGoogleAppFolder } from '../google/google.service.js'

export type LocalAiStatus = {
  online: boolean
  provider: 'ollama' | 'openai-compatible' | 'none'
  endpoint: string
  models: string[]
  defaultModel?: string
  message?: string
}

export type FileCategoryBreakdown = {
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

export type DirectoryContextResult = {
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
    categories: FileCategoryBreakdown
  }
  subfolders: Array<{
    id: string
    name: string
    updatedAt: string
  }>
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

function formatBytes(input: bigint | number | string | null | undefined): string {
  if (input === null || input === undefined) return '0 B'
  const bytes = Number(input)
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`
}

function categorizeMime(mimeType: string, fileName: string): keyof FileCategoryBreakdown {
  const mime = mimeType.toLowerCase()
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''

  if (
    mime.includes('pdf') ||
    mime.includes('word') ||
    mime.includes('officedocument.wordprocessing') ||
    ['doc', 'docx', 'pdf', 'rtf', 'odt'].includes(ext)
  ) {
    return 'documents'
  }
  if (
    mime.includes('sheet') ||
    mime.includes('excel') ||
    mime.includes('csv') ||
    ['xls', 'xlsx', 'csv', 'ods'].includes(ext)
  ) {
    return 'spreadsheets'
  }
  if (
    mime.includes('presentation') ||
    mime.includes('powerpoint') ||
    ['ppt', 'pptx', 'odp'].includes(ext)
  ) {
    return 'presentations'
  }
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return 'images'
  }
  if (mime.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) {
    return 'videos'
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) {
    return 'audio'
  }
  if (
    mime.includes('zip') ||
    mime.includes('tar') ||
    mime.includes('gzip') ||
    mime.includes('rar') ||
    mime.includes('7z') ||
    ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)
  ) {
    return 'archives'
  }
  if (
    mime.startsWith('text/') ||
    ['json', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py', 'java', 'c', 'cpp', 'rs', 'go', 'sql', 'yaml', 'yml', 'md', 'txt'].includes(ext)
  ) {
    return 'codeAndData'
  }
  return 'others'
}

/**
 * Checks connectivity to local AI runner (Ollama or OpenAI-compatible endpoint).
 */
export async function checkLocalAiStatus(endpointUrl?: string): Promise<LocalAiStatus> {
  const base = (endpointUrl || 'http://localhost:11434').replace(/\/+$/, '')

  // 1. Try Ollama endpoint (/api/tags)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)
    const res = await fetch(`${base}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (res.ok) {
      const data = (await res.json()) as { models?: Array<{ name: string }> }
      const modelList = Array.isArray(data.models) ? data.models.map((m) => m.name) : []
      return {
        online: true,
        provider: 'ollama',
        endpoint: base,
        models: modelList,
        defaultModel: modelList[0] || 'llama3.2',
      }
    }
  } catch {
    // Continue to OpenAI check
  }

  // 2. Try OpenAI-compatible endpoint (/v1/models or /models)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)
    const res = await fetch(`${base}/v1/models`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (res.ok) {
      const data = (await res.json()) as { data?: Array<{ id: string }> }
      const modelList = Array.isArray(data.data) ? data.data.map((m) => m.id) : []
      return {
        online: true,
        provider: 'openai-compatible',
        endpoint: base,
        models: modelList,
        defaultModel: modelList[0] || 'default',
      }
    }
  } catch {
    // Failed
  }

  return {
    online: false,
    provider: 'none',
    endpoint: base,
    models: [],
    message: `Local AI tidak merespons di ${base}. Pastikan runner seperti Ollama sedang aktif di komputer Anda.`,
  }
}

/**
 * Builds structured directory context for a folder or the root directory.
 */
export async function getDirectoryContext(
  userId: string,
  folderId?: string | null,
  fetchLiveDrive: boolean = false
): Promise<DirectoryContextResult> {
  let targetFolder: { id: string; name: string; parentId: string | null; providerFolderId: string | null; connectedAccountId: string | null } | null = null
  let pathSegments: string[] = ['My Drive']

  if (folderId) {
    targetFolder = await prisma.folder.findFirst({
      where: { id: folderId, userId, deletedAt: null },
      select: { id: true, name: true, parentId: true, providerFolderId: true, connectedAccountId: true },
    })

    if (targetFolder) {
      // Build breadcrumbs path
      const pathList: string[] = [targetFolder.name]
      let currentParentId = targetFolder.parentId
      let safetyCount = 0

      while (currentParentId && safetyCount < 20) {
        safetyCount++
        const parent = await prisma.folder.findFirst({
          where: { id: currentParentId, userId, deletedAt: null },
          select: { id: true, name: true, parentId: true },
        })
        if (!parent) break
        pathList.unshift(parent.name)
        currentParentId = parent.parentId
      }
      pathSegments = ['My Drive', ...pathList]
    }
  }

  const folderName = targetFolder ? targetFolder.name : 'My Drive (Root)'
  const folderPath = pathSegments.join(' / ')

  // Fetch child folders from DB
  const subfolderRecords = await prisma.folder.findMany({
    where: {
      userId,
      deletedAt: null,
      parentId: folderId ?? null,
    },
    select: { id: true, name: true, providerFolderId: true, updatedAt: true },
    orderBy: { name: 'asc' },
  })

  // Fetch files from DB
  let fileRecords = await prisma.file.findMany({
    where: {
      userId,
      status: 'active',
      folderId: folderId ?? null,
    },
    select: {
      id: true,
      name: true,
      mimeType: true,
      sizeBytes: true,
      updatedAt: true,
      provider: true,
      providerFileId: true,
    },
    orderBy: { updatedAt: 'desc' },
  })

  // Optional: Live fetch from Google Drive
  let liveDriveInfo: string = ''
  if (fetchLiveDrive) {
    try {
      const connectedAccount = await prisma.connectedAccount.findFirst({
        where: { userId, provider: 'google_drive', status: 'connected' },
      })

      if (connectedAccount) {
        const auth = await getAuthedGoogleClient(connectedAccount)
        const drive = google.drive({ version: 'v3', auth })

        const googleParentId = targetFolder?.providerFolderId
          ? targetFolder.providerFolderId
          : await ensureGoogleAppFolder(connectedAccount)

        const driveList = await drive.files.list({
          q: `'${googleParentId}' in parents and trashed = false`,
          fields: 'files(id, name, mimeType, size, modifiedTime)',
          pageSize: 100,
        })

        const driveFiles = driveList.data.files ?? []
        liveDriveInfo = `(Google Drive Live Sync: Ditemukan ${driveFiles.length} item langsung dari cloud Google Drive)`
      }
    } catch (err: any) {
      liveDriveInfo = `(Google Drive Live Sync gagal: ${err.message || 'Koneksi error'})`
    }
  }

  // Calculate statistics
  let totalBytes = 0n
  const categories: FileCategoryBreakdown = {
    documents: 0,
    spreadsheets: 0,
    presentations: 0,
    images: 0,
    videos: 0,
    audio: 0,
    archives: 0,
    codeAndData: 0,
    others: 0,
  }

  for (const file of fileRecords) {
    totalBytes += file.sizeBytes
    const cat = categorizeMime(file.mimeType, file.name)
    categories[cat]++
  }

  const subfolders = subfolderRecords.map((s) => ({
    id: s.id,
    name: s.name,
    updatedAt: s.updatedAt.toISOString(),
  }))

  const files = fileRecords.map((f) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes.toString(),
    sizeFormatted: formatBytes(f.sizeBytes),
    updatedAt: f.updatedAt.toISOString(),
  }))

  // Generate plain text manifest for the LLM
  const manifestLines: string[] = [
    `=== RINGKASAN DIREKTORI ===`,
    `Folder: "${folderName}"`,
    `Hierarki Path: ${folderPath}`,
    `Jumlah Subfolder: ${subfolders.length}`,
    `Jumlah Berkas: ${files.length}`,
    `Total Ukuran Berkas: ${formatBytes(totalBytes)}`,
  ]

  if (liveDriveInfo) {
    manifestLines.push(liveDriveInfo)
  }

  manifestLines.push(
    `Distribusi Jenis Berkas:`,
    `- Dokumen / PDF: ${categories.documents}`,
    `- Lembar Sebar / Excel: ${categories.spreadsheets}`,
    `- Presentasi / Slide: ${categories.presentations}`,
    `- Gambar & Foto: ${categories.images}`,
    `- Video: ${categories.videos}`,
    `- Audio / Musik: ${categories.audio}`,
    `- Berkas Terkompresi (ZIP/RAR): ${categories.archives}`,
    `- Kode & Teks: ${categories.codeAndData}`,
    `- Lainnya: ${categories.others}`
  )

  if (subfolders.length > 0) {
    manifestLines.push(`\nDaftar Subfolder (${subfolders.length} item):`)
    subfolders.forEach((s, idx) => {
      manifestLines.push(`  ${idx + 1}. [Folder] ${s.name}`)
    })
  } else {
    manifestLines.push(`\nSubfolder: Tidak ada subfolder di sini.`)
  }

  if (files.length > 0) {
    manifestLines.push(`\nDaftar Berkas Teratas (Maksimal 60 berkas):`)
    files.slice(0, 60).forEach((f, idx) => {
      manifestLines.push(`  ${idx + 1}. ${f.name} (${f.sizeFormatted}, diubah: ${f.updatedAt.slice(0, 10)})`)
    })
    if (files.length > 60) {
      manifestLines.push(`  ... dan ${files.length - 60} berkas lainnya.`)
    }
  } else {
    manifestLines.push(`\nDaftar Berkas: Folder ini kosong (belum ada berkas).`)
  }

  return {
    folder: {
      id: targetFolder ? targetFolder.id : null,
      name: folderName,
      path: folderPath,
      providerFolderId: targetFolder?.providerFolderId ?? null,
    },
    stats: {
      totalFiles: files.length,
      totalSubfolders: subfolders.length,
      totalSizeBytes: totalBytes.toString(),
      totalSizeFormatted: formatBytes(totalBytes),
      categories,
    },
    subfolders,
    files,
    textManifest: manifestLines.join('\n'),
  }
}

/**
 * Streams chat completion from Local AI (Ollama or OpenAI-compatible).
 */
export async function streamLocalAiChat(options: {
  endpointUrl?: string
  modelName?: string
  question: string
  directoryManifest: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  onToken: (token: string) => void
  onComplete: () => void
  onError: (err: Error) => void
}) {
  const {
    endpointUrl,
    modelName = 'llama3.2',
    question,
    directoryManifest,
    conversationHistory = [],
    onToken,
    onComplete,
    onError,
  } = options

  const status = await checkLocalAiStatus(endpointUrl)
  if (!status.online) {
    onError(new Error(status.message || 'Local AI tidak dapat dihubungi.'))
    return
  }

  const systemPrompt = `Anda adalah "Tanya AI", asisten pintar untuk sistem cloud storage 9Drive.
Tugas Anda adalah menganalisis, menjelaskan, meringkas, dan menjawab pertanyaan pengguna tentang struktur direktori dan isi berkas pada folder yang diberikan di bawah ini.

DATA DIREKTORI SAAT INI:
${directoryManifest}

PEDOMAN MENJAWAB:
1. Berikan jawaban yang ramah, informatif, tepat, dan terstruktur rapi.
2. Gunakan format Markdown yang jelas (seperti bullet points, bold untuk nama berkas penting, atau tabel jika membandingkan ukuran/kategori).
3. Jika pengguna bertanya tentang jenis file atau ringkasan, sebutkan total ukuran dan jumlah item.
4. Jika ada file duplikat atau berkas berukuran besar, sorot informasi tersebut untuk membantu pengguna mengelola ruang penyimpanan.
5. Jawab dalam Bahasa Indonesia yang alami, santai, dan profesional (atau sesuaikan dengan bahasa yang digunakan pengguna saat bertanya).`

  if (status.provider === 'ollama') {
    const activeModel = modelName || status.defaultModel || 'llama3.2'
    const ollamaUrl = `${status.endpoint}/api/chat`

    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: question },
      ]

      const res = await fetch(ollamaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: activeModel,
          messages,
          stream: true,
        }),
      })

      if (!res.ok || !res.body) {
        throw new Error(`Ollama API error: status ${res.status} ${res.statusText}`)
      }

      const reader = res.body.getReader()
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
          if (!trimmed) continue
          try {
            const parsed = JSON.parse(trimmed) as { message?: { content?: string }; done?: boolean }
            if (parsed.message?.content) {
              onToken(parsed.message.content)
            }
            if (parsed.done) {
              onComplete()
              return
            }
          } catch {
            // Ignore partial parse
          }
        }
      }

      onComplete()
    } catch (err: any) {
      onError(err)
    }
  } else {
    // OpenAI-compatible endpoint
    const activeModel = modelName || status.defaultModel || 'default'
    const openAiUrl = `${status.endpoint}/v1/chat/completions`

    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: question },
      ]

      const res = await fetch(openAiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: activeModel,
          messages,
          stream: true,
        }),
      })

      if (!res.ok || !res.body) {
        throw new Error(`OpenAI-compatible API error: status ${res.status} ${res.statusText}`)
      }

      const reader = res.body.getReader()
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
            onComplete()
            return
          }
          try {
            const parsed = JSON.parse(dataStr) as { choices?: Array<{ delta?: { content?: string } }> }
            const token = parsed.choices?.[0]?.delta?.content
            if (token) {
              onToken(token)
            }
          } catch {
            // Ignore partial JSON
          }
        }
      }

      onComplete()
    } catch (err: any) {
      onError(err)
    }
  }
}
