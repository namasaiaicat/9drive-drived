![9Drive cover](https://i.ibb.co.com/35BySv1C/image.png)

# 9Drive — Virtual Cloud Storage & Client-Side Productivity Suite

[![Version](https://img.shields.io/badge/version-1.0.2-blue.svg)](package.json)
[![npm version](https://img.shields.io/npm/v/9drive.svg)](https://www.npmjs.com/package/9drive)
[![License](https://img.shields.io/badge/license-Apache%202.0-green.svg)](LICENSE)
[![Framework](https://img.shields.io/badge/stack-React%20%7C%20Node%20Express%20%7C%20Prisma%20%7C%20SQLite%20%2F%20MySQL-orange.svg)]()

**9Drive** adalah platform virtual cloud storage gateway modern yang menggabungkan banyak akun **Google Drive** dan **S3-Compatible Storage** (Cloudflare R2, MinIO, Wasabi, AWS S3, Backblaze B2) ke dalam satu dashboard terpadu bergaya **Google Drive Material Design 3 (MD3)**. 

Dilengkapi dengan **High-Performance CDN Media Gateway**, **External Upload API**, serta **Client-Side Productivity Tools Suite** lengkap (alat olah PDF, AI Hapus Background Gambar, Ekstraksi Audio Video, dan Utilitas Data) yang berjalan 100% di browser secara aman, cepat, dan terintegrasi langsung dengan penyimpanan Drive Anda.

---

## ⚡ Panduan Menjalankan 9Drive (CLI)

9Drive dapat dipasang secara global di sistem operasi manapun (Windows, macOS, Linux) tanpa perlu setup database manual, menggunakan bundled local-first storage engine (SQLite) dan auto-launching browser dashboard.

### 1. Pasang Secara Global
Buka terminal / Command Prompt dan jalankan:
```bash
npm install -g 9drive
```

### 2. Jalankan Aplikasi Kapan Saja
Setelah terpasang, cukup ketik perintah berikut dari direktori mana saja untuk membuka 9Drive:
```bash
9drive
```
> *9Drive akan otomatis menyiapkan direktori data lokal `~/.9drive`, menyinkronkan database SQLite, dan membuka antarmuka web di browser default Anda (`http://localhost:9999`).*

> **💡 Pasang Icon di Desktop (Opsional):**  
> Bagi Anda yang ingin membuka 9Drive cukup dengan klik dua kali icon Desktop/Start Menu tanpa membuka terminal, jalankan:
> ```bash
> 9drive shortcut
> ```
> *(Tersedia untuk Windows, macOS, dan Linux).*

*(Catatan: Anda juga bisa menjalankannya instan tanpa instalasi menggunakan `npx 9drive`)*

#### Perintah CLI yang Tersedia:
| Perintah | Deskripsi |
|---|---|
| `9drive` / `9drive start` | Menjalankan server lokal dan membuka dashboard di browser |
| `9drive shortcut` | Memasang shortcut / icon launcher di Desktop (Opsional) |
| `9drive status` | Memeriksa lokasi direktori data, ukuran database SQLite, & konfigurasi |
| `9drive backup` | Membuat cadangan (*snapshot backup*) database lokal secara instan |
| `9drive open` | Membuka antarmuka 9Drive di browser |
| `9drive --port <num>` | Menjalankan pada port kustom (contoh: `--port 8080`) |
| `9drive --db <url>` | Menghubungkan ke database kustom (MySQL / PostgreSQL / SQLite) |

---

## 🌟 Fitur Utama & Pembaruan Terkini

Repositori ini telah disesuaikan dan dikembangkan dengan penambahan serangkaian fitur produktivitas mutakhir:

### 1. 🎨 Antarmuka Google Drive Material Design 3 (MD3)
- **Tampilan Otentik Google Drive**: Navigasi sidebar dengan indikator pill aktif, floating search bar, breadcrumbs folder dinamis, surface elevation, dan palet warna resmi Google Drive (`#0B57D0`, background neutral, rounded cards).
- **Drive Account Selector Terpadu**: Dropdown pemilih akun Drive langsung di navbar untuk memfilter tampilan berkas berdasarkan akun Google Drive tertentu atau menampilkan semua akun sekaligus.
- **Pengurutan Berkas & Folder Fleksibel (*Smart Sorting*)**: Toolbar My Drive dilengkapi opsi pengurutan instan berdasarkan Terakhir Diubah (*Last Modified*), Nama (A-Z / Z-A), serta Ukuran Berkas / Folder (Terbesar / Terkecil).
- **Banner Status & Panduan Setup Terpadu**: Indikator minimalis di bagian atas daftar berkas jika akun Drive belum terhubung, lengkap dengan tombol langsung menuju panduan aktivasi Google Console.
- **Deteksi Pembaruan Versi Real-Time**: Aplikasi secara otomatis mendeteksi ketersediaan rilis versi terbaru di NPM dan menyediakan tombol 1-klik untuk menyalin perintah pembaruan.
- **Global Search Bar Cerdas**: Pencarian instan berkas dan folder dilengkapi filter cepat berdasarkan tipe berkas (Dokumen, Gambar, Video, PDF, ZIP), rentang tanggal modifikasi, dan akun penyimpanan.
- **Sistem Notifikasi Floating Toast (`ToastContext`)**: Notifikasi mengambang yang responsif dan interaktif untuk memberikan konfirmasi aksi (unggah, hapus, salin tautan, mutasi berkas) tanpa mengganggu alur kerja pengguna.
- **Menu Konteks Klik Kanan Lengkap (*Right-Click Context Menu*)**:
  - **Menu Berkas**: Buka di Tools Suite, Salin Tautan CDN, Pratinjau, Unduh, Ganti Nama, Pindahkan, Bagikan, Berbintang (Star), Laci Detail, Hapus ke Sampah.
  - **Menu Folder**: Buka Folder, Bagikan, Ganti Nama, Pindahkan, Info Detail, Hapus.
  - **Menu Ruang Kosong (*Canvas Area*)**: Klik kanan pada area kosong untuk langsung mengunggah berkas, mengunggah folder, atau membuat folder baru.
- **Laci Detail Berkas (*File Details Drawer*)**:
  - Menampilkan pratinjau thumbnail visual, metadata teknis (ukuran berkas, tipe MIME, lokasi folder, tanggal pembuatan/modifikasi, akun pemilik).
  - Tombol aksi instan untuk membuka berkas langsung ke dalam modul **Tools Suite** (PDF Tools, Image Tools, Remove BG) atau menyalin tautan publik CDN.

---

### 2. 🛠️ Productivity & Tools Suite (100% Client-Side & Privasi Terjaga)
Pusat alat pengolah dokumen dan multimedia yang berjalan sepenuhnya di browser client (tanpa membebani CPU server atau mengirim berkas pribadi ke pihak ketiga):

#### 📄 PDF Suite (`/tools/pdf`)
- **Merge PDF**: Menggabungkan beberapa berkas PDF menjadi satu dokumen berurutan sesuai susunan yang ditentukan.
- **Split PDF**: Memecah halaman PDF atau mengekstrak rentang halaman tertentu menjadi berkas tersendiri.
- **Compress PDF**: Mengurangi ukuran dokumen PDF agar hemat penyimpanan dan cepat dibagikan tanpa merusak keterbacaan teks.
- **JPG ke PDF**: Mengonversi dan merangkai sekumpulan foto (JPG, PNG, WebP) menjadi satu berkas album PDF yang rapi.
- **PDF ke Gambar (JPG/PNG)**: Mengekstrak setiap lembar halaman dokumen PDF menjadi berkas gambar resolusi tinggi dengan pratinjau instan.
- **Rotate PDF**: Memutar orientasi lembar dokumen PDF yang terbalik (90°, 180°, 270°) secara serentak.
- **Watermark PDF**: Membubuhkan stempel teks hak cipta atau tanda keamanan kustom (contoh: *RAHASIA*, *DRAFT*) pada lembar PDF.

#### 🖼️ AI & Image Suite (`/tools/image` & `/tools/remove-bg`)
- **Hapus Background AI (`/tools/remove-bg`)**:
  - Menghapus latar belakang foto manusia atau produk secara otomatis dan instan menggunakan model AI langsung di browser (`@imgly/background-removal`).
  - Dilengkapi slider perbandingan **Before/After** interaktif.
  - Opsi penggantian background kustom: transparan (PNG), palet warna solid, atau latar belakang gambar kustom.
- **Kompres Gambar**: Mengecilkan ukuran foto JPG, PNG, dan WebP hingga 80% dengan kualitas visual optimal.
- **Potong Foto / Pas Foto**: Pemotongan gambar dengan preset rasio resmi (Pas Foto 3:4, 4:6, Persegi 1:1, atau rasio bebas).
- **Konversi Format Gambar**: Konversi format berkas secara batch antara WebP, PNG, dan JPG.
- **Ubah Ukuran (Resize)**: Menyesuaikan dimensi piksel atau persentase skala dengan pengunci rasio aspek (*aspect-ratio lock*).
- **Watermark Foto**: Menambahkan cap teks hak cipta pada posisi tengah atau sudut berkas secara batch.

#### 🎬 Video & Audio Suite (`/tools/video`)
- **Ekstrak Audio Video**: Mengambil dan mengubah suara dari video (MP4, WebM, MOV) menjadi berkas audio jernih (`.wav`) langsung di browser.

#### 📊 Utilitas Data & Berkas (`/tools/data`)
- **CSV ⇄ JSON Converter**: Konversi dua arah data tabel CSV dan format JSON secara instan dengan auto-formatting rapi.
- **File Hash & Checksum**: Menghitung sidik jari digital (SHA-256) berkas untuk memverifikasi keaslian dan integritas dokumen.
- **Base64 Encoder / Decoder**: Mengubah berkas atau gambar menjadi teks kode data Base64 untuk kebutuhan embedding web atau konfigurasi.

#### 🔄 Integrasi Seamless dengan 9Drive
- **Drive File Picker Modal**: Ambil berkas langsung dari folder 9Drive untuk langsung diproses di dalam tools tanpa perlu mengunduh ke komputer lokal terlebih dahulu.
- **Save Destination Modal**: Simpan hasil olahan tools langsung kembali ke folder 9Drive yang dipilih, atau unduh ke perangkat lokal sebagai file tunggal maupun arsip ZIP otomatis.

---

### 3. ⚡ High-Performance CDN Media Gateway (`/cdn`)
Gerbang pengiriman media berkinerja tinggi untuk kebutuhan embedding gambar, video, dan berkas statis:
- **Tautan Streaming & Pratinjau Publik**:
  - `GET /cdn/view/:id`: Pengiriman berkas dengan header `inline` disposition. Sangat optimal untuk tag HTML `<img>`, `<video>`, audio player, maupun pratinjau dokumen di web eksternal.
  - `GET /cdn/raw/:id`: Pengiriman berkas dengan header `attachment` untuk unduhan langsung.
- **Dukungan HTTP 206 Partial Content (Range Requests)**: Memungkinkan penonton video atau pendengar audio melakukan seeking/scrubbing timeline tanpa harus mengunduh keseluruhan berkas.
- **Mekanisme Caching Agresif**: Mendukung header `ETag`, `Last-Modified`, validasi `If-None-Match` (HTTP 304 Not Modified), serta `Cache-Control: public, max-age=31536000, immutable` untuk menghemat bandwidth server.
- **Dynamic Open CORS**: Mengizinkan akses lintas domain (`*`) khusus untuk jalur `/cdn`, `/api`, dan `/public`.
- **One-Click CDN Link & Embed Modal**: Generator kode siap pakai di antarmuka (Direct URL, Tag HTML `<img>`, dan sintaks Markdown).

---

### 4. 🔌 External Upload API & Developer Hub (`/api`)
- **Manajemen API Key Terpadu (`/api`)**:
  - Pembuatan API Key aman dengan hashing token (SHA-256) di database dan tampilan rahasia satu kali (*one-time secret modal*).
  - Pembatasan izin akses (*scope permissions*, misalnya `files:upload`).
  - Pemantauan waktu penggunaan terakhir (*last-used tracking*) dan pencabutan kunci (*revocation*).
- **Endpoint Unggah Publik**: `POST /api/v1/uploads` dengan otentikasi header `X-API-Key` atau `Authorization: Bearer <API_KEY>`.
- **Dokumentasi SDK Interaktif In-App**: Contoh kode siap pakai untuk cURL, Node.js (fetch & axios), Python, PHP, dan Bash testing script bawaan (`test-external-upload.ts`).
- **Target Folder & Routing Fleksibel**: Berkas eksternal dapat diarahkan langsung ke ID folder virtual tertentu serta mengikuti kebijakan alokasi akun penyimpanan yang aktif.

---

### 5. ☁️ Multi-Account & Storage Gateway
- **Multi-Account Google Drive**: Hubungkan beberapa akun Google Drive dalam satu akun 9Drive untuk menggabungkan total kapasitas penyimpanan cloud.
- **S3-Compatible Storage Gateway**: Mendukung integrasi MinIO, Cloudflare R2, Wasabi, Backblaze B2, dan AWS S3.
- **Upload Routing Policies**: Kebijakan alokasi unggahan cerdas:
  - *Most-Available*: Mengunggah ke akun dengan sisa kuota terbesar.
  - *Round-Robin*: Distribusi bergantian secara merata antar akun.
  - *Priority-Order*: Memenuhi akun utama terlebih dahulu sebelum beralih ke akun sekunder.
- **Direct Stream Upload**: Berkas dialirkan langsung (*piped stream*) dari pengguna ke Google Drive / S3 storage gateway tanpa pernah disimpan di disk lokal server.
- **Quota Tracker**: Visualisasi pemakaian penyimpanan, persentase kuota, dan breakdown kapasitas per akun.

---

### 6. 🔗 Smart Sharing & Permission System
- **Dialog Berbagi Interaktif (`ShareModal`)**:
  - Konfigurasi izin akses: *Restricted* (hanya akun tertentu) atau *Anyone with the link* (publik).
  - Penentuan hak akses: *Viewer*, *Commenter*, dan *Editor*.
- **Deteksi Izin Warisan (*Inherited Permission Origin*)**: Secara otomatis mendeteksi jika suatu berkas mewarisi status publik dari folder induknya, serta menyediakan opsi langsung untuk mengatur izin folder asalnya.
- **Halaman Berbagi (`/shared`)**: Tampilan tab terpisah untuk berkas yang dibagikan kepada Anda (*Shared with me*) dan berkas yang Anda bagikan ke orang lain (*Shared by me*).
- **Halaman Berbintang (`/starred`) & Sampah (`/trash`)**: Manajemen berkas favorit yang terhubung ke Google Drive API, serta pemulihan atau penghapusan permanen dari tempat sampah.

---

### 7. ⚙️ Manajemen Konfigurasi & Pembaruan Sistem
- **Konfigurasi Google OAuth via UI**: Input Google Client ID, Client Secret, dan Redirect URI langsung melalui halaman **Settings -> Google Credentials** di dashboard tanpa wajib menjalankan seed manual terminal. Kredensial dienkripsi aman (AES-256) di database MySQL.
- **Automated In-App Updates (PM2)**: Menu pembaruan sistem sekali klik di UI Settings yang menjalankan git pull, migrasi Prisma, build aset, dan restart layanan backend otomatis dengan monitor log langsung.
- **Monorepo Dev Runner**: Satu perintah di root workspace untuk menjalankan frontend dan backend secara bersamaan.

---

## 📁 Struktur Direktori Repositori

```txt
9drive/
├── backend/                  # API Server (Express + TypeScript + Prisma)
│   ├── prisma/               # Skema database & file migrasi MySQL
│   └── src/
│       ├── config/           # Konfigurasi env & Prisma client
│       ├── middleware/       # Otentikasi JWT, API Key, dan error handler
│       ├── modules/
│       │   ├── api-keys/     # Pengelolaan API Key developer
│       │   ├── audit-logs/   # Pencatatan riwayat aktivitas pengguna
│       │   ├── auth/         # Registrasi, login, dan refresh token
│       │   ├── cdn/          # High-performance CDN media streaming gateway
│       │   ├── connected-accounts/ # Manajemen multi-akun Google Drive
│       │   ├── files/        # Manipulasi berkas, streaming, dan preview
│       │   ├── folders/      # Virtual folder tree management
│       │   ├── google/       # Integrasi Google Drive API & OAuth
│       │   ├── public-api/   # Endpoint REST API publik (/api/v1/uploads)
│       │   ├── storage/      # Ringkasan kuota dan manajemen penyimpanan
│       │   ├── system/       # Updater otomatis & status sistem
│       │   └── uploads/      # Multi-part upload streaming engine
│       └── scripts/          # Script pengujian upload eksternal & seeding
│
├── frontend/                 # Aplikasi Web Client (React 18 + Vite + Tailwind/MD3)
│   └── src/
│       ├── components/
│       │   ├── drive/        # UI Google Drive MD3 (FileGrid, ContextMenu, Drawer, ShareModal, dll)
│       │   ├── tools/        # UI Tools Suite (Picker, BeforeAfterPreview, SaveDestination, Icons)
│       │   └── ui/           # Komponen atomik UI (Buttons, Inputs, Dialogs, Cards)
│       ├── context/          # State context (DriveFilter, UploadManager, ToastNotification)
│       ├── layouts/          # Layout utama Drive (Sidebar, Header, Main Content Area)
│       ├── lib/tools/        # Core engine tools (PDF, Image, Video-to-audio, Background removal AI)
│       └── pages/
│           ├── tools/        # Halaman Tools Hub, PDF View, Image View, Video View, Data View, RemoveBG
│           ├── AllFilesPage.tsx
│           ├── ApiManagementPage.tsx
│           ├── QuotaTrackerPage.tsx
│           ├── SettingsPage.tsx
│           ├── SharedPage.tsx
│           ├── StarredPage.tsx
│           └── TrashPage.tsx
│
├── setup.ps1                 # Script setup otomatis untuk Windows PowerShell
├── setup.sh                  # Script setup otomatis untuk Linux/macOS
├── docker-compose.yml        # Orchestration Docker (MySQL + Backend + Frontend)
└── package.json              # Monorepo root dev runner (concurrently)
```

---

## 💻 Prasyarat Sistem

- **Node.js**: Versi 20 LTS atau lebih baru
- **NPM**: Versi 10+
- **MySQL**: Versi 8.0+ berjalan secara lokal atau via Docker
- **Google Cloud Project**:
  - Mengaktifkan **Google Drive API**
  - Mengonfigurasi **OAuth Consent Screen**
  - Membuat **OAuth 2.0 Client ID** (Web Application)

Default basis data MySQL yang digunakan pada development lokal:
```txt
Host:     localhost
Port:     3306
Database: 9drive
User:     root
Password: (kosong / sesuaikan dengan konfigurasi MySQL Anda)
```

---

## 🚀 Panduan Instalasi & Menjalankan Proyek

### Cara 1: Setup Otomatis Menggunakan Script (Direkomendasikan)

Script setup akan secara otomatis memasang seluruh dependensi backend dan frontend, membuat berkas `.env` dengan token acak yang aman, serta membuat skema database Prisma.

#### Windows (PowerShell)
Buka PowerShell di direktori `9drive`:
```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

#### Linux / macOS
Buka Terminal di direktori `9drive`:
```bash
chmod +x ./setup.sh
./setup.sh
```

---

### Cara 2: Setup Manual & Menjalankan Monorepo

#### 1. Pasang Dependensi
Dari direktori root proyek `9drive`:
```bash
# Pasang dependensi monorepo runner
npm install

# Pasang dependensi backend dan frontend
npm run install:all
```

#### 2. Buat Basis Data MySQL
Pastikan server MySQL Anda telah aktif, lalu buat basis data:
```sql
CREATE DATABASE IF NOT EXISTS 9drive;
```

#### 3. Konfigurasi Berkas Environment
Salin konfigurasi default atau buat berkas `backend/.env`:
```env
DATABASE_URL="mysql://root@localhost:3306/9drive"
APP_PORT=4000
FRONTEND_URL="http://localhost:5173"
JWT_ACCESS_SECRET="ganti-dengan-secret-jwt-acak-minimal-32-karakter"
TOKEN_ENCRYPTION_KEY="kunci-enkripsi-tepat-32-karakter-key!"
ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=30
MAX_UPLOAD_BYTES=5368709120
RECAPTCHA_SECRET_KEY=""

# (Opsional) Kredensial Google OAuth juga dapat diisi langsung via UI Settings
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI="http://localhost:4000/connected-accounts/google/callback"
```

Buat berkas `frontend/.env`:
```env
VITE_API_URL=http://localhost:4000
VITE_RECAPTCHA_SITE_KEY=
```

#### 4. Jalankan Migrasi Database Prisma
```bash
cd backend
npm run prisma:migrate
cd ..
```

#### 5. Jalankan Development Server (Monorepo)
Jalankan satu perintah di folder root `9drive` untuk memulai backend dan frontend secara bersamaan:
```bash
npm run dev
```

Aplikasi dapat langsung diakses pada:
- **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Backend API & CDN**: [http://localhost:4000](http://localhost:4000)

*(Opsional jika ingin menjalankan terpisah: `npm run dev:backend` dan `npm run dev:frontend`)*

---

### Cara 3: Menjalankan Menggunakan Docker Compose

1. Siapkan berkas `.env` dari template Docker:
   ```bash
   cp .env.docker.example .env
   ```
2. Sesuaikan konfigurasi di `.env` (isi password MySQL, kredensial Google, dan secret token).
3. Bangun dan jalankan seluruh container:
   ```bash
   docker compose up -d --build
   ```
4. Layanan akan berjalan pada:
   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:4000`
   - MySQL: `localhost:3306`

---

## 🌐 Konfigurasi Google Cloud Console

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat atau pilih proyek Google Cloud Anda.
3. Buka **APIs & Services** -> **Library**, cari **Google Drive API**, lalu klik **Enable**.
4. Buka **APIs & Services** -> **OAuth consent screen**:
   - Pilih jenis pengguna: **External**.
   - Masukkan nama aplikasi dan email dukungan pengembang.
   - Tambahkan scopes berikut:
     ```txt
     https://www.googleapis.com/auth/drive
     https://www.googleapis.com/auth/userinfo.email
     https://www.googleapis.com/auth/userinfo.profile
     ```
   - Di bagian **Test users**, tambahkan alamat email Google yang akan digunakan untuk pengujian aplikasi.
5. Buka **APIs & Services** -> **Credentials**:
   - Klik **Create Credentials** -> **OAuth client ID**.
   - Pilih tipe: **Web application**.
   - **Authorized JavaScript origins**:
     ```txt
     http://localhost:5173
     ```
   - **Authorized redirect URIs**:
     ```txt
     http://localhost:4000/connected-accounts/google/callback
     ```
   - Simpan dan salin **Client ID** serta **Client Secret**.
6. Simpan kredensial tersebut ke dalam aplikasi melalui menu **Settings** -> **Google Credentials** pada dashboard 9Drive.

---

## 📡 Ringkasan Endpoint API

### Otentikasi & Akun
- `POST /auth/register` — Pendaftaran akun pengguna baru
- `POST /auth/login` — Masuk dengan email & kata sandi
- `GET /auth/google/url` — Inisiasi login cepat via Google
- `POST /auth/google/exchange` — Pertukaran kode otentikasi Google
- `POST /auth/refresh` — Memperbarui token akses JWT
- `GET /auth/me` — Mendapatkan profil pengguna saat ini

### CDN Media Streaming
- `GET /cdn/view/:id` — Streaming media publik inline (untuk tag `<img>`, video player, dll)
- `GET /cdn/raw/:id` — Unduhan langsung berkas publik (attachment disposition)
- `GET /cdn/:id` — Redirect otomatis ke endpoint view

### Developer Public API
- `POST /api/v1/uploads` — Mengunggah berkas menggunakan API Key (`X-API-Key`)

### Manajemen Berkas & Folder
- `GET /files` — Mendapatkan daftar berkas (mendukung parameter `folderId`, `q`, `mimeType`, `accountId`)
- `POST /uploads` — Mengunggah berkas ke Drive/S3 via dashboard (multipart streaming)
- `PATCH /files/:id` — Mengubah nama atau metadata berkas
- `DELETE /files/:id` — Memindahkan berkas ke sampah atau menghapus permanen
- `POST /files/:id/share` — Membuat tautan berbagi publik
- `GET /folders` — Mendapatkan susunan pohon folder virtual
- `POST /folders` — Membuat folder virtual baru

### Penyimpanan & Akun Terhubung
- `GET /connected-accounts` — Daftar akun Google Drive & S3 yang terhubung
- `GET /storage/summary` — Statistik agregasi total kuota dan penggunaan penyimpanan
- `POST /connected-accounts/:id/sync-quota` — Sinkronisasi ulang kuota dari Google Drive

---

## 🔒 Catatan Keamanan

1. **Keamanan Streaming**: Berkas unggahan dialirkan langsung (*piped stream*) dari antarmuka ke cloud provider target. Server backend tidak pernah menyimpan salinan berkas di disk lokal.
2. **Enkripsi Kredensial**: Token akses OAuth, refresh token Google, dan API secret disimpan dalam database MySQL menggunakan enkripsi AES-256 (`TOKEN_ENCRYPTION_KEY`).
3. **Penyimpanan Token Sesi**: Hash SHA-256 digunakan untuk menyimpan token refresh dan API Key, mencegah kebocoran kredensial mentah saat terjadi database dump.
4. **Isolasi Lingkungan**: Berkas `.env` telah didaftarkan dalam `.gitignore` dan tidak boleh di-commit ke repositori publik.

---

## 🛠️ Build untuk Produksi

Untuk menghasilkan bundle produksi:

```bash
# Build frontend dan backend secara bersamaan
npm run build
```

Bundle produksi yang dihasilkan:
- **Backend**: Berada di `backend/dist` (dijalankan dengan `node dist/server.js`)
- **Frontend**: Berada di `frontend/dist` (dapat disajikan via Nginx atau static file server)

---

## 📄 Lisensi

Didistribusikan di bawah lisensi Apache 2.0. Lihat berkas [LICENSE](LICENSE) untuk informasi lisensi selengkapnya.
