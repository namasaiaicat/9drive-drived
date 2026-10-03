import { cn } from '@/lib/utils'
import type { FileItem } from '@/data/drive-data'

export function FileIcon({ kind, className }: { kind: FileItem['kind'] | string; className?: string }) {
  const iconClass = cn('h-5 w-5 shrink-0 select-none', className)

  if (kind === 'sheet' || kind === 'slides' || kind === 'other') {
    const color = kind === 'sheet' ? '#0F9D58' : kind === 'slides' ? '#F4B400' : '#5F6368'
    return <svg viewBox="0 0 24 24" className={iconClass} aria-label={`${kind} file`}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill={color} /><path d="M14 2v6h6z" fill="white" opacity="0.5" />{kind === 'sheet' ? <path d="M8 11h8v7H8zM8 14h8m-4-3v7" stroke="white" fill="none" /> : <path d="M8 12h8v5H8z" stroke="white" fill="none" />}</svg>
  }

  if (kind === 'pdf') {
    // Google Drive PDF Icon (Red)
    return (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-label="PDF file">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#EA4335" />
        <path d="M14 2v6h6l-6-6z" fill="#FAD2CF" />
        <path d="M8 13h2a1.5 1.5 0 0 0 0-3H8v5m0-2h2m4-3v5m0-5h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2m-8 0v2m4-2v2" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (kind === 'image') {
    // Google Drive Image Icon (Red/Coral)
    return (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-label="Image file">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#EA4335" />
        <path d="M14 2v6h6l-6-6z" fill="#FAD2CF" />
        <circle cx="8.5" cy="12.5" r="1.5" fill="#FFFFFF" />
        <path d="M6 18l4-4 2.5 2.5 3.5-4.5 4 6H6z" fill="#FFFFFF" />
      </svg>
    )
  }

  if (kind === 'video') {
    // Google Drive Video Icon (Purple / Red)
    return (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-label="Video file">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#D93025" />
        <path d="M14 2v6h6l-6-6z" fill="#FAD2CF" />
        <polygon points="10 11 16 14.5 10 18 10 11" fill="#FFFFFF" />
      </svg>
    )
  }

  if (kind === 'archive') {
    // Google Drive Archive / Zip Icon (Gray/Slate)
    return (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-label="Archive file">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#5F6368" />
        <path d="M14 2v6h6l-6-6z" fill="#E8EAED" />
        <rect x="10" y="10" width="4" height="2" fill="#FFFFFF" />
        <rect x="10" y="13" width="4" height="2" fill="#FFFFFF" />
        <rect x="10" y="16" width="4" height="3" rx="0.5" fill="#FFFFFF" />
      </svg>
    )
  }

  // Google Docs / General Document Icon (Blue)
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-label="Document file">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#4285F4" />
      <path d="M14 2v6h6l-6-6z" fill="#D2E3FC" />
      <line x1="8" y1="12" x2="16" y2="12" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="15" x2="16" y2="15" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="18" x2="13" y2="18" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
