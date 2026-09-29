import { cn } from '@/lib/utils'

export function BrandLogo({ className }: { className?: string }) {
  return (
    <div className={cn('inline-flex items-center justify-center shrink-0', className)}>
      <svg viewBox="0 0 87.3 78" className="h-full w-full" role="img" aria-label="9Drive logo">
        {/* Yellow top-left bar */}
        <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066DA" />
        {/* Blue left bar */}
        <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5L43.65 25z" fill="#00AC47" />
        {/* Green right bar */}
        <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 10.15 7.9 13.65z" fill="#EA4335" opacity="0" />
        {/* Standard Google Drive 3-color ribbon */}
        <path d="M29.9 1.2h27.5L84.9 47H57.4L29.9 1.2z" fill="#FFBA00" />
        <path d="M57.4 47l13.75 23.8c1.35-.8 2.5-1.9 3.3-3.3l12.85-22.3c.8-1.4 1.2-2.95 1.2-4.5H57.4z" fill="#0066DA" />
        <path d="M13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.4 4.5-1.2L59.8 53H27.5L13.75 76.8z" fill="#00AC47" />
        <path d="M27.5 53l-13.75 23.8c-1.35-.8-2.5-1.9-3.3-3.3L.05 51.5c-.8-1.4-.8-2.95 0-4.5L24.05 3c.8-1.4 1.95-2.5 3.3-3.3l13.8 23.9L27.5 53z" fill="#2684FC" />
      </svg>
    </div>
  )
}
