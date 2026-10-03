import { useEffect, useRef } from 'react'

export function useMenuFocus(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open || !ref.current) return
    const menu = ref.current
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const buttons = () => [...menu.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')].filter(button => button.getClientRects().length)
    const frame = requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect()
      if (menu.style.top && rect.bottom > window.innerHeight - 12) menu.style.top = `${Math.max(12, window.innerHeight - rect.height - 12)}px`
      buttons()[0]?.focus()
    })
    function onKeyDown(event: KeyboardEvent) {
      if (!menu.contains(document.activeElement)) return
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current(); return }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const items = buttons()
      const current = items.indexOf(document.activeElement as HTMLButtonElement)
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
      items[index]?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      if (previous?.isConnected && (menu.contains(document.activeElement) || document.activeElement === document.body)) previous.focus()
    }
  }, [open])
  return ref
}
