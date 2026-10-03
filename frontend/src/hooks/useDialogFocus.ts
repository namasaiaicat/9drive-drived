import { useEffect, useRef } from 'react'

const focusableSelector = 'button:not(:disabled), a[href], input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]'

export function useDialogFocus(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open || !ref.current) return
    const dialog = ref.current
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const background: { element: HTMLElement; inert: boolean }[] = []
    let branch: HTMLElement = dialog
    while (branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling !== branch && sibling instanceof HTMLElement) {
          background.push({ element: sibling, inert: sibling.inert })
          sibling.inert = true
        }
      }
      if (branch.parentElement === document.body) break
      branch = branch.parentElement
    }
    const controls = () => [...dialog.querySelectorAll<HTMLElement>(focusableSelector)].filter(element => element.getClientRects().length && !element.closest('[inert]'))
    const frame = requestAnimationFrame(() => {
      const initial = dialog.querySelector<HTMLElement>('[autofocus], input:not([type="hidden"]):not([disabled])') ?? controls()[0] ?? dialog
      initial.focus()
    })
    function onKeyDown(event: KeyboardEvent) {
      // Only the topmost dialog handles keys when a nested dialog is open.
      const dialogs = [...document.querySelectorAll('[aria-modal="true"]')]
      if (dialogs.at(-1) !== dialog) return
      if (event.key === 'Escape') {
        if (event.target instanceof Element && event.target.closest('[role="combobox"][aria-expanded="true"], [data-menu-surface]')) return
        event.preventDefault()
        event.stopPropagation()
        closeRef.current()
      }
      if (event.key === 'Tab') {
        const elements = controls()
        const first = elements[0] ?? dialog
        const last = elements.at(-1) ?? dialog
        if (!dialog.contains(document.activeElement) || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
          event.preventDefault()
          ;(event.shiftKey ? last : first).focus()
        }
      }
    }
    function keepFocus(event: FocusEvent) {
      const dialogs = [...document.querySelectorAll('[aria-modal="true"]')]
      if (dialogs.at(-1) === dialog && !dialog.contains(event.target as Node)) (controls()[0] ?? dialog).focus()
    }
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('focusin', keepFocus)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('focusin', keepFocus)
      document.body.style.overflow = previousOverflow
      for (const { element, inert } of background) element.inert = inert
      if (previous?.isConnected) previous.focus()
    }
  }, [open])

  return ref
}
