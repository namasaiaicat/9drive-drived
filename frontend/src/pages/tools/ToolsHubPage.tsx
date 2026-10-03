import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Folder,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/drive/PageHeader'
import { useLanguage } from '@/context/LanguageContext'
import {
  MergePdfIcon,
  SplitPdfIcon,
  CompressPdfIcon,
  ImagesToPdfIcon,
  RotatePdfIcon,
  WatermarkPdfIcon,
  PdfToImagesIcon,
  RemoveBgIcon,
  CompressImageIcon,
  ConvertImageIcon,
  ResizeImageIcon,
  WatermarkImageIcon,
  CropImageIcon,
  VideoToAudioIcon,
  CsvJsonIcon,
  HashChecksumIcon,
  Base64Icon,
} from '@/components/tools/ToolIcons'

type ToolCategory = 'all' | 'pdf' | 'image' | 'video' | 'data'

type ToolItem = {
  id: string
  title: string
  description: string
  category: 'pdf' | 'image' | 'video' | 'data'
  iconComponent: React.ComponentType<{ className?: string; size?: number }>
  badgeLabel?: string
  badgeClass?: string
  featureTag: string
  path: string
}

type CategoryGroup = {
  id: 'pdf' | 'image' | 'video' | 'data'
  label: string
  description: string
  iconColor: string
}

export function ToolsHubPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const categoryGroups: CategoryGroup[] = [
    {
      id: 'pdf',
      label: t('tools.pdf', 'PDF documents'),
      description: 'Alat pengolahan dokumen PDF',
      iconColor: '#EA4335',   // DESIGN.md: PDF/Document red
    },
    {
      id: 'image',
      label: t('tools.image', 'Images'),
      description: 'Alat olah gambar dan AI',
      iconColor: '#7248B9',   // DESIGN.md: Images/Video purple
    },
    {
      id: 'video',
      label: t('tools.video', 'Video and audio'),
      description: 'Alat multimedia, ekstraksi suara & audio berkas',
      iconColor: '#FA7B17',   // DESIGN.md: Media orange
    },
    {
      id: 'data',
      label: t('tools.data', 'Data utilities'),
      description: 'Alat konversi dan utilitas data',
      iconColor: '#1A73E8',   // DESIGN.md: Primary Google Blue
    },
  ]

  const tools: ToolItem[] = [
    // 1. PDF Suite
    {
      id: 'merge-pdf',
      title: 'Merge PDF',
      description: 'Satukan beberapa berkas PDF menjadi satu dokumen berurutan sesuai susunan yang Anda tentukan.',
      category: 'pdf',
      iconComponent: MergePdfIcon,
      badgeLabel: 'Populer',
      badgeClass: 'bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#174EA6]/30 dark:text-[#8AB4F8]',
      featureTag: 'Penggabung PDF',
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
      badgeClass: 'bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#174EA6]/30 dark:text-[#8AB4F8]',
      featureTag: 'Optimasi Ukuran',
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
      id: 'pdf-to-images',
      title: 'PDF ke Gambar (JPG/PNG)',
      description: 'Ekstrak setiap lembar dokumen PDF menjadi berkas foto berkualitas tinggi (JPG atau PNG) dengan pratinjau cepat.',
      category: 'pdf',
      iconComponent: PdfToImagesIcon,
      badgeLabel: 'Baru',
      badgeClass: 'bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#174EA6]/30 dark:text-[#8AB4F8]',
      featureTag: 'Ekstrak Gambar',
      path: '/tools/pdf?mode=pdf-to-images',
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
      description: 'Hapus latar belakang foto manusia atau produk secara otomatis dan instan langsung di browser.',
      category: 'image',
      iconComponent: RemoveBgIcon,
      badgeLabel: 'AI Powered',
      badgeClass: 'bg-[#F3E8FF] text-[#7248B9] dark:bg-[#4A148C]/30 dark:text-[#D7AEFB]',
      featureTag: 'Hapus Latar Otomatis',
      path: '/tools/remove-bg',
    },
    {
      id: 'compress-img',
      title: 'Kompres Gambar',
      description: 'Atur kualitas JPG, PNG, atau WebP untuk mengurangi ukuran file. Hasil bergantung pada gambar dan pengaturan.',
      category: 'image',
      iconComponent: CompressImageIcon,
      badgeLabel: 'Populer',
      badgeClass: 'bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#174EA6]/30 dark:text-[#8AB4F8]',
      featureTag: 'Kecilkan Ukuran',
      path: '/tools/image?mode=compress',
    },
    {
      id: 'crop-img',
      title: 'Potong Foto / Pas Foto',
      description: 'Potong foto dengan preset rasio pas foto resmi (3:4, 4:6), persegi 1:1, atau rasio kustom bebas.',
      category: 'image',
      iconComponent: CropImageIcon,
      badgeLabel: 'Baru',
      badgeClass: 'bg-[#F3E8FF] text-[#7248B9] dark:bg-[#4A148C]/30 dark:text-[#D7AEFB]',
      featureTag: 'Crop & Pas Foto',
      path: '/tools/image?mode=crop',
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

    // 3. Video & Audio Suite (TinyWow Inspired)
    {
      id: 'video-to-audio',
      title: 'Ekstrak Audio Video',
      description: 'Ambil dan ubah suara dari video MP4, WebM, atau MOV menjadi berkas audio jernih (.WAV) langsung di browser.',
      category: 'video',
      iconComponent: VideoToAudioIcon,
      badgeLabel: 'Baru',
      badgeClass: 'bg-[#FEF7E0] text-[#B06000] dark:bg-[#7C4A00]/30 dark:text-[#FDD663]',
      featureTag: 'Ambil Suara Video',
      path: '/tools/video',
    },

    // 4. Data & Utilitas Berkas
    {
      id: 'csv-json',
      title: 'CSV ⇄ JSON Converter',
      description: 'Ubah data tabel CSV ke format JSON dan sebaliknya secara instan dengan susunan rapi otomatis.',
      category: 'data',
      iconComponent: CsvJsonIcon,
      featureTag: 'Konversi Tabel',
      path: '/tools/data?mode=csv-json',
    },
    {
      id: 'hash',
      title: 'File Hash & Checksum',
      description: 'Cek keaslian dan keamanan berkas menggunakan sidik jari digital (SHA-256) secara aman di browser.',
      category: 'data',
      iconComponent: HashChecksumIcon,
      featureTag: 'Cek Keaslian Berkas',
      path: '/tools/data?mode=hash',
    },
    {
      id: 'base64',
      title: 'Base64 Encoder',
      description: 'Ubah berkas atau gambar menjadi teks kode data Base64 untuk keperluan halaman web atau dokumen.',
      category: 'data',
      iconComponent: Base64Icon,
      featureTag: 'Kode Teks Berkas',
      path: '/tools/data?mode=base64',
    },
  ]

  const localizedTools = tools.map(tool => ({ ...tool, title: t(`tools.${tool.id}.title`, tool.title), description: t(`tools.${tool.id}.description`, tool.description) }))
  const filteredTools = localizedTools.filter((tool) => {
    const matchCategory = selectedCategory === 'all' || tool.category === selectedCategory
    const matchSearch =
      tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.featureTag.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCategory && matchSearch
  })

  const isSearching = searchQuery.trim().length > 0

  // Material Design 3 Tool Card
  const renderToolCard = (tool: ToolItem) => {
    const IconComponent = tool.iconComponent

    return (
      <button type="button"
        key={tool.id}
        onClick={() => navigate(tool.path)}
        className="group relative flex flex-col justify-between rounded-2xl border border-[#E0E3E7] bg-white p-5 text-left hover:bg-[#F0F4F9] dark:border-[#36373A] dark:bg-[#1E1F20] dark:hover:bg-[#333537] transition-colors cursor-pointer select-none"
      >
        <div>
          {/* Top Row: Tool Icon & Optional Badge */}
          <div className="flex items-start justify-between mb-4">
            <div className="group-hover:scale-105 transition-transform duration-200">
              <IconComponent size={50} />
            </div>

            {tool.badgeLabel && !['Populer', 'Baru', 'AI Powered'].includes(tool.badgeLabel) && (
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${tool.badgeClass}`}
              >
                {tool.badgeLabel}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3] group-hover:text-[#0B57D0] dark:group-hover:text-[#A8C7FA] transition-colors leading-snug">
            {tool.title}
          </h3>

          {/* Description */}
          <p className="text-xs text-[#444746] dark:text-[#C4C7C5] mt-1.5 leading-relaxed line-clamp-2">
            {tool.description}
          </p>
        </div>

        {/* Card Footer: Subtle Feature Tag & Arrow */}
        <div className="mt-4 pt-3 border-t border-[#E0E3E7]/60 dark:border-[#36373A]/60 flex items-center justify-between">
          <span className="text-[11px] font-medium text-[#747775] dark:text-[#8E918F] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0B57D0]/60 dark:bg-[#A8C7FA]/60" />
            {t(`tools.${tool.category}`, tool.category)}
          </span>

          <span className="text-xs font-medium text-[#747775] group-hover:text-[#0B57D0] dark:text-[#8E918F] dark:group-hover:text-[#A8C7FA] flex items-center gap-1 transition-colors">
            <span>{t('tools.open', 'Open tool')}</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </button>
    )
  }

  // Folder Group Renderer
  const renderFolderGroup = (group: CategoryGroup, groupTools: ToolItem[]) => (
    <div key={group.id} className="mb-6">
      {/* Folder Tab */}
      <div className="flex items-center">
        <div className="flex items-center gap-2 px-4 py-2 rounded-t-xl border border-b-0 border-[#E0E3E7] bg-[#F8FAFD] dark:border-[#36373A] dark:bg-[#28292A]">
          <Folder className="w-4 h-4 shrink-0" style={{ color: group.iconColor }} />
          <span className="text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
            {group.label}
          </span>
          <span className="text-[11px] text-[#747775] dark:text-[#8E918F]">
            {groupTools.length} {t('tools.count', 'tools')}
          </span>
        </div>
      </div>

      {/* Folder Body */}
      <div className="rounded-2xl rounded-tl-none border border-[#E0E3E7] bg-[#F8FAFD] p-4 dark:border-[#36373A] dark:bg-[#28292A]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {groupTools.map(renderToolCard)}
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col min-h-full w-full min-w-0">
      {/* 1. Page Header (Material 3 / Google Drive Style) */}
      <PageHeader
        title="Tools Studio"
        description={t('tools.description', 'PDF, image, and data tools that process files in your browser.')}
      />

      {/* 2. Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 border-b border-[#E0E3E7]/60 dark:border-[#36373A]/60 mb-6 mt-4">
        {/* Category Filter Pills (Material 3 Chip Style) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all' as const, label: t('tools.all', 'All tools') },
            { id: 'pdf' as const, label: t('tools.pdf', 'PDF documents') },
            { id: 'image' as const, label: t('tools.image', 'Images') },
            { id: 'video' as const, label: t('tools.video', 'Video and audio') },
            { id: 'data' as const, label: t('tools.data', 'Data utilities') },
          ].map((cat) => {
            const isActive = selectedCategory === cat.id
            const count =
              cat.id === 'all' ? tools.length : tools.filter((t) => t.category === cat.id).length
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`h-8 px-4 rounded-full text-xs font-medium whitespace-nowrap transition-all select-none flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-[#C2E7FF] text-[#001D35] border-[#C2E7FF] dark:bg-[#004A77] dark:text-[#C2E7FF] dark:border-[#004A77]'
                    : 'bg-transparent text-[#444746] border-[#E0E3E7] hover:bg-[#F0F4F9] dark:text-[#C4C7C5] dark:border-[#36373A] dark:hover:bg-[#28292A]'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 rounded-full ${
                    isActive
                      ? 'bg-[#001D35]/10 text-[#001D35] dark:bg-[#C2E7FF]/15 dark:text-[#C2E7FF]'
                      : 'bg-black/5 dark:bg-white/10 text-[#747775] dark:text-[#8E918F]'
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
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#747775]" />
            <Input
              type="text"
              aria-label={t('tools.search', 'Search tools')}
              placeholder={t('tools.search', 'Search tools')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9.5 h-9 text-xs rounded-full bg-[#EDF2FC] dark:bg-[#28292A] border-0 text-[#1F1F1F] dark:text-[#E3E3E3] focus-visible:ring-2 focus-visible:ring-[#0B57D0]"
            />
          </div>
          {(selectedCategory !== 'all' || isSearching) && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all')
                setSearchQuery('')
              }}
              title={t('tools.reset', 'Clear filters')}
              aria-label={t('tools.reset', 'Clear filters')}
              className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border border-[#E0E3E7] bg-white hover:bg-[#F0F4F9] text-[#444746] dark:border-[#36373A] dark:bg-[#1E1F20] dark:text-[#C4C7C5] dark:hover:bg-[#28292A] transition-colors shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Content */}
      {isSearching ? (
        /* Flat search results (cross-category) */
        <div className="space-y-4 pb-12">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] leading-6 font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
              {t('tools.results', 'Search results')}
            </h2>
            <span className="text-xs text-[#747775] dark:text-[#8E918F]">
              {filteredTools.length} / {tools.length} {t('tools.count', 'tools')}
            </span>
          </div>

          {filteredTools.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-[#E0E3E7] dark:border-[#36373A] bg-[#F8FAFD] dark:bg-[#1E1F20]/50">
              <p className="text-sm font-medium text-[#444746] dark:text-[#C4C7C5]">
                {t('tools.none', 'No matching tools.')} "{searchQuery}"
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all')
                  setSearchQuery('')
                }}
                className="mt-3 text-xs text-[#0B57D0] hover:underline font-medium dark:text-[#A8C7FA]"
              >
                {t('tools.reset', 'Clear filters')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredTools.map(renderToolCard)}
            </div>
          )}
        </div>
      ) : (
        /* Grouped by Category — Folder containers */
        <div className="pb-12">
          {categoryGroups
            .filter((g) => selectedCategory === 'all' || selectedCategory === g.id)
            .map((group) => {
              const groupTools = localizedTools.filter((tool) => tool.category === group.id)
              if (groupTools.length === 0) return null
              return renderFolderGroup(group, groupTools)
            })}
        </div>
      )}
    </div>
  )
}
