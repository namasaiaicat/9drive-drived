import type { Dictionary } from '../../types';

export const dictionary: Dictionary = {
  meta: {
    title: '9Drive - Penyimpanan Cloud Pribadi & Universal API Gateway',
    description: 'Penyimpanan cloud pribadi mandiri dan universal API gateway yang menggabungkan banyak akun Google Drive dengan streaming lokal dan privasi penuh.',
    canonicalUrl: 'https://9drive.dev/id',
    ogLocale: 'id_ID',
    ogAlternateLocale: 'en_US',
    ogImage: 'https://9drive.dev/og-image.png',
    twitterImage: 'https://9drive.dev/og-image.png',
  },
  nav: {
    showcase: 'Showcase',
    features: 'Fitur',
    install: 'Instalasi',
    faq: 'FAQ',
    github: 'GitHub',
    languageToggleAria: 'Ganti bahasa',
    themeToggleAria: 'Ubah tema tampilan',
    menuOpenAria: 'Buka menu navigasi',
    menuCloseAria: 'Tutup menu navigasi',
  },
  hero: {
    badge: '9Drive v1.0 • Alternatif Google Drive Mandiri',
    title: 'Penyimpanan Cloud Pribadimu,',
    highlight: 'Aktif dalam Hitungan Detik.',
    subtitle: 'Gabungkan beberapa akun Google Drive menjadi satu penyimpanan cloud berkecepatan tinggi dengan caching lokal, streaming CDN, dan akses gateway kompatibel S3.',
    installCta: 'Pasang CLI',
    githubCta: 'Lihat di GitHub',
  },
  showcase: {
    sectionTitle: 'Tampilan Familiar, Privasi Penuh',
    sectionSubtitle: 'Nikmati antarmuka Material Design 3 yang bersih dan berjalan sepenuhnya di komputer lokalmu.',
    tabs: [
      {
        id: 'web-ui',
        title: 'Dashboard Web',
        caption: 'Antarmuka Google Drive Material Design 3 di localhost:8080.',
        image: {
          src: '/showcase/dashboard.webp',
          srcSet: '/showcase/dashboard.webp 1x, /showcase/dashboard@2x.webp 2x',
          alt: '9Drive Web Dashboard running locally on localhost showing Google Drive Material Design interface with folders and file list',
          width: 1920,
          height: 1200,
        },
      },
      {
        id: 'file-explorer',
        title: 'Eksplorer File',
        caption: 'Navigasi intuitif, breadcrumbs, pencarian cepat, dan menu kontekstual.',
        image: {
          src: '/showcase/files.webp',
          srcSet: '/showcase/files.webp 1x, /showcase/files@2x.webp 2x',
          alt: '9Drive file explorer grid view displaying file thumbnail previews and Material Design folder cards',
          width: 1920,
          height: 1200,
        },
      },
      {
        id: 'cli-terminal',
        title: 'Daemon CLI',
        caption: 'Mulai dengan satu binary dan sinkronisasi otomatis di latar belakang.',
        image: {
          src: '/showcase/terminal.webp',
          srcSet: '/showcase/terminal.webp 1x, /showcase/terminal@2x.webp 2x',
          alt: 'Terminal window showing 9drive CLI startup process, health checks, and local web server initialization',
          width: 1920,
          height: 1200,
        },
      },
      {
        id: 'storage-details',
        title: 'Inspektor Kuota',
        caption: 'Pantau kapasitas terhubung dan detail file tanpa telemetri pihak ketiga.',
        image: {
          src: '/showcase/storage.webp',
          srcSet: '/showcase/storage.webp 1x, /showcase/storage@2x.webp 2x',
          alt: '9Drive sidebar storage indicator and file details inspector panel showing size, type, and modified dates',
          width: 1920,
          height: 1200,
        },
      },
    ],
  },
  features: {
    sectionTitle: 'Dirancang untuk Skalabilitas dan Kemandirian',
    sectionSubtitle: 'Diciptakan dari awal untuk mengatasi fragmentasi penyimpanan cloud.',
    cards: [
      {
        id: 'pooling',
        title: 'Penggabungan Multi-Akun',
        summary: 'Satukan kapasitas dari beberapa akun Google menjadi satu kesatuan penyimpanan dengan penyeimbangan cerdas.',
        iconName: 'Layers',
        technicalDetail: 'Alokasi tingkat blok virtual yang mendistribusikan file berdasarkan sisa kuota akun secara real-time.',
      },
      {
        id: 'local-first',
        title: 'Bundle Local-First',
        summary: 'Akses penuh saat offline dengan database SQLite lokal dan sinkronisasi background.',
        iconName: 'Database',
        technicalDetail: 'Penyimpanan cache berbasis konten yang menjaga performa baca/tulis tanpa jeda.',
      },
      {
        id: 'cdn-streaming',
        title: 'Streaming CDN',
        summary: 'Streaming media berkecepatan tinggi tanpa terhalang pembatasan kuota berkat edge range caching.',
        iconName: 'Zap',
        technicalDetail: 'Proxy HTTP range terfragmentasi yang dioptimalkan untuk file video dan arsip besar.',
      },
      {
        id: 'universal-gateway',
        title: 'Universal API Gateway',
        summary: 'Hubungkan aplikasi klien melalui antarmuka S3, WebDAV, atau REST standar.',
        iconName: 'Network',
        technicalDetail: 'Lapisan adapter multi-protokol yang menerjemahkan panggilan pihak ketiga ke akun Google Drive.',
      },
    ],
  },
  quickstart: {
    sectionTitle: 'Pasang dalam Hitungan Detik',
    sectionSubtitle: 'Tanpa konfigurasi rumit. Pilih sistem operasimu dan jalankan perintah satu baris.',
    setupSteps: [
      'Pasang binary atau paket 9Drive sesuai sistem operasi.',
      'Hubungkan dan autentikasi akun Google Drive dengan aman.',
      'Jalankan daemon lokal dan buka dashboard browser.',
    ],
    platforms: [
      {
        id: 'macos',
        name: 'macOS',
        snippets: [
          { label: 'Homebrew', command: 'brew install 9drive' },
          { label: 'Shell Script', command: 'curl -fsSL https://9drive.dev/install.sh | bash' },
        ],
      },
      {
        id: 'linux',
        name: 'Linux',
        snippets: [
          { label: 'Shell Script', command: 'curl -fsSL https://9drive.dev/install.sh | bash' },
          { label: 'Standalone Binary', command: 'curl -fsSL https://9drive.dev/dl/linux-x64.tar.gz | tar -xz && sudo mv 9drive /usr/local/bin/' },
        ],
      },
      {
        id: 'windows',
        name: 'Windows',
        snippets: [
          { label: 'PowerShell', command: 'irm https://9drive.dev/install.ps1 | iex' },
          { label: 'Winget', command: 'winget install 9drive' },
        ],
      },
      {
        id: 'nodejs',
        name: 'Node.js',
        snippets: [
          { label: 'npm', command: 'npm install -g 9drive', packageManager: 'npm' },
        ],
      },
    ],
    copiedNotification: 'Tersalin ke clipboard!',
    copyButtonAria: 'Salin perintah ke papan klip',
  },
  faq: {
    sectionTitle: 'Pertanyaan yang Sering Diajukan',
    sectionSubtitle: 'Semua informasi penting seputar privasi, kuota, dan keamanan 9Drive.',
    items: [
      {
        id: 'storage-quotas',
        question: 'Bagaimana 9Drive menggabungkan kuota penyimpanan dari beberapa akun?',
        answer: '9Drive berkomunikasi dengan API Google Drive untuk setiap akun terautentikasi, menggabungkan kuota gratis masing-masing akun ke dalam satu ruang penyimpanan virtual terpadu. Berkas dan fragmen data dialokasikan secara otomatis ke akun yang memiliki sisa ruang tanpa melebihi batas kuota.',
      },
      {
        id: 'oauth-credential-isolation',
        question: 'Bagaimana isolasi kredensial OAuth melindungi akun yang terhubung?',
        answer: 'Setiap akun Google memiliki sesi OAuth 2.0 tersendiri yang terisolasi. Token penyegaran dan izin akses dikarantina secara mandiri di komputer lokal Anda, mencegah kebocoran kredensial atau tumpang tindih hak akses antar-akun.',
      },
      {
        id: 'encryption',
        question: 'Standar enkripsi apa yang melindungi token autentikasi dan berkas?',
        answer: 'Token autentikasi sensitif, kunci rahasia OAuth, dan buffer streaming berkas diamankan menggunakan enkripsi AES-256-GCM. Kunci enkripsi tersimpan secara eksklusif di perangkat lokal Anda, menjamin privasi zero-knowledge.',
      },
      {
        id: 'local-data-persistence',
        question: 'Bagaimana persistensi data lokal berjalan tanpa pelacakan server pusat?',
        answer: 'Struktur hierarki folder virtual, tabel indeks metadata, dan cache tersimpan sepenuhnya di dalam basis data lokal Anda. 9Drive beroperasi tanpa telemetri jarak jauh, memberikan kedaulatan penuh atas katalog data Anda.',
      },
      {
        id: 'open-source',
        question: 'Apakah 9Drive bersifat open source dan dapat diaudit?',
        answer: 'Ya. 9Drive dirilis dengan Lisensi MIT dan dikembangkan secara terbuka di GitHub. Anda bebas mengaudit kode keamanan, menjalankan server sendiri, atau berkontribusi dalam pengembangannya.',
      },
    ],
  },
  footer: {
    copyright: '© 2026 9Drive. Hak cipta dilindungi.',
    license: 'Dirilis di bawah Lisensi MIT.',
    docsLink: 'https://docs.9drive.dev',
    issuesLink: 'https://github.com/ninedrive/9drive/issues',
    communityLink: 'https://github.com/ninedrive/9drive/discussions',
  },
};
