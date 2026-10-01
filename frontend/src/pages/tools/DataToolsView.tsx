import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Binary,
  ChevronRight,
  Copy,
  FileCode,
  Fingerprint,
  Loader2,
} from 'lucide-react'
import {
  calculateHash,
  csvToJson,
  fileToBase64,
  jsonToCsv,
} from '@/lib/tools/data-service'
import { Button } from '@/components/ui/button'
import { useToast } from '@/context/ToastContext'

type DataSubTool = 'csv-json' | 'hash' | 'base64'

export function DataToolsView() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()

  const currentTool = (searchParams.get('mode') as DataSubTool) || 'csv-json'
  const setTool = (mode: DataSubTool) => {
    setSearchParams({ mode })
  }

  // CSV/JSON State
  const [csvInput, setCsvInput] = useState(`name,email,role\nAlice,alice@example.com,Admin\nBob,bob@example.com,Editor`)
  const [jsonOutput, setJsonOutput] = useState('')

  // Hash State
  const [hashFile, setHashFile] = useState<File | null>(null)
  const [hashSha256, setHashSha256] = useState('')
  const [hashSha1, setHashSha1] = useState('')
  const [calculatingHash, setCalculatingHash] = useState(false)

  // Base64 State
  const [base64File, setBase64File] = useState<File | null>(null)
  const [base64Result, setBase64Result] = useState('')

  const handleCsvToJson = () => {
    try {
      const res = csvToJson(csvInput)
      setJsonOutput(res)
      toast.success('Berhasil mengubah CSV ke JSON!')
    } catch {
      toast.error('Format CSV tidak valid')
    }
  }

  const handleJsonToCsv = () => {
    try {
      const res = jsonToCsv(jsonOutput || csvInput)
      setCsvInput(res)
      toast.success('Berhasil mengubah JSON ke CSV!')
    } catch {
      toast.error('Format JSON array tidak valid')
    }
  }

  const handleHashFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setHashFile(file)
      setCalculatingHash(true)
      try {
        const sha256 = await calculateHash(file, 'SHA-256')
        const sha1 = await calculateHash(file, 'SHA-1')
        setHashSha256(sha256)
        setHashSha1(sha1)
      } catch {
        toast.error('Gagal menghitung hash')
      } finally {
        setCalculatingHash(false)
      }
    }
  }

  const handleBase64FileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setBase64File(file)
      try {
        const str = await fileToBase64(file)
        setBase64Result(str)
        toast.success('Data URI Base64 berhasil dibuat!')
      } catch {
        toast.error('Gagal mengonversi file')
      }
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} disalin ke clipboard!`)
  }

  const subtools = [
    { id: 'csv-json' as const, label: 'CSV ⇄ JSON Converter', icon: FileCode },
    { id: 'hash' as const, label: 'File Hash & Checksum', icon: Fingerprint },
    { id: 'base64' as const, label: 'Base64 Encoder', icon: Binary },
  ]

  const activeSubtoolObj = subtools.find((t) => t.id === currentTool)

  return (
    <div className="flex flex-col min-h-full w-full min-w-0">
      {/* Google Drive Breadcrumbs Header */}
      <div className="flex flex-col gap-2 pb-3 border-b border-[#E0E3E7]/70 dark:border-[#36373A]/70 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/tools')}
            className="text-xl sm:text-[22px] font-normal transition-colors text-[#444746] hover:text-[#0B57D0] dark:text-[#C4C7C5]"
          >
            Tools Studio
          </button>
          <ChevronRight className="h-4 w-4 text-[#747775] shrink-0" />
          <span className="truncate text-xl sm:text-[22px] font-normal text-[#1F1F1F] dark:text-[#E3E3E3]">
            {activeSubtoolObj?.label}
          </span>
        </div>
      </div>

      {/* Subtools Selector Pills (Material 3 Chip format) */}
      <div className="flex items-center gap-2 py-4 overflow-x-auto">
        {subtools.map((t) => {
          const Icon = t.icon
          const isActive = currentTool === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTool(t.id)}
              className={`flex items-center gap-2 h-8 px-4 rounded-full text-xs font-medium whitespace-nowrap transition-all border select-none ${
                isActive
                  ? 'bg-[#C2E7FF] text-[#001D35] border-[#C2E7FF] dark:bg-[#004A77] dark:text-[#C2E7FF] dark:border-[#004A77]'
                  : 'bg-transparent text-[#444746] border-[#E0E3E7] hover:bg-[#F0F4F9] dark:text-[#C4C7C5] dark:border-[#36373A] dark:hover:bg-[#28292A]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tool Content */}
      <div className="flex-1 mt-1">
        {currentTool === 'csv-json' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">Input CSV:</span>
                <Button size="sm" variant="outline" onClick={handleCsvToJson} className="h-7 text-xs rounded-lg">
                  Konversi ke JSON →
                </Button>
              </div>
              <textarea
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                className="w-full h-80 p-3 text-xs font-mono rounded-xl border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20] text-[#1F1F1F] dark:text-[#E3E3E3] resize-none focus:outline-none focus:ring-2 focus:ring-[#0B57D0]"
              />
            </div>

            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">Output JSON:</span>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={handleJsonToCsv} className="h-7 text-xs rounded-lg">
                    ← Konversi ke CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(jsonOutput, 'JSON')}
                    disabled={!jsonOutput}
                    className="h-7 text-xs rounded-lg"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <textarea
                value={jsonOutput}
                onChange={(e) => setJsonOutput(e.target.value)}
                placeholder="Klik tombol konversi untuk melihat hasil..."
                className="w-full h-80 p-3 text-xs font-mono rounded-xl border border-[#E0E3E7] dark:border-[#36373A] bg-[#F8FAFD] dark:bg-[#18191A] text-[#1F1F1F] dark:text-[#E3E3E3] resize-none focus:outline-none focus:ring-2 focus:ring-[#0B57D0]"
              />
            </div>
          </div>
        )}

        {currentTool === 'hash' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <label className="flex flex-col items-center justify-center p-8 border border-dashed border-[#E0E3E7] dark:border-[#36373A] rounded-2xl bg-[#F8FAFD] dark:bg-[#1E1F20] cursor-pointer hover:border-[#0B57D0] transition-colors text-center">
              <input type="file" onChange={handleHashFileChange} className="hidden" />
              {calculatingHash ? (
                <Loader2 className="w-8 h-8 animate-spin text-[#0B57D0] mb-2" />
              ) : (
                <Fingerprint className="w-8 h-8 text-[#0B57D0] mb-2" />
              )}
              <p className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                {hashFile ? hashFile.name : 'Pilih atau drop berkas apa saja untuk menghitung hash'}
              </p>
              <p className="text-[11px] text-[#747775] mt-1">
                {calculatingHash ? 'Sedang menghitung hash...' : 'Dihitung secara aman langsung di browser'}
              </p>
            </label>

            {hashSha256 && (
              <div className="p-4 rounded-2xl bg-white dark:bg-[#1E1F20] border border-[#E0E3E7] dark:border-[#36373A] space-y-3">
                <div>
                  <span className="text-[11px] font-semibold text-[#747775] uppercase">SHA-256:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs font-mono bg-[#F0F4F9] dark:bg-[#28292A] p-2 rounded-lg flex-1 break-all select-all text-[#1F1F1F] dark:text-[#E3E3E3]">
                      {hashSha256}
                    </code>
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(hashSha256, 'SHA-256')}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-[#747775] uppercase">SHA-1:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs font-mono bg-[#F0F4F9] dark:bg-[#28292A] p-2 rounded-lg flex-1 break-all select-all text-[#1F1F1F] dark:text-[#E3E3E3]">
                      {hashSha1}
                    </code>
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(hashSha1, 'SHA-1')}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentTool === 'base64' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <label className="flex flex-col items-center justify-center p-8 border border-dashed border-[#E0E3E7] dark:border-[#36373A] rounded-2xl bg-[#F8FAFD] dark:bg-[#1E1F20] cursor-pointer hover:border-[#0B57D0] transition-colors text-center">
              <input type="file" onChange={handleBase64FileChange} className="hidden" />
              <Binary className="w-8 h-8 text-[#0B57D0] mb-2" />
              <p className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                {base64File ? base64File.name : 'Pilih berkas atau foto untuk di-encode ke Base64'}
              </p>
              <p className="text-[11px] text-[#747775] mt-1">Berguna untuk data URI gambar pada HTML/CSS</p>
            </label>

            {base64Result && (
              <div className="p-4 rounded-2xl bg-white dark:bg-[#1E1F20] border border-[#E0E3E7] dark:border-[#36373A] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">Hasil Base64:</span>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(base64Result, 'Base64')}>
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Salin
                  </Button>
                </div>
                <textarea
                  readOnly
                  value={base64Result}
                  className="w-full h-40 p-3 text-xs font-mono rounded-xl bg-[#F8FAFD] dark:bg-[#18191A] border border-[#E0E3E7] dark:border-[#36373A] text-[#1F1F1F] dark:text-[#E3E3E3] resize-none select-all focus:outline-none"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
