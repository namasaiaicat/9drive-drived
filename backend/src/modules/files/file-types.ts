export const documentMimeTypes = [
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation', 'text/plain', 'text/csv', 'application/rtf',
  'application/vnd.google-apps.document', 'application/vnd.google-apps.spreadsheet',
  'application/vnd.google-apps.presentation', 'application/vnd.google-apps.form',
  'application/vnd.google-apps.drawing',
]

export function mimeFilter(kind: string) {
  if (kind === 'image' || kind === 'video') return { startsWith: `${kind}/` }
  if (kind === 'doc') return { in: documentMimeTypes }
  if (kind === 'pdf') return { equals: 'application/pdf' }
  return { in: ['application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/vnd.rar', 'application/x-tar', 'application/gzip', 'application/x-7z-compressed'] }
}
