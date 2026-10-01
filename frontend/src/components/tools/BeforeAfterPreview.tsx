import { useState, useRef, useEffect } from 'react'
import { Eye, MoveHorizontal, Palette } from 'lucide-react'

type Props = {
  originalUrl: string
  cutoutUrl: string
  className?: string
  alt?: string
}

export function BeforeAfterPreview({
  originalUrl,
  cutoutUrl,
  className = '',
  alt = 'Image preview',
}: Props) {
  const [sliderPos, setSliderPos] = useState(50) // percentage
  const [isDragging, setIsDragging] = useState(false)
  const [viewMode, setViewMode] = useState<'slider' | 'side' | 'toggle'>('slider')
  const [showOriginal, setShowOriginal] = useState(false)
  const [backdropColor, setBackdropColor] = useState<'transparent' | string>('transparent')
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setSliderPos(percent)
  }

  const handleMouseDown = () => setIsDragging(true)
  const handleTouchStart = () => setIsDragging(true)

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false)
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (isDragging) handleMove(e.clientX)
    }
    const handleTouchMove = (e: globalThis.TouchEvent) => {
      if (isDragging && e.touches[0]) handleMove(e.touches[0].clientX)
    }

    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('touchend', handleMouseUp)
      window.addEventListener('touchmove', handleTouchMove)
    }
    return () => {
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchend', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [isDragging])

  const colorPresets = [
    { label: 'Transparent', value: 'transparent', class: 'checkerboard-bg' },
    { label: 'White', value: '#FFFFFF' },
    { label: 'Dark', value: '#1E1F20' },
    { label: 'Merah Pasfoto', value: '#D32F2F' },
    { label: 'Biru Pasfoto', value: '#1976D2' },
  ]

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Control Bar: Mode + Backdrop presets */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        {/* View Mode Buttons */}
        <div className="flex items-center gap-1 bg-[#F0F4F9] dark:bg-[#28292A] p-0.5 rounded-full text-xs">
          <button
            type="button"
            onClick={() => setViewMode('slider')}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              viewMode === 'slider'
                ? 'bg-white dark:bg-[#1E1F20] text-[#0B57D0] dark:text-[#A8C7FA] shadow-xs'
                : 'text-[#444746] dark:text-[#C4C7C5]'
            }`}
          >
            Slider
          </button>
          <button
            type="button"
            onClick={() => setViewMode('side')}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              viewMode === 'side'
                ? 'bg-white dark:bg-[#1E1F20] text-[#0B57D0] dark:text-[#A8C7FA] shadow-xs'
                : 'text-[#444746] dark:text-[#C4C7C5]'
            }`}
          >
            Berdampingan
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('toggle')
              setShowOriginal(false)
            }}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              viewMode === 'toggle'
                ? 'bg-white dark:bg-[#1E1F20] text-[#0B57D0] dark:text-[#A8C7FA] shadow-xs'
                : 'text-[#444746] dark:text-[#C4C7C5]'
            }`}
          >
            Toggle
          </button>
        </div>

        {/* Backdrop Color Switcher */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#747775] dark:text-[#8E918F] flex items-center gap-1">
            <Palette className="w-3.5 h-3.5" /> Latar:
          </span>
          <div className="flex items-center gap-1">
            {colorPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                title={preset.label}
                onClick={() => setBackdropColor(preset.value)}
                className={`w-5 h-5 rounded-full border transition-all ${
                  backdropColor === preset.value
                    ? 'ring-2 ring-[#0B57D0] scale-110'
                    : 'border-[#E0E3E7] dark:border-[#36373A]'
                } ${preset.class || ''}`}
                style={
                  preset.value !== 'transparent'
                    ? { backgroundColor: preset.value }
                    : {}
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Preview Container */}
      {viewMode === 'slider' && (
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="relative w-full h-[380px] sm:h-[440px] rounded-2xl overflow-hidden select-none cursor-ew-resize border border-[#E0E3E7] dark:border-[#36373A]"
          style={
            backdropColor !== 'transparent'
              ? { backgroundColor: backdropColor }
              : {
                  backgroundImage:
                    'repeating-conic-gradient(#80808020 0% 25%, transparent 0% 50%)',
                  backgroundSize: '20px 20px',
                }
          }
        >
          {/* Background: Cutout (Result) */}
          <img
            src={cutoutUrl}
            alt={`${alt} - cutout`}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />

          {/* Foreground: Original (Clipped by slider position) */}
          <div
            className="absolute inset-y-0 left-0 overflow-hidden pointer-events-none bg-white dark:bg-[#1E1F20]"
            style={{ width: `${sliderPos}%` }}
          >
            <img
              src={originalUrl}
              alt={`${alt} - original`}
              className="absolute inset-y-0 left-0 max-w-none w-full h-full object-contain"
              style={{
                width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%',
              }}
            />
          </div>

          {/* Divider Line & Handle */}
          <div
            className="absolute inset-y-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] cursor-ew-resize"
            style={{ left: `calc(${sliderPos}% - 2px)` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -left-4 w-9 h-9 rounded-full bg-white shadow-lg border border-black/10 flex items-center justify-center text-[#1F1F1F]">
              <MoveHorizontal className="w-4 h-4" />
            </div>
          </div>

          {/* Badges */}
          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium pointer-events-none">
            Original
          </div>
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium pointer-events-none">
            Removed Background
          </div>
        </div>
      )}

      {viewMode === 'side' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative h-[320px] rounded-3xl overflow-hidden border border-[#E0E3E7] dark:border-[#36373A] bg-white dark:bg-[#1E1F20]">
            <img
              src={originalUrl}
              alt={`${alt} - original`}
              className="w-full h-full object-contain p-2"
            />
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium">
              Original
            </div>
          </div>

          <div
            className="relative h-[320px] rounded-3xl overflow-hidden border border-[#E0E3E7] dark:border-[#36373A]"
            style={
              backdropColor !== 'transparent'
                ? { backgroundColor: backdropColor }
                : {
                    backgroundImage:
                      'repeating-conic-gradient(#80808020 0% 25%, transparent 0% 50%)',
                    backgroundSize: '20px 20px',
                  }
            }
          >
            <img
              src={cutoutUrl}
              alt={`${alt} - cutout`}
              className="w-full h-full object-contain p-2"
            />
            <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium">
              Removed Background
            </div>
          </div>
        </div>
      )}

      {viewMode === 'toggle' && (
        <div className="flex flex-col items-center gap-3">
          <div
            className="relative w-full h-[400px] rounded-3xl overflow-hidden border border-[#E0E3E7] dark:border-[#36373A]"
            style={
              !showOriginal && backdropColor !== 'transparent'
                ? { backgroundColor: backdropColor }
                : !showOriginal
                ? {
                    backgroundImage:
                      'repeating-conic-gradient(#80808020 0% 25%, transparent 0% 50%)',
                    backgroundSize: '20px 20px',
                  }
                : { backgroundColor: '#FFFFFF' }
            }
          >
            <img
              src={showOriginal ? originalUrl : cutoutUrl}
              alt={alt}
              className="w-full h-full object-contain p-4 transition-all duration-200"
            />
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium">
              {showOriginal ? 'Showing: Original' : 'Showing: Removed Background'}
            </div>
          </div>
          <button
            type="button"
            onMouseDown={() => setShowOriginal(true)}
            onMouseUp={() => setShowOriginal(false)}
            onTouchStart={() => setShowOriginal(true)}
            onTouchEnd={() => setShowOriginal(false)}
            className="flex items-center gap-2 py-2 px-5 rounded-full text-xs font-medium bg-[#0B57D0] text-white hover:bg-[#0B57D0]/90 active:scale-95 transition-all shadow-md select-none"
          >
            <Eye className="w-4 h-4" />
            <span>Hold to See Original</span>
          </button>
        </div>
      )}
    </div>
  )
}
