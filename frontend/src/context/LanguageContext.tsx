import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { toolTranslations } from '@/context/tool-translations'

export type Language = 'en' | 'id'

type Translations = Record<string, Record<Language, string>>

const translations: Translations = {
  ...toolTranslations,
  'auth.sign_in': { en: 'Sign in', id: 'Masuk' },
  'auth.signing_in': { en: 'Signing in…', id: 'Sedang masuk…' },
  'auth.create_account': { en: 'Create account', id: 'Buat akun' },
  'auth.creating': { en: 'Creating account…', id: 'Membuat akun…' },
  'auth.continue': { en: 'to continue to 9Drive', id: 'untuk melanjutkan ke 9Drive' },
  'auth.start': { en: 'to start using 9Drive', id: 'untuk mulai menggunakan 9Drive' },
  'auth.password': { en: 'Password', id: 'Kata sandi' },
  'auth.enter_password': { en: 'Enter your password', id: 'Masukkan kata sandi' },
  'auth.choose_password': { en: 'Choose a strong password', id: 'Buat kata sandi yang kuat' },
  'auth.name': { en: 'Your name', id: 'Nama Anda' },
  'auth.full_name': { en: 'First and last name', id: 'Nama lengkap' },
  'auth.sign_in_instead': { en: 'Sign in instead', id: 'Sudah punya akun? Masuk' },
  'auth.redirecting': { en: 'Redirecting…', id: 'Mengalihkan…' },
  'auth.google_sign_in': { en: 'Sign in with Google', id: 'Masuk dengan Google' },
  'auth.google_sign_up': { en: 'Sign up with Google', id: 'Daftar dengan Google' },
  'settings.default_account': { en: 'Default storage account', id: 'Akun penyimpanan utama' },
  'settings.all_accounts': { en: 'All accounts (show all files)', id: 'Semua akun (tampilkan semua file)' },
  'settings.set_default': { en: 'Set as default', id: 'Jadikan akun utama' },
  'selection.limit': { en: 'Select up to 100 files per action.', id: 'Pilih maksimal 100 file untuk setiap tindakan.' },
  'table.select_first_100': { en: 'Select first 100 files', id: 'Pilih 100 file pertama' },
  'table.select_displayed': { en: 'Select displayed files', id: 'Pilih file yang ditampilkan' },
  'table.storage_account': { en: 'Storage account', id: 'Akun penyimpanan' },
  'drawer.storage_account': { en: 'Storage account', id: 'Akun penyimpanan' },
  'drawer.file_id': { en: 'File ID', id: 'ID file' },
  'settings.account': { en: '9Drive account', id: 'Akun 9Drive' },
  'action.loading': { en: 'Loading…', id: 'Memuat…' },
  'action.retry': { en: 'Retry', id: 'Coba lagi' },
  'quota.last_synced': { en: 'Last synced', id: 'Terakhir diperbarui' },
  'quota.not_synced': { en: 'Not synced yet', id: 'Belum diperbarui' },
  // Navigation
  'nav.my_drive': { en: 'My Drive', id: 'Drive Saya' },
  'nav.tools': { en: 'Tools Studio', id: 'Studio Alat' },
  'nav.shared': { en: 'Shared with me', id: 'Dibagikan kepada saya' },
  'nav.recent': { en: 'Recent', id: 'Terbaru' },
  'nav.starred': { en: 'Starred', id: 'Berbintang' },
  'nav.trash': { en: 'Trash', id: 'Sampah' },
  'nav.storage': { en: 'Storage', id: 'Penyimpanan' },
  'nav.activity': { en: 'Activity', id: 'Aktivitas' },
  'nav.settings': { en: 'Settings', id: 'Pengaturan' },
  'nav.api_keys': { en: 'API Keys', id: 'Kunci API' },
  'nav.sign_out': { en: 'Sign out', id: 'Keluar' },

  // Actions
  'action.new': { en: 'New', id: 'Baru' },
  'action.new_folder': { en: 'New folder', id: 'Folder baru' },
  'action.file_upload': { en: 'File upload', id: 'Upload file' },
  'action.folder_upload': { en: 'Folder upload', id: 'Upload folder' },
  'action.download': { en: 'Download', id: 'Unduh' },
  'action.rename': { en: 'Rename', id: 'Ganti nama' },
  'action.delete': { en: 'Delete', id: 'Hapus' },
  'action.share': { en: 'Share', id: 'Bagikan' },
  'action.copy_link': { en: 'Copy link', id: 'Salin link' },
  'action.link_copied_access': { en: 'Link copied. Existing access permissions apply.', id: 'Tautan disalin. Izin akses tetap berlaku.' },
  'action.download_zip': { en: 'Download ZIP', id: 'Unduh ZIP' },
  'action.cancel': { en: 'Cancel', id: 'Batal' },
  'action.save': { en: 'Save', id: 'Simpan' },
  'action.close': { en: 'Close', id: 'Tutup' },
  'action.sync': { en: 'Sync', id: 'Sinkronkan' },
  'action.syncing': { en: 'Syncing...', id: 'Menyinkronkan...' },
  'action.disconnect': { en: 'Disconnect', id: 'Putuskan' },
  'action.upload': { en: 'Upload', id: 'Unggah' },
  'action.create': { en: 'Create', id: 'Buat' },
  'action.ok': { en: 'OK', id: 'Oke' },
  'action.move_here': { en: 'Move here', id: 'Pindahkan ke sini' },
  'action.open': { en: 'Open', id: 'Buka' },
  'action.copy': { en: 'Copy', id: 'Salin' },
  'action.copied': { en: 'Copied!', id: 'Tersalin!' },
  'action.select_all': { en: 'Select all', id: 'Pilih semua' },
  'action.selected': { en: 'selected', id: 'dipilih' },

  // Sections
  'section.folders': { en: 'Folders', id: 'Folder' },
  'section.files': { en: 'Files', id: 'File' },

  // Search
  'search.placeholder': { en: 'Search in Drive', id: 'Telusuri di Drive' },
  'search.showing_results': { en: 'Showing search results for', id: 'Menampilkan hasil pencarian untuk' },
  'search.in_all_accounts': { en: 'across all drive accounts', id: 'di seluruh akun drive' },
  'search.search_all_accounts': { en: 'Search across all drive accounts', id: 'Cari di seluruh akun drive' },
  'search.clear_search': { en: 'Clear Search', id: 'Hapus Pencarian' },

  // Table Headers
  'table.name': { en: 'Name', id: 'Nama' },
  'table.location': { en: 'Location', id: 'Lokasi' },
  'table.owner': { en: 'Owner', id: 'Pemilik' },
  'table.last_opened': { en: 'Last opened', id: 'Terakhir dibuka' },
  'table.starred_on': { en: 'Starred on', id: 'Dibintangi pada' },
  'table.last_modified': { en: 'Last modified', id: 'Terakhir diubah' },
  'table.file_size': { en: 'File size', id: 'Ukuran file' },
  'table.sharing': { en: 'Sharing', id: 'Berbagi' },
  'table.select_all_files': { en: 'Select all files', id: 'Pilih semua file' },

  // Context Menus
  'menu.open_in_gdrive': { en: 'Open in Google Drive', id: 'Buka di Google Drive' },
  'menu.preview': { en: 'Preview', id: 'Pratinjau' },
  'menu.download': { en: 'Download', id: 'Unduh' },
  'menu.remove_bg': { en: 'Remove Background (AI)', id: 'Hapus Latar Belakang (AI)' },
  'menu.convert_pdf': { en: 'Convert to PDF', id: 'Konversi ke PDF' },
  'menu.process_pdf': { en: 'Process with PDF Tools', id: 'Proses dengan Alat PDF' },
  'menu.rename': { en: 'Rename', id: 'Ganti nama' },
  'menu.move_to': { en: 'Move to', id: 'Pindahkan ke' },
  'menu.cut_folder': { en: 'Move / Cut', id: 'Pindahkan / Potong' },
  'menu.paste_folder': { en: 'Paste folder here', id: 'Tempel folder di sini' },
  'menu.file_info': { en: 'File information', id: 'Informasi file' },
  'menu.share': { en: 'Share', id: 'Bagikan' },
  'menu.copy_link': { en: 'Copy link', id: 'Salin link' },
  'menu.copy_cdn': { en: 'Copy CDN Direct URL', id: 'Salin URL Langsung CDN' },
  'menu.move_to_trash': { en: 'Move to trash', id: 'Pindahkan ke sampah' },

  // Drag and Drop
  'drag.drop_to_upload': { en: 'Drop files to instantly upload', id: 'Lepaskan berkas untuk langsung mengunggah' },
  'drag.will_upload_to': { en: 'Will upload to:', id: 'Akan diunggah ke:' },

  // Empty States
  'empty.all_files_title': { en: 'A place for all of your files', id: 'Tempat untuk semua file Anda' },
  'empty.all_files_desc': { en: 'Drag your files here or use the "+ New" button on the left to upload.', id: 'Tarik file Anda ke sini atau gunakan tombol "+ Baru" di sebelah kiri untuk mengunggah.' },
  'empty.folder_empty': { en: 'This folder is empty. Drag files here or use the "+ New" button to upload.', id: 'Folder ini kosong. Tarik file ke sini atau gunakan tombol "+ Baru" untuk mengunggah.' },
  'empty.no_search_results': { en: 'No files found matching your search.', id: 'Tidak ada file yang cocok dengan pencarian Anda.' },

  // Trash Page
  'trash.title': { en: 'Trash', id: 'Sampah' },
  'trash.info_bar': { en: 'Items in trash are deleted forever after 30 days.', id: 'Item di sampah akan dihapus selamanya setelah 30 hari.' },
  'trash.empty_title': { en: 'Trash is empty', id: 'Sampah kosong' },
  'trash.empty_desc': { en: 'Items moved to the trash will show up here.', id: 'Item yang dipindahkan ke sampah akan muncul di sini.' },
  'trash.restore': { en: 'Restore', id: 'Pulihkan' },
  'trash.delete_forever': { en: 'Delete forever', id: 'Hapus selamanya' },
  'trash.empty_trash': { en: 'Empty trash', id: 'Kosongkan sampah' },
  'trash.storage_account': { en: 'Storage account', id: 'Akun penyimpanan' },
  'trash.original_size': { en: 'Original size', id: 'Ukuran asli' },
  'trash.date_trashed': { en: 'Date trashed', id: 'Tanggal dihapus' },
  'trash.actions': { en: 'Actions', id: 'Aksi' },

  // File Details Drawer
  'drawer.details': { en: 'Details', id: 'Detail' },
  'drawer.file_details': { en: 'File details', id: 'Detail file' },
  'drawer.type': { en: 'Type', id: 'Tipe' },
  'drawer.size': { en: 'Size', id: 'Ukuran' },
  'drawer.location': { en: 'Location', id: 'Lokasi' },
  'drawer.owner': { en: 'Owner', id: 'Pemilik' },
  'drawer.modified': { en: 'Modified', id: 'Diubah' },
  'drawer.storage_provider': { en: 'Storage provider', id: 'Penyedia penyimpanan' },
  'drawer.cdn_direct': { en: 'CDN Direct URL', id: 'URL Langsung CDN' },
  'drawer.cdn_desc': { en: 'Direct embed for <img> tags, web apps, and platforms.', id: 'Embed langsung untuk tag <img>, aplikasi web, dan platform.' },
  'drawer.gdrive_link': { en: 'Google Drive Link', id: 'Link Google Drive' },
  'drawer.select_file': { en: 'Select a file to see details', id: 'Pilih file untuk melihat detail' },

  // Modals
  'modal.upload_title': { en: 'Upload File', id: 'Upload File' },
  'modal.upload_desc': { en: 'Stream file directly to selected Google Drive account.', id: 'Alirkan file langsung ke akun Google Drive yang dipilih.' },
  'modal.drop_or_browse': { en: 'Drop files here or click to browse', id: 'Tarik file ke sini atau klik untuk memilih' },
  'modal.target_account': { en: 'Target Storage Account', id: 'Akun Penyimpanan Tujuan' },
  'modal.auto_account': { en: 'Automatic (Default)', id: 'Otomatis (Default)' },
  'modal.virtual_folder': { en: 'Virtual Folder', id: 'Folder Virtual' },
  'modal.no_folder': { en: 'No folder', id: 'Tanpa folder' },
  'modal.uploading_to': { en: 'Uploading to:', id: 'Mengunggah ke:' },
  'modal.new_folder_title': { en: 'New Folder', id: 'Folder Baru' },
  'modal.new_folder_desc': { en: 'Create a virtual folder for organizing files.', id: 'Buat folder virtual untuk mengorganisasi file.' },
  'modal.folder_name': { en: 'Folder Name', id: 'Nama Folder' },
  'modal.untitled_folder': { en: 'Untitled folder', id: 'Folder tanpa judul' },
  'modal.rename_title': { en: 'Rename', id: 'Ganti Nama' },
  'modal.move_title': { en: 'Move', id: 'Pindahkan' },
  'modal.delete_file_title': { en: 'Move to trash?', id: 'Pindahkan ke sampah?' },
  'modal.delete_folder_title': { en: 'Delete folder?', id: 'Hapus folder?' },

  // Storage Banner Alert
  'alert.no_storage_title': { en: 'No Storage Connected', id: 'Penyimpanan Belum Terhubung' },
  'alert.no_storage_desc': {
    en: '9Drive requires at least one active storage account (Google Drive or S3 Storage) to start uploading and managing files.',
    id: '9Drive memerlukan minimal satu akun penyimpanan aktif (Google Drive atau S3 Storage) untuk mulai mengunggah dan mengelola file.',
  },
  'alert.setup_badge': { en: 'Setup Required', id: 'Setup Awal' },
  'alert.test_users_title': { en: 'Google Cloud Console Note (Testing Mode):', id: 'Catatan Google Cloud Console (Mode Testing):' },
  'alert.test_users_desc': {
    en: 'If your Google Console app status is still "Testing", your Gmail account must be added to OAuth Consent Screen > Test Users. Otherwise Google will block access with error "403: access_denied".',
    id: 'Jika status aplikasi di Google Console masih Testing, akun Gmail Anda wajib didaftarkan di menu OAuth Consent Screen > Test Users. Tanpa ini, Google akan memblokir login dengan error "403: access_denied".',
  },
  'alert.open_settings': { en: 'Open Settings & Connect', id: 'Buka Pengaturan & Hubungkan' },
  'alert.guide_btn': { en: 'Google Console Setup Guide', id: 'Panduan Setup Google Console' },

  // Settings
  'settings.title': { en: 'Settings', id: 'Pengaturan' },
  'settings.language_title': { en: 'Language / Bahasa', id: 'Bahasa / Language' },
  'settings.language_desc': { en: 'Select your preferred interface language.', id: 'Pilih bahasa tampilan antarmuka yang Anda inginkan.' },
  'settings.lang_en': { en: 'English (Default)', id: 'English (Default)' },
  'settings.lang_id': { en: 'Bahasa Indonesia', id: 'Bahasa Indonesia' },
  'settings.google_title': { en: 'Google Drive', id: 'Google Drive' },
  'settings.google_desc': {
    en: 'Connect Google Drive accounts. 9Drive routes uploads to accounts with available quota.',
    id: 'Hubungkan akun Google Drive. 9Drive mengarahkan unggahan ke akun dengan sisa kuota terbanyak.',
  },
  'settings.connect_drive': { en: 'Connect Drive', id: 'Hubungkan Drive' },
  'settings.s3_title': { en: 'S3 Compatible Storage', id: 'Penyimpanan Kompatibel S3' },
  'settings.s3_desc': {
    en: 'Connect AWS S3, Cloudflare R2, MinIO, Wasabi, Backblaze B2, or custom endpoint storage.',
    id: 'Hubungkan AWS S3, Cloudflare R2, MinIO, Wasabi, Backblaze B2, atau endpoint storage kustom.',
  },
  'settings.connect_s3': { en: 'Connect S3', id: 'Hubungkan S3' },
  'settings.connected_accounts': { en: 'Connected Storage Accounts', id: 'Akun Penyimpanan Terhubung' },
  'settings.no_accounts': { en: 'No connected storage account yet.', id: 'Belum ada akun penyimpanan terhubung.' },
  'settings.default_account_title': { en: 'Platform Default Account', id: 'Akun Default Platform' },
  'settings.default_account_desc': {
    en: 'Choose which connected account is selected by default when opening 9Drive.',
    id: 'Pilih akun yang otomatis aktif secara default setiap kali membuka 9Drive.',
  },
  'settings.oauth_creds_title': { en: 'Google OAuth Credentials', id: 'Kredensial OAuth Google' },

  // Additional Actions & Filters
  'action.clear_selection': { en: 'Clear selection', id: 'Batal pilihan' },
  'action.refresh': { en: 'Refresh', id: 'Segarkan' },
  'action.refreshing': { en: 'Refreshing...', id: 'Menyegarkan...' },
  'action.done': { en: 'Done', id: 'Selesai' },
  'action.send': { en: 'Send', id: 'Kirim' },
  'action.up': { en: 'Up', id: 'Naik' },
  'action.down': { en: 'Down', id: 'Turun' },
  'filter.all': { en: 'Type: All', id: 'Tipe: Semua' },
  'filter.docs': { en: 'Documents', id: 'Dokumen' },
  'filter.images': { en: 'Images', id: 'Gambar' },
  'filter.videos': { en: 'Videos', id: 'Video' },
  'filter.pdfs': { en: 'PDFs', id: 'PDF' },

  // Starred Page
  'starred.empty_title': { en: 'No starred files', id: 'Belum ada file berbintang' },
  'starred.empty_desc': {
    en: 'Add stars to files that you want to easily find later.',
    id: 'Beri bintang pada file yang ingin Anda temukan dengan mudah nanti.',
  },

  // Shared Page
  'shared.title': { en: 'Shared with me', id: 'Dibagikan kepada saya' },
  'shared.tab_files': { en: 'Google Drive Files', id: 'File Google Drive' },
  'shared.tab_invites': { en: 'Workspace Invites', id: 'Undangan Workspace' },
  'shared.items': { en: 'items', id: 'item' },
  'shared.empty_title': { en: 'No files shared with you', id: 'Tidak ada file yang dibagikan kepada Anda' },
  'shared.empty_desc': {
    en: 'Files shared to your connected accounts will appear here.',
    id: 'File yang dibagikan ke akun terhubung Anda akan muncul di sini.',
  },
  'shared.sent_invites': { en: 'Sent Invites', id: 'Undangan Terkirim' },
  'shared.received_invites': { en: 'Received Invites', id: 'Undangan Diterima' },
  'shared.no_sent': { en: 'No sent invites', id: 'Tidak ada undangan terkirim' },
  'shared.no_received': { en: 'No pending invites received', id: 'Tidak ada undangan tertunda' },

  // Activity Log Page
  'activity.title': { en: 'Activity Log', id: 'Log Aktivitas' },
  'activity.desc': {
    en: 'Audit trail of file activities, moves, syncs, and deletions.',
    id: 'Jejak audit aktivitas file, pemindahan, sinkronisasi, dan penghapusan.',
  },
  'activity.trail_title': { en: 'Recent Activity Trail', id: 'Jejak Aktivitas Terkini' },
  'activity.loading': { en: 'Loading activity logs...', id: 'Memuat log aktivitas...' },
  'activity.empty_title': { en: 'No activity yet', id: 'Belum ada aktivitas' },
  'activity.empty_desc': {
    en: 'Actions you perform on files and folders will appear here.',
    id: 'Tindakan yang Anda lakukan pada file dan folder akan muncul di sini.',
  },

  // Storage / Quota Tracker Page
  'quota.title': { en: 'Storage', id: 'Penyimpanan' },
  'quota.desc': {
    en: 'Monitor combined Google Drive storage quota and routing.',
    id: 'Pantau gabungan kuota penyimpanan dan perutean Google Drive.',
  },
  'quota.auto_refresh': { en: 'Auto-refresh', id: 'Segarkan Otomatis' },
  'quota.total_usage': { en: 'Total Storage Usage', id: 'Total Penggunaan Penyimpanan' },
  'quota.of_used': { en: 'of', id: 'dari' },
  'quota.used_label': { en: 'used', id: 'terpakai' },
  'quota.free_label': { en: 'free', id: 'tersedia' },
  'quota.connected_accounts': { en: 'connected account(s)', id: 'akun terhubung' },
  'quota.routing_policy': { en: 'Upload Routing Policy', id: 'Kebijakan Perutean Unggah' },
  'quota.routing_desc': {
    en: 'Define which connected Google Drive account receives uploads.',
    id: 'Tentukan akun Google Drive mana yang diprioritaskan menerima berkas unggahan.',
  },
  'quota.mode_most_available': { en: 'Most available free space', id: 'Ruang kosong terbanyak' },
  'quota.mode_round_robin': { en: 'Round robin', id: 'Bergantian (Round robin)' },
  'quota.mode_priority': { en: 'Priority order', id: 'Urutan prioritas' },
  'quota.no_accounts': { en: 'No connected accounts yet.', id: 'Belum ada akun terhubung.' },

  // API Management Page
  'api_keys.title': { en: 'API Keys', id: 'Kunci API' },
  'api_keys.desc': {
    en: 'Manage programmatic API keys and webhook access.',
    id: 'Kelola kunci API dan akses webhook untuk integrasi otomatis.',
  },
  'api_keys.generate_btn': { en: 'Generate New Key', id: 'Buat Kunci Baru' },
  'api_keys.docs_btn': { en: 'Documentation', id: 'Dokumentasi' },
  'api_keys.env_var': { en: 'API environment variable', id: 'Variabel lingkungan API' },
  'api_keys.table_name': { en: 'Key Name', id: 'Nama Kunci' },
  'api_keys.table_created': { en: 'Date Created', id: 'Tanggal Dibuat' },
  'api_keys.table_prefix': { en: 'API Key (Prefix)', id: 'Kunci API (Awalan)' },
  'api_keys.table_secret': { en: 'API Secret', id: 'Secret API' },
  'api_keys.table_status': { en: 'Status', id: 'Status' },
  'api_keys.table_actions': { en: 'Actions', id: 'Aksi' },
  'api_keys.empty_title': { en: 'No API keys generated yet', id: 'Belum ada kunci API yang dibuat' },
  'api_keys.empty_desc': {
    en: 'Click "Generate New Key" above to create one.',
    id: 'Klik "Buat Kunci Baru" di atas untuk membuatnya.',
  },

  // Share Modal
  'share_modal.title': { en: 'Share', id: 'Bagikan' },
  'share_modal.add_people': {
    en: 'Add people, groups, or calendar events',
    id: 'Tambahkan orang, grup, atau acara kalender',
  },
  'share_modal.people_with_access': { en: 'People with access', id: 'Orang yang memiliki akses' },
  'share_modal.general_access': { en: 'General access', id: 'Akses umum' },
  'share_modal.restricted': { en: 'Restricted', id: 'Dibatasi' },
  'share_modal.anyone': { en: 'Anyone with the link', id: 'Siapa saja yang memiliki link' },
  'share_modal.viewer': { en: 'Viewer', id: 'Pelihat' },
  'share_modal.editor': { en: 'Editor', id: 'Editor' },
  'share_modal.owner': { en: 'Owner', id: 'Pemilik' },
  'share_modal.you': { en: 'you', id: 'Anda' },
  'share_modal.copy_link': { en: 'Copy link', id: 'Salin link' },
  'share_modal.link_copied': { en: 'Link copied', id: 'Link disalin' },
  'share_modal.cascade_title': {
    en: 'Change parent folder access to Restricted?',
    id: 'Ubah akses folder induk ke Restricted?',
  },
  'share_modal.cascade_desc': {
    en: 'This file inherits public access from parent folder. Changing it to Restricted will make the parent folder and all files inside it Restricted as well.',
    id: 'File ini mewarisi hak akses publik dari folder induk. Mengubahnya ke Restricted akan membuat folder induk beserta seluruh file di dalamnya ikut menjadi Restricted.',
  },
  'share_modal.cascade_confirm': { en: 'Change Parent Folder', id: 'Ubah Folder Induk' },
}

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, fallback?: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const STORAGE_KEY = '9drive:language'

export function LanguageProvider({ children }: { children: ReactNode }) {
  // English is the default language as requested
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'id' || stored === 'en') return stored
    } catch {}
    return 'en'
  })

  useEffect(() => { document.documentElement.lang = language }, [language])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {}
  }

  const t = (key: string, fallback?: string): string => {
    const item = translations[key]
    if (item && item[language]) {
      return item[language]
    }
    return fallback ?? key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
