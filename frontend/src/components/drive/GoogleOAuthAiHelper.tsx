import { useState } from 'react'
import {
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/context/ToastContext'
import { useLanguage } from '@/context/LanguageContext'

function ChatGptIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1683a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4947zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1683a.0757.0757 0 0 1-.071 0l-4.8303-2.7866A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.6669zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1635a.0804.0804 0 0 1-.038-.0567V6.0748a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.4598a.7948.7948 0 0 0-.3927.6813v6.7219zm1.093-2.221l2.6056-1.5031 2.6056 1.5031v3.0062l-2.6056 1.5031-2.6056-1.5031z"/>
    </svg>
  )
}

interface GoogleOAuthAiHelperProps {
  redirectUri?: string
  showSummaryChecklist?: boolean
  className?: string
}

export function GoogleOAuthAiHelper({
  redirectUri: customRedirectUri,
  showSummaryChecklist = true,
  className = '',
}: GoogleOAuthAiHelperProps) {
  const { toast } = useToast()
  const { language } = useLanguage()
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [copiedUri, setCopiedUri] = useState(false)
  const [showPromptPreview, setShowPromptPreview] = useState(false)

  const activeRedirectUri =
    customRedirectUri ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/connected-accounts/google/callback`
      : 'http://localhost:9999/connected-accounts/google/callback')

  const githubRepoUrl = 'https://github.com/namasaiaicat/9drive-drived'

  const promptText =
    language === 'id'
      ? `Halo AI! Saya sedang menjalankan aplikasi self-hosted cloud storage 9Drive (Repositori GitHub: ${githubRepoUrl}) di localhost.

Aplikasi ini membutuhkan kredensial Google OAuth 2.0 (Client ID & Client Secret) agar dapat menghubungkan akun Google Drive sebagai penyimpanan pribadi.

Tolong pandu saya langkah demi langkah secara mendetail di Google Cloud Console (https://console.cloud.google.com):

1. Cara membuat project baru di Google Cloud Console.
2. Cara mengaktifkan Google Drive API di menu APIs & Services > Library.
3. Cara konfigurasi OAuth Consent Screen (Pilih User Type: External):
   - PENTING: Pada kolom 'App name', JANGAN gunakan kata 'Drive' atau 'Google' (misal jangan pakai '9Drive'), karena Google otomatis menolaknya karena pelanggaran hak cipta/merek dagang. Gunakan nama aman seperti 'Personal Storage', 'MyCloud', atau 'NineCloud'.
4. LANGKAH PALING KRUSIAL (LOCALHOST / TESTING):
   Banyak panduan setup terbatas hanya meminta memasukkan Client ID & Secret, padahal karena aplikasi ini berjalan di localhost dengan status 'Testing', Google akan memblokir login dengan error '403: access_denied' (Access blocked) jika akun belum didaftarkan sebagai tester!
   Tolong pandu saya secara spesifik:
   - Masuk ke halaman 'Audience' (atau menu 'OAuth consent screen' di sidebar).
   - Scroll ke bagian bawah sampai ke bagian tabel 'Test users'.
   - Klik tombol '+ ADD USERS'.
   - Masukkan alamat Gmail yang ingin saya koneksikan ke 9Drive.
   - Klik tombol 'SAVE'.
5. Cara membuat Credentials -> OAuth Client ID:
   - Buka menu Credentials > Create Credentials > OAuth client ID.
   - Pilih Application type: 'Web application'.
   - Pada bagian 'Authorized redirect URIs', masukkan URL localhost ini:
     ${activeRedirectUri}
   - Klik Create.
6. Di mana saya menyalin Client ID dan Client Secret yang dihasilkan untuk dimasukkan ke 9Drive.

Tolong jelaskan secara runut, jelas, dan santai!`
      : `Hello AI! I am running the self-hosted personal cloud storage application 9Drive (GitHub Repository: ${githubRepoUrl}) on localhost.

This app requires Google OAuth 2.0 credentials (Client ID & Client Secret) to connect Google Drive accounts as personal storage.

Please guide me step-by-step through setting this up in Google Cloud Console (https://console.cloud.google.com):

1. How to create a new project in Google Cloud Console.
2. How to enable Google Drive API in APIs & Services > Library.
3. How to configure OAuth Consent Screen (Choose User Type: External):
   - IMPORTANT: For 'App name', DO NOT use the word 'Drive' or 'Google' (avoid '9Drive'), as Google automatically rejects it due to trademark brand restrictions. Use a generic name like 'Personal Storage', 'MyCloud', or 'NineCloud'.
4. CRITICAL STEP FOR LOCALHOST / TESTING (Audience > Test Users):
   Most standard setup tutorials only explain creating credentials, but because 9Drive is running on localhost in 'Testing' mode, Google strictly blocks login with a '403: access_denied' error unless the user's Gmail is registered as a tester!
   Please guide me:
   - Navigate to the 'Audience' page (or 'OAuth consent screen' in the sidebar).
   - Scroll down to the 'Test users' section.
   - Click '+ ADD USERS'.
   - Enter the Gmail address I want to connect to 9Drive.
   - Click 'SAVE'.
5. How to create Credentials -> OAuth Client ID:
   - Go to Credentials > Create Credentials > OAuth client ID.
   - Choose Application type: 'Web application'.
   - In 'Authorized redirect URIs', add this exact URI:
     ${activeRedirectUri}
   - Click Create.
6. Where to find and copy the generated Client ID and Client Secret into 9Drive Settings.

Please provide clear, step-by-step instructions!`

  function copyPromptToClipboard() {
    navigator.clipboard.writeText(promptText)
    setCopiedPrompt(true)
    setTimeout(() => setCopiedPrompt(false), 2000)
    toast.success(
      language === 'id'
        ? 'Prompt AI berhasil disalin!'
        : 'AI prompt copied to clipboard!'
    )
  }

  function handleOpenChatGPT() {
    copyPromptToClipboard()
    const chatGptUrl = `https://chatgpt.com/?q=${encodeURIComponent(promptText)}`
    window.open(chatGptUrl, '_blank', 'noopener,noreferrer')
  }

  function copyRedirectUri() {
    navigator.clipboard.writeText(activeRedirectUri)
    setCopiedUri(true)
    setTimeout(() => setCopiedUri(false), 2000)
    toast.success(
      language === 'id'
        ? 'Redirect URI disalin!'
        : 'Redirect URI copied!'
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Top Action Row: Minimalist Subtitle + "Tanya AI" Button */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[#444746] dark:text-[#C4C7C5]">
          {language === 'id'
            ? 'Ikuti langkah cepat berikut atau tanyakan langsung pada AI:'
            : 'Follow these quick steps or ask AI directly:'}
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            size="sm"
            onClick={handleOpenChatGPT}
            className="h-8 gap-1.5 rounded-full bg-[#10A37F] hover:bg-[#0E8A6B] px-3.5 text-xs font-medium text-white shadow-none transition-colors"
          >
            <ChatGptIcon className="h-3.5 w-3.5" />
            <span>Tanya AI</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={copyPromptToClipboard}
            className="h-8 w-8 rounded-full p-0 text-[#747775] hover:bg-[#F0F4F9] hover:text-[#1F1F1F] dark:text-[#8E918F] dark:hover:bg-[#282A2C] dark:hover:text-[#E3E3E3]"
            title={language === 'id' ? 'Salin teks prompt' : 'Copy prompt text'}
          >
            {copiedPrompt ? (
              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Clean Material Design 3 Steps Card */}
      {showSummaryChecklist && (
        <div className="rounded-2xl border border-[#E0E3E7] bg-white p-4 text-xs dark:border-[#36373A] dark:bg-[#1E1F20]">
          <div className="space-y-3">
            {/* Step 1 */}
            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F0F4F9] text-[11px] font-semibold text-[#0B57D0] dark:bg-[#282A2C] dark:text-[#A8C7FA]">
                1
              </span>
              <div className="text-[12px] leading-relaxed text-[#444746] dark:text-[#C4C7C5]">
                Buka{' '}
                <a
                  href="https://console.cloud.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#0B57D0] hover:underline dark:text-[#A8C7FA] inline-flex items-center gap-0.5"
                >
                  Google Cloud Console <ExternalLink className="h-2.5 w-2.5" />
                </a>
                , buat Project, lalu aktifkan <strong>Google Drive API</strong> di menu Library.
                <span className="block mt-0.5 text-[11px] text-[#747775] dark:text-[#8E918F]">
                  (Tips: Saat isi App Name di OAuth consent screen, hindari kata <em>&apos;Drive&apos;</em> atau <em>&apos;Google&apos;</em> agar tidak ditolak).
                </span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F0F4F9] text-[11px] font-semibold text-[#0B57D0] dark:bg-[#282A2C] dark:text-[#A8C7FA]">
                2
              </span>
              <div className="flex-1 space-y-1.5 text-[12px] leading-relaxed text-[#444746] dark:text-[#C4C7C5]">
                <div>
                  Buat Credentials &gt; OAuth client ID (<strong>Web application</strong>), lalu masukkan <strong>Authorized redirect URI</strong>:
                </div>
                <div className="flex items-center justify-between gap-2 rounded-xl border border-[#E0E3E7] bg-[#F8FAFD] p-1.5 pl-3 font-mono text-[11px] text-[#0B57D0] dark:border-[#36373A] dark:bg-[#131314] dark:text-[#A8C7FA]">
                  <span className="truncate select-all">{activeRedirectUri}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={copyRedirectUri}
                    className="h-7 shrink-0 gap-1 rounded-full px-2.5 text-[11px] text-[#444746] hover:bg-[#E9EEF6] dark:text-[#C4C7C5] dark:hover:bg-[#282A2C]"
                  >
                    {copiedUri ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedUri ? (language === 'id' ? 'Tersalin' : 'Copied') : (language === 'id' ? 'Salin' : 'Copy')}</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 3 (Crucial for Localhost) */}
            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FEEFC3] text-[11px] font-bold text-[#7A4B04] dark:bg-[#3D2E0B] dark:text-[#FDD663]">
                3
              </span>
              <div className="text-[12px] leading-relaxed text-[#444746] dark:text-[#C4C7C5]">
                <strong className="text-[#1F1F1F] dark:text-[#E3E3E3]">
                  Wajib untuk Localhost:
                </strong>{' '}
                Masuk ke menu <strong>Audience</strong> (atau OAuth consent screen) &gt; scroll ke <strong>Test users</strong> &gt; klik <strong>+ Add Users</strong>, masukkan email Gmail Anda dan klik <strong>Save</strong> agar tidak error 403 access_denied.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtle Collapsible Prompt Preview */}
      <div className="pt-0.5">
        <button
          type="button"
          onClick={() => setShowPromptPreview(!showPromptPreview)}
          className="inline-flex items-center gap-1 text-[11px] text-[#747775] hover:text-[#1F1F1F] dark:text-[#8E918F] dark:hover:text-[#E3E3E3] transition-colors"
        >
          {showPromptPreview ? (
            <>
              <ChevronUp className="h-3 w-3" />
              <span>{language === 'id' ? 'Sembunyikan teks prompt' : 'Hide prompt text'}</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              <span>{language === 'id' ? 'Lihat draf teks prompt' : 'View prompt text'}</span>
            </>
          )}
        </button>

        {showPromptPreview && (
          <div className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-[#E0E3E7] bg-[#F8FAFD] p-3 font-mono text-[11px] leading-relaxed text-[#444746] select-all dark:border-[#36373A] dark:bg-[#131314] dark:text-[#C4C7C5] whitespace-pre-wrap">
            {promptText}
          </div>
        )}
      </div>
    </div>
  )
}
