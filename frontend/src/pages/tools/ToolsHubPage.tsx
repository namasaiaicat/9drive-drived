import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  MergePdfIcon,
  SplitPdfIcon,
  CompressPdfIcon,
  ImagesToPdfIcon,
  RotatePdfIcon,
  WatermarkPdfIcon,
  RemoveBgIcon,
  CompressImageIcon,
  ConvertImageIcon,
  ResizeImageIcon,
  WatermarkImageIcon,
  CsvJsonIcon,
  HashChecksumIcon,
  Base64Icon,
} from '@/components/tools/ToolIcons'

type ToolCategory = 'all' | 'pdf' | 'image' | 'data'

type ToolItem = {
  id: string
  title: string
  description: string
  category: 'pdf' | 'image' | 'data'
  iconComponent: React.ComponentType<{ className?: string; size?: number }>
  badgeLabel?: string
  badgeClass?: string
  featureTag: string
  isPopular?: boolean
  path: string
}

export function ToolsHubPage() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const tools: ToolItem[] = [
    // 1. PDF Suite (iLovePDF Style Red & Specialized Colors)
    {
      id: 'merge-pdf',
      title: 'Merge PDF',
      description: 'Satukan beberapa berkas PDF menjadi satu dokumen berurutan sesuai susunan yang Anda tentukan.',
      category: 'pdf',
      iconComponent: MergePdfIcon,
      badgeLabel: 'Populer',
      badgeClass: 'bg-[#FEE2E2] text-[#DC2626] dark:bg-[#7F1D1D]/30 dark:text-[#F87171]',
      featureTag: 'Penggabung PDF',
      isPopular: true,
      path: '/tools/pdf?mode=merge',
    },
    {
      id: 'split-pdf',
      title: 'Split PDF',
      description: 'Ekstrak rentang halaman tertentu atau pecah seluruh halaman dokumen PDF menjadi berkas tersendiri.',
      category: 'pdf',
      iconComponent: SplitPdfIcon,
      featureTag: 'Pemisah Halaman',
      path: '/tools/pdf?mode=split',
    },
    {
      id: 'compress-pdf',
      title: 'Compress PDF',
      description: 'Kecilkan ukuran file dokumen PDF agar hemat penyimpanan dan cepat dikirim tanpa merusak teks.',
      category: 'pdf',
      iconComponent: CompressPdfIcon,
      badgeLabel: 'Populer',
      badgeClass: 'bg-[#DCFCE7] text-[#16A34A] dark:bg-[#14532D]/30 dark:text-[#4ADE80]',
      featureTag: 'Optimasi Ukuran',
      isPopular: true,
      path: '/tools/pdf?mode=compress',
    },
    {
      id: 'images-to-pdf',
      title: 'JPG ke PDF',
      description: 'Konversi dan gabungkan banyak foto JPG, PNG, atau WebP menjadi satu dokumen PDF album yang rapi.',
      category: 'pdf',
      iconComponent: ImagesToPdfIcon,
      featureTag: 'Foto ke Dokumen',
      path: '/tools/pdf?mode=images-to-pdf',
    },
    {
      id: 'rotate-pdf',
      title: 'Rotate PDF',
      description: 'Putar orientasi lembar dokumen PDF yang terbalik (90°, 180°, 270°) secara cepat dan serentak.',
      category: 'pdf',
      iconComponent: RotatePdfIcon,
      featureTag: 'Rotasi Orientasi',
      path: '/tools/pdf?mode=rotate',
    },
    {
      id: 'watermark-pdf',
      title: 'Watermark PDF',
      description: 'Bubuhkan stempel tanda hak cipta atau teks khusus (contoh: "RAHASIA", "DRAFT") di lembar PDF.',
      category: 'pdf',
      iconComponent: WatermarkPdfIcon,
      featureTag: 'Stempel Keamanan',
      path: '/tools/pdf?mode=watermark',
    },

    // 2. AI & Image Suite
    {
      id: 'remove-bg',
      title: 'Hapus Background AI',
      description: 'Hapus latar belakang foto manusia atau produk secara otomatis dengan neural AI langsung di browser.',
      category: 'image',
      iconComponent: RemoveBgIcon,
      badgeLabel: 'AI Powered',
      badgeClass: 'bg-[#F3E8FD] text-[#7E22CE] dark:bg-[#581C87]/40 dark:text-[#D8B4FE]',
      featureTag: 'Neural Cutout',
      isPopular: true,
      path: '/tools/remove-bg',
    },
    {
      id: 'compress-img',
      title: 'Kompres Gambar',
      description: 'Kecilkan ukuran foto JPG, PNG, dan WebP hingga 80% tanpa penurunan kualitas visual yang terlihat.',
      category: 'image',
      iconComponent: CompressImageIcon,
      badgeLabel: 'Populer',
      badgeClass: 'bg-[#D1FAE5] text-[#059669] dark:bg-[#064E3B]/30 dark:text-[#34D399]',
      featureTag: 'TinyPNG Style',
      isPopular: true,
      path: '/tools/image?mode=compress',
    },
    {
      id: 'convert-img',
      title: 'Konversi Format Gambar',
      description: 'Ubah format gambar secara batch antara WebP, PNG, dan JPG untuk kebutuhan web ataupun cetak.',
      category: 'image',
      iconComponent: ConvertImageIcon,
      featureTag: 'WebP ⇄ PNG ⇄ JPG',
      path: '/tools/image?mode=convert',
    },
    {
      id: 'resize-img',
      title: 'Ubah Ukuran Gambar',
      description: 'Sesuaikan dimensi pixel lebar dan tinggi atau persentase skala foto dengan rasio aspek tetap terkunci.',
      category: 'image',
      iconComponent: ResizeImageIcon,
      featureTag: 'Skala & Dimensi',
      path: '/tools/image?mode=resize',
    },
    {
      id: 'watermark-img',
      title: 'Watermark Foto',
      description: 'Tambahkan cap teks hak cipta pada puluhan gambar sekaligus di posisi tengah ataupun sudut berkas.',
      category: 'image',
      iconComponent: WatermarkImageIcon,
      featureTag: 'Cap Hak Cipta',
      path: '/tools/image?mode=watermark',
    },

    // 3. Data & Utilitas Berkas
    {
      id: 'csv-json',
      title: 'CSV ⇄ JSON Converter',
      description: 'Transformasi tabel data CSV ke JSON array dan sebaliknya secara instan dengan formater otomatis.',
      category: 'data',
      iconComponent: CsvJsonIcon,
      featureTag: 'Tabular Parsing',
      path: '/tools/data?mode=csv-json',
    },
    {
      id: 'hash',
      title: 'File Hash & Checksum',
      description: 'Hitung hash kriptografi SHA-256 dan SHA-1 berkas secara aman langsung di browser.',
      category: 'data',
      iconComponent: HashChecksumIcon,
      featureTag: 'Integritas Berkas',
      path: '/tools/data?mode=hash',
    },
    {
      id: 'base64',
      title: 'Base64 Encoder',
      description: 'Konversi file atau gambar menjadi string data URI Base64 untuk keperluan kode web atau API.',
      category: 'data',
      iconComponent: Base64Icon,
      featureTag: 'Data URI String',
      path: '/tools/data?mode=base64',
    },
  ]

  const popularTools = tools.filter((t) => t.isPopular)

  const filteredTools = tools.filter((tool) => {
    const matchCategory = selectedCategory === 'all' || tool.category === selectedCategory
    const matchSearch =
      tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.featureTag.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCategory && matchSearch
  })

  // Clean, Modern iLovePDF-Style Card
  const renderILovePdfCard = (tool: ToolItem) => {
    const IconComponent = tool.iconComponent

    return (
      <div
        key={tool.id}
        onClick={() => navigate(tool.path)}
        className="group relative flex flex-col justify-between rounded-2xl border border-[#E5E7EB] bg-white p-5 hover:border-[#D1D5DB] hover:shadow-lg hover:-translate-y-1 dark:border-[#374151] dark:bg-[#1F2937] dark:hover:border-[#4B5563] dark:hover:shadow-black/40 transition-all duration-200 cursor-pointer select-none"
      >
        <div>
          {/* Top Row: Iconic iLovePDF Icon Badge & Optional Tag */}
          <div className="flex items-start justify-between mb-4">
            <div className="group-hover:scale-105 transition-transform duration-200">
              <IconComponent size={50} />
            </div>

            {tool.badgeLabel && (
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${tool.badgeClass}`}
              >
                {tool.badgeLabel}
              </span>
            )}
          </div>

          {/* Title with bold typography */}
          <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6] group-hover:text-[#E5322D] dark:group-hover:text-[#F87171] transition-colors leading-snug">
            {tool.title}
          </h3>

          {/* Description */}
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-1.5 leading-relaxed line-clamp-2">
            {tool.description}
          </p>
        </div>

        {/* Card Footer: Subtle Feature Tag & Arrow */}
        <div className="mt-4 pt-3 border-t border-[#F3F4F6] dark:border-[#374151]/60 flex items-center justify-between">
          <span className="text-[11px] font-medium text-[#9CA3AF] dark:text-[#6B7280] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E5322D]/60 dark:bg-[#F87171]/60" />
            {tool.featureTag}
          </span>

          <span className="text-xs font-semibold text-[#6B7280] group-hover:text-[#E5322D] dark:text-[#9CA3AF] dark:group-hover:text-[#F87171] flex items-center gap-1 transition-colors">
            <span>Buka</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    )
  }

  const isFiltering = selectedCategory !== 'all' || searchQuery.trim().length > 0

  return (
    <div className="flex flex-col min-h-full w-full min-w-0">
      {/* 1. Header Section inspired by iLovePDF Hero Header */}
      <div className="text-center py-6 sm:py-8 max-w-3xl mx-auto px-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEE2E2] text-[#DC2626] dark:bg-[#7F1D1D]/30 dark:text-[#F87171] text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tools Studio 9Drive</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-[#111827] dark:text-[#F9FAFB] tracking-tight">
          Semua alat pengolahan dokumen & berkas dalam satu tempat
        </h1>
        <p className="mt-2.5 text-xs sm:text-sm text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
          Semua alat yang Anda butuhkan untuk mengolah PDF, gambar AI, dan utilitas data. Cepat, aman, dan 100% diproses langsung di browser tanpa batas antrean.
        </p>
      </div>

      {/* 2. Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 border-y border-[#E5E7EB] dark:border-[#374151] mb-6">
        {/* Category Filter Pills (iLovePDF Style) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all' as const, label: 'Semua Alat' },
            { id: 'pdf' as const, label: 'Dokumen PDF' },
            { id: 'image' as const, label: 'AI & Gambar' },
            { id: 'data' as const, label: 'Utilitas Data' },
          ].map((cat) => {
            const isActive = selectedCategory === cat.id
            const count =
              cat.id === 'all' ? tools.length : tools.filter((t) => t.category === cat.id).length
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`h-9 px-4 rounded-full text-xs font-semibold whitespace-nowrap transition-all select-none flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#E5322D] text-white shadow-sm'
                    : 'bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB] dark:bg-[#374151] dark:text-[#D1D5DB] dark:hover:bg-[#4B5563]'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-black/5 dark:bg-white/10 text-[#6B7280] dark:text-[#9CA3AF]'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <Input
              type="text"
              placeholder="Cari alat (cth: merge, kompres, bg)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9.5 h-9 text-xs rounded-full bg-[#F3F4F6] dark:bg-[#374151] border-0 text-[#111827] dark:text-[#F9FAFB] focus-visible:ring-2 focus-visible:ring-[#E5322D]"
            />
          </div>
          {isFiltering && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all')
                setSearchQuery('')
              }}
              title="Reset Filter"
              className="flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-medium border border-[#E5E7EB] bg-white hover:bg-[#F3F4F6] text-[#4B5563] dark:border-[#374151] dark:bg-[#1F2937] dark:text-[#D1D5DB] dark:hover:bg-[#374151] transition-colors shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Featured / Popular Section (Shown when not searching) */}
      {!isFiltering && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
                Paling Sering Digunakan
              </h2>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                Alat favorit pengguna untuk pengolahan harian cepat
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-[#059669] font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>100% Client-Side Engine</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {popularTools.map(renderILovePdfCard)}
          </div>
        </div>
      )}

      {/* 4. All Tools Grid */}
      <div className="space-y-4 pb-12">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
            {isFiltering ? 'Hasil Pencarian' : 'Semua Koleksi Alat'}
          </h2>
          <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            Menampilkan {filteredTools.length} dari {tools.length} alat
          </span>
        </div>

        {filteredTools.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-[#E5E7EB] dark:border-[#374151] bg-[#F9FAFB] dark:bg-[#1F2937]/50">
            <p className="text-sm font-medium text-[#4B5563] dark:text-[#9CA3AF]">
              Tidak ada alat yang cocok dengan pencarian "{searchQuery}"
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all')
                setSearchQuery('')
              }}
              className="mt-3 text-xs text-[#E5322D] hover:underline font-semibold"
            >
              Reset semua filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTools.map(renderILovePdfCard)}
          </div>
        )}
      </div>
    </div>
  )
}
