import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Binary,
  Calendar,
  CheckCircle2,
  Combine,
  FileCode,
  Fingerprint,
  HardDrive,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  RefreshCw,
  RotateCw,
  Scissors,
  Search,
  SlidersHorizontal,
  Sparkles,
  Stamp,
  Zap,
} from 'lucide-react'
import { Input } from '@/components/ui/input'

type ToolCategory = 'all' | 'pdf' | 'image' | 'data'

type ToolItem = {
  id: string
  title: string
  description: string
  category: 'pdf' | 'image' | 'data'
  icon: React.ElementType
  iconColor: string
  iconBg: string
  badgeLabel: string
  badgeClass: string
  featureTag: string
  isPopular?: boolean
  path: string
}

export function ToolsHubPage() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const tools: ToolItem[] = [
    // 1. AI & Image Suite
    {
      id: 'remove-bg',
      title: 'Hapus Background AI',
      description: 'Hapus latar belakang foto otomatis dengan neural network AI. Mendukung batch & custom backdrop.',
      category: 'image',
      icon: Sparkles,
      iconColor: 'text-[#7248B9] dark:text-[#D0BCFF]',
      iconBg: 'bg-[#F3E8FD] dark:bg-[#7248B9]/20',
      badgeLabel: 'AI Powered',
      badgeClass: 'bg-[#F3E8FD] text-[#7248B9] dark:bg-[#7248B9]/20 dark:text-[#D0BCFF]',
      featureTag: 'Neural Cutout',
      isPopular: true,
      path: '/tools/remove-bg',
    },
    {
      id: 'compress-img',
      title: 'Kompres Gambar',
      description: 'Kecilkan ukuran file foto JPG, PNG, dan WebP secara batch tanpa mengurangi kualitas visual.',
      category: 'image',
      icon: Minimize2,
      iconColor: 'text-[#0B57D0] dark:text-[#A8C7FA]',
      iconBg: 'bg-[#EDF2FC] dark:bg-[#004A77]/20',
      badgeLabel: 'Gambar',
      badgeClass: 'bg-[#EDF2FC] text-[#0B57D0] dark:bg-[#004A77]/20 dark:text-[#A8C7FA]',
      featureTag: 'TinyPNG Style',
      isPopular: true,
      path: '/tools/image?mode=compress',
    },
    {
      id: 'convert-img',
      title: 'Konversi Format Gambar',
      description: 'Ubah format gambar secara batch antara WebP, PNG, dan JPG untuk web atau dokumen.',
      category: 'image',
      icon: RefreshCw,
      iconColor: 'text-[#0B57D0] dark:text-[#A8C7FA]',
      iconBg: 'bg-[#EDF2FC] dark:bg-[#004A77]/20',
      badgeLabel: 'Gambar',
      badgeClass: 'bg-[#EDF2FC] text-[#0B57D0] dark:bg-[#004A77]/20 dark:text-[#A8C7FA]',
      featureTag: 'WebP ⇄ PNG ⇄ JPG',
      path: '/tools/image?mode=convert',
    },
    {
      id: 'resize-img',
      title: 'Ubah Ukuran Gambar',
      description: 'Ubah dimensi foto secara persentase atau pixel tepat dengan kunci rasio aspek otomatis.',
      category: 'image',
      icon: Maximize2,
      iconColor: 'text-[#0B57D0] dark:text-[#A8C7FA]',
      iconBg: 'bg-[#EDF2FC] dark:bg-[#004A77]/20',
      badgeLabel: 'Gambar',
      badgeClass: 'bg-[#EDF2FC] text-[#0B57D0] dark:bg-[#004A77]/20 dark:text-[#A8C7FA]',
      featureTag: 'Pixel & Rasio',
      path: '/tools/image?mode=resize',
    },
    {
      id: 'watermark-img',
      title: 'Watermark Foto',
      description: 'Beri cap teks hak cipta pada puluhan gambar sekaligus di posisi tengah atau sudut berkas.',
      category: 'image',
      icon: Stamp,
      iconColor: 'text-[#0B57D0] dark:text-[#A8C7FA]',
      iconBg: 'bg-[#EDF2FC] dark:bg-[#004A77]/20',
      badgeLabel: 'Gambar',
      badgeClass: 'bg-[#EDF2FC] text-[#0B57D0] dark:bg-[#004A77]/20 dark:text-[#A8C7FA]',
      featureTag: 'Multi Position',
      path: '/tools/image?mode=watermark',
    },

    // 2. PDF Suite (Google Red)
    {
      id: 'merge-pdf',
      title: 'Gabungkan PDF (Merge)',
      description: 'Satukan beberapa berkas PDF menjadi satu dokumen urut dengan susunan yang dapat diatur.',
      category: 'pdf',
      icon: Combine,
      iconColor: 'text-[#D93025] dark:text-[#F2B8B5]',
      iconBg: 'bg-[#FCE8E6] dark:bg-[#D93025]/20',
      badgeLabel: 'PDF',
      badgeClass: 'bg-[#FCE8E6] text-[#D93025] dark:bg-[#D93025]/20 dark:text-[#F2B8B5]',
      featureTag: 'Batch Merge',
      isPopular: true,
      path: '/tools/pdf?mode=merge',
    },
    {
      id: 'compress-pdf',
      title: 'Kompres PDF',
      description: 'Kecilkan ukuran dokumen PDF agar hemat penyimpanan dan cepat dibagikan tanpa mengurangi kualitas.',
      category: 'pdf',
      icon: Minimize2,
      iconColor: 'text-[#D93025] dark:text-[#F2B8B5]',
      iconBg: 'bg-[#FCE8E6] dark:bg-[#D93025]/20',
      badgeLabel: 'PDF',
      badgeClass: 'bg-[#FCE8E6] text-[#D93025] dark:bg-[#D93025]/20 dark:text-[#F2B8B5]',
      featureTag: 'Size Optimizer',
      isPopular: true,
      path: '/tools/pdf?mode=compress',
    },
    {
      id: 'split-pdf',
      title: 'Pisahkan PDF (Split)',
      description: 'Ekstrak rentang halaman tertentu atau pecah seluruh halaman PDF menjadi berkas terpisah.',
      category: 'pdf',
      icon: Scissors,
      iconColor: 'text-[#D93025] dark:text-[#F2B8B5]',
      iconBg: 'bg-[#FCE8E6] dark:bg-[#D93025]/20',
      badgeLabel: 'PDF',
      badgeClass: 'bg-[#FCE8E6] text-[#D93025] dark:bg-[#D93025]/20 dark:text-[#F2B8B5]',
      featureTag: 'Page Splitter',
      path: '/tools/pdf?mode=split',
    },
    {
      id: 'images-to-pdf',
      title: 'Foto ke PDF',
      description: 'Gabungkan banyak foto JPG, PNG, dan WebP menjadi satu dokumen PDF album dengan margin rapi.',
      category: 'pdf',
      icon: ImageIcon,
      iconColor: 'text-[#D93025] dark:text-[#F2B8B5]',
      iconBg: 'bg-[#FCE8E6] dark:bg-[#D93025]/20',
      badgeLabel: 'PDF',
      badgeClass: 'bg-[#FCE8E6] text-[#D93025] dark:bg-[#D93025]/20 dark:text-[#F2B8B5]',
      featureTag: 'A4 / Letter Album',
      path: '/tools/pdf?mode=images-to-pdf',
    },
    {
      id: 'rotate-pdf',
      title: 'Putar PDF (Rotate)',
      description: 'Putar orientasi halaman dokumen PDF yang terbalik (90°, 180°, 270°) secara cepat dan serentak.',
      category: 'pdf',
      icon: RotateCw,
      iconColor: 'text-[#D93025] dark:text-[#F2B8B5]',
      iconBg: 'bg-[#FCE8E6] dark:bg-[#D93025]/20',
      badgeLabel: 'PDF',
      badgeClass: 'bg-[#FCE8E6] text-[#D93025] dark:bg-[#D93025]/20 dark:text-[#F2B8B5]',
      featureTag: 'Batch 90° - 270°',
      path: '/tools/pdf?mode=rotate',
    },
    {
      id: 'watermark-pdf',
      title: 'Watermark PDF',
      description: 'Bubuhkan stempel teks atau tanda hak cipta (contoh: "RAHASIA", "DRAFT") pada seluruh halaman PDF.',
      category: 'pdf',
      icon: Stamp,
      iconColor: 'text-[#D93025] dark:text-[#F2B8B5]',
      iconBg: 'bg-[#FCE8E6] dark:bg-[#D93025]/20',
      badgeLabel: 'PDF',
      badgeClass: 'bg-[#FCE8E6] text-[#D93025] dark:bg-[#D93025]/20 dark:text-[#F2B8B5]',
      featureTag: 'Security Stamp',
      path: '/tools/pdf?mode=watermark',
    },

    // 3. Data Utilities (Google Green)
    {
      id: 'csv-json',
      title: 'CSV ⇄ JSON Converter',
      description: 'Transformasi tabel data CSV ke JSON array dan sebaliknya secara instan dengan formater otomatis.',
      category: 'data',
      icon: FileCode,
      iconColor: 'text-[#0F9D58] dark:text-[#6DD58C]',
      iconBg: 'bg-[#E6F4EA] dark:bg-[#0F9D58]/20',
      badgeLabel: 'Data',
      badgeClass: 'bg-[#E6F4EA] text-[#0F9D58] dark:bg-[#0F9D58]/20 dark:text-[#6DD58C]',
      featureTag: 'Tabular Parsing',
      path: '/tools/data?mode=csv-json',
    },
    {
      id: 'hash',
      title: 'File Hash & Checksum',
      description: 'Hitung hash kriptografi SHA-256 dan SHA-1 berkas secara aman langsung di browser.',
      category: 'data',
      icon: Fingerprint,
      iconColor: 'text-[#0F9D58] dark:text-[#6DD58C]',
      iconBg: 'bg-[#E6F4EA] dark:bg-[#0F9D58]/20',
      badgeLabel: 'Data',
      badgeClass: 'bg-[#E6F4EA] text-[#0F9D58] dark:bg-[#0F9D58]/20 dark:text-[#6DD58C]',
      featureTag: 'SHA-256 & SHA-1',
      path: '/tools/data?mode=hash',
    },
    {
      id: 'base64',
      title: 'Base64 Encoder',
      description: 'Konversi file atau gambar menjadi string data URI Base64 untuk keperluan kode web.',
      category: 'data',
      icon: Binary,
      iconColor: 'text-[#0F9D58] dark:text-[#6DD58C]',
      iconBg: 'bg-[#E6F4EA] dark:bg-[#0F9D58]/20',
      badgeLabel: 'Data',
      badgeClass: 'bg-[#E6F4EA] text-[#0F9D58] dark:bg-[#0F9D58]/20 dark:text-[#6DD58C]',
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

  // Template-Style Card Component inspired by reference
  const renderFlowCard = (tool: ToolItem) => {
    const Icon = tool.icon

    return (
      <div
        key={tool.id}
        onClick={() => navigate(tool.path)}
        className="group flex flex-col justify-between rounded-2xl border border-[#E0E3E7] bg-white p-3.5 hover:border-[#0B57D0]/40 hover:bg-[#F8FAFD] dark:border-[#36373A] dark:bg-[#1E1F20] dark:hover:bg-[#28292A] dark:hover:border-[#A8C7FA]/30 transition-all cursor-pointer select-none shadow-xs hover:shadow-sm"
      >
        <div>
          {/* Top Visual Canvas Box (Inspired by Reference) */}
          <div className="relative h-28 w-full rounded-xl overflow-hidden bg-[#F8FAFD] dark:bg-[#18191A] border border-[#E0E3E7]/60 dark:border-[#36373A]/60 flex items-center justify-center mb-3.5">
            {/* Subtle Grid Dot Background */}
            <div
              className="absolute inset-0 opacity-40 dark:opacity-25 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#94A3B8 1px, transparent 1px)',
                backgroundSize: '12px 12px',
              }}
            />

            {/* Category Badge (Top Right) */}
            <div className="absolute top-2.5 right-2.5 z-10">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${tool.badgeClass}`}
              >
                {tool.badgeLabel}
              </span>
            </div>

            {/* Central Visual Icon Plate */}
            <div className="relative z-10 flex items-center justify-center">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs border border-white/60 dark:border-black/20 group-hover:scale-108 transition-transform duration-200 ${tool.iconBg} ${tool.iconColor}`}
              >
                <Icon className="w-6 h-6 stroke-[1.8]" />
              </div>
            </div>

            {/* Bottom Accent Line */}
            <div className="absolute bottom-0 inset-x-0 h-[1.5px] bg-[#E0E3E7]/50 dark:bg-[#36373A]/50" />
          </div>

          {/* Title & Description */}
          <div className="px-1">
            <h3 className="text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3] group-hover:text-[#0B57D0] dark:group-hover:text-[#A8C7FA] transition-colors truncate">
              {tool.title}
            </h3>
            <p className="text-xs text-[#747775] dark:text-[#8E918F] mt-1 line-clamp-2 leading-relaxed h-8">
              {tool.description}
            </p>
          </div>
        </div>

        {/* Card Footer (Tag + Action Button) */}
        <div className="mt-3.5 pt-3 border-t border-[#E0E3E7]/60 dark:border-[#36373A]/60 flex items-center justify-between px-1">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#747775] dark:text-[#8E918F]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0B57D0]/60 dark:bg-[#A8C7FA]/60" />
            {tool.featureTag}
          </span>

          <button
            type="button"
            className="h-7 px-3 rounded-full text-xs font-medium border border-[#E0E3E7] bg-white text-[#1F1F1F] group-hover:border-[#0B57D0] group-hover:bg-[#0B57D0] group-hover:text-white dark:border-[#36373A] dark:bg-[#28292A] dark:text-[#E3E3E3] dark:group-hover:border-[#A8C7FA] dark:group-hover:bg-[#A8C7FA] dark:group-hover:text-[#001D35] transition-all flex items-center gap-1 shadow-xs"
          >
            <span>Gunakan</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    )
  }

  const isFiltering = selectedCategory !== 'all' || searchQuery.trim().length > 0

  return (
    <div className="flex flex-col min-h-full w-full min-w-0">
      {/* 1. Header Area (Inspired by FlowAI Reference Topbar) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#E0E3E7]/70 dark:border-[#36373A]/70">
        <div>
          <h1 className="text-xl sm:text-[22px] font-normal text-[#1F1F1F] dark:text-[#E3E3E3] tracking-tight">
            Tools Studio
          </h1>
          <p className="mt-0.5 text-xs text-[#747775] dark:text-[#8E918F]">
            Mulai cepat pengolahan PDF, AI background remover, dan utilitas data berkas 9Drive.
          </p>
        </div>

        {/* Right Header Status Pills (Dual Storage Engine) */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border border-[#E0E3E7] bg-white text-[#444746] dark:border-[#36373A] dark:bg-[#1E1F20] dark:text-[#C4C7C5]">
            <Calendar className="w-3.5 h-3.5 text-[#747775]" />
            <span>1 Okt 2026</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border border-[#E0E3E7] bg-[#F8FAFD] text-[#444746] dark:border-[#36373A] dark:bg-[#28292A] dark:text-[#C4C7C5]">
            <HardDrive className="w-3.5 h-3.5 text-[#0B57D0]" />
            <span>Dual Storage (9Drive + Local)</span>
          </div>

          <div className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border border-[#E0E3E7] bg-white text-[#444746] dark:border-[#36373A] dark:bg-[#1E1F20] dark:text-[#C4C7C5]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0F9D58]" />
            <span>Batch Engine</span>
          </div>
        </div>
      </div>

      {/* 2. Filter Bar & Search Row (Matching Reference) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all' as const, label: 'Semua' },
            { id: 'pdf' as const, label: 'Dokumen PDF' },
            { id: 'image' as const, label: 'AI & Gambar' },
            { id: 'data' as const, label: 'Utilitas Data' },
          ].map((cat) => {
            const isActive = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`h-8 px-4 rounded-full text-xs font-medium whitespace-nowrap transition-all border select-none ${
                  isActive
                    ? 'bg-[#C2E7FF] text-[#001D35] border-[#C2E7FF] dark:bg-[#004A77] dark:text-[#C2E7FF] dark:border-[#004A77]'
                    : 'bg-transparent text-[#444746] border-[#E0E3E7] hover:bg-[#F0F4F9] dark:text-[#C4C7C5] dark:border-[#36373A] dark:hover:bg-[#28292A]'
                }`}
              >
                {cat.label}
              </button>
            )
          })}
        </div>

        {/* Search Input & Reset Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#747775] dark:text-[#8E918F]" />
            <Input
              type="text"
              placeholder="Cari alat produktivitas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8.5 text-xs rounded-full bg-[#EDF2FC] dark:bg-[#28292A] border-0 text-[#1F1F1F] dark:text-[#E3E3E3] focus-visible:ring-2 focus-visible:ring-[#0B57D0]"
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
              className="flex items-center gap-1.5 h-8.5 px-3 rounded-full text-xs font-medium border border-[#E0E3E7] bg-white hover:bg-[#F0F4F9] text-[#444746] dark:border-[#36373A] dark:bg-[#1E1F20] dark:text-[#C4C7C5] dark:hover:bg-[#28292A] transition-colors shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Section: "Sering Digunakan" / Featured (Hidden when searching or filtering) */}
      {!isFiltering && (
        <div className="mb-7">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
                Alat Populer & Rekomendasi
              </h2>
              <p className="text-[11px] text-[#747775] dark:text-[#8E918F]">
                Alat yang paling sering digunakan untuk pengolahan dokumen dan media harian.
              </p>
            </div>

            <span className="text-xs text-[#0B57D0] dark:text-[#A8C7FA] font-medium hidden sm:inline-flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              Siap Digunakan
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {popularTools.map(renderFlowCard)}
          </div>
        </div>
      )}

      {/* 4. Section: "Semua Alat" (All Tools Grid) */}
      <div className="space-y-3 pb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
            {isFiltering ? 'Hasil Pencarian' : 'Semua Alat'}
          </h2>
          <span className="text-xs text-[#747775] dark:text-[#8E918F]">
            Menampilkan {filteredTools.length} dari {tools.length} alat
          </span>
        </div>

        {filteredTools.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center select-none rounded-2xl border border-dashed border-[#E0E3E7] dark:border-[#36373A]">
            <div className="w-12 h-12 rounded-full bg-[#EDF2FC] dark:bg-[#28292A] flex items-center justify-center text-[#747775] mb-3">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
              Tidak ada alat yang cocok
            </p>
            <p className="text-xs text-[#747775] dark:text-[#8E918F] mt-1">
              Coba kata kunci pencarian yang lain atau reset filter kategori.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredTools.map(renderFlowCard)}
          </div>
        )}
      </div>
    </div>
  )
}


