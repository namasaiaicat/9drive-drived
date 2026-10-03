import type { FileItem } from '@/data/drive-data'

export function mimeToKind(mimeType: string): FileItem['kind'] {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType === 'application/pdf') return 'pdf'
  if (/zip|rar|tar|gzip|7z/.test(mimeType)) return 'archive'
  if (/spreadsheet|excel|csv/.test(mimeType)) return 'sheet'
  if (/presentation|powerpoint/.test(mimeType)) return 'slides'
  if (/document|msword|text\/|rtf|google-apps\.(form|drawing)/.test(mimeType)) return 'doc'
  return 'other'
}
