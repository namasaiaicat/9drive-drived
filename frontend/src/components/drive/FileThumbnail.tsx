import { useEffect, useRef, useState } from 'react'
import { API_URL, apiFetch } from '@/lib/api'
import type { FileItem } from '@/data/drive-data'
import { FileIcon } from '@/components/drive/FileIcon'

export function FileThumbnail({ file }: { file: FileItem }) {
  const ref = useRef<HTMLDivElement>(null)
  const [url, setUrl] = useState('')
  useEffect(() => {
    setUrl('')
    if (!ref.current || !file.id || file.kind !== 'image' || !file.sizeBytes || Number(file.sizeBytes) > 2 * 1024 * 1024) return
    const controller = new AbortController()
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return
      observer.disconnect()
      apiFetch<{ path?: string; url: string }>(`/files/${file.id}/preview-token`, { method: 'POST', signal: controller.signal })
        .then(data => { if (!controller.signal.aborted) setUrl(`${API_URL}${data.path ?? new URL(data.url).pathname}`) })
        .catch(() => undefined)
    })
    observer.observe(ref.current)
    return () => { controller.abort(); observer.disconnect() }
  }, [file.id, file.kind, file.sizeBytes])
  return <div ref={ref} className="mx-3 mb-2.5 flex h-28 items-center justify-center overflow-hidden rounded-xl bg-[#F0F4F9] dark:bg-[#28292A]">{url ? <img src={url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" onError={() => setUrl('')} /> : <FileIcon kind={file.kind} className="h-12 w-12" />}</div>
}
