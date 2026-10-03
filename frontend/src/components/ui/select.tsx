import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  icon?: React.ReactNode
  description?: string
  disabled?: boolean
}

export interface SelectProps {
  value?: string
  onChange?: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  variant?: 'default' | 'chip' | 'sm'
  className?: string
  dropdownClassName?: string
  disabled?: boolean
  id?: string
  name?: string
  'aria-label'?: string
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  variant = 'default',
  className,
  dropdownClassName,
  disabled = false,
  id,
  name,
  'aria-label': ariaLabel,
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const listId = React.useId()
  const [activeIndex, setActiveIndex] = React.useState(0)

  function openList(direction = 1) {
    const selected = options.findIndex(option => option.value === value && !option.disabled)
    setActiveIndex(selected >= 0 ? selected : direction > 0 ? options.findIndex(option => !option.disabled) : options.findLastIndex(option => !option.disabled))
    setIsOpen(true)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      if (!isOpen) { openList(event.key === 'ArrowUp' || event.key === 'End' ? -1 : 1); return }
      const enabled = options.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0)
      const position = enabled.indexOf(activeIndex)
      const next = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1) : enabled[(position + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length]
      if (next !== undefined) setActiveIndex(next)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (isOpen && options[activeIndex]) handleSelect(options[activeIndex])
      else openList()
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      setIsOpen(false)
    }
  }

  React.useEffect(() => {
    if (isOpen) document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [isOpen, activeIndex, listId])

  // Find active option
  const selectedOption = React.useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  )

  // Close on outside click
  React.useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return
    onChange?.(option.value)
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  // Variant classes
  const variantStyles = {
    default:
      'h-10 px-3.5 text-sm rounded-xl border border-[#747775]/40 bg-white dark:bg-[#1E1F20] dark:border-[#747775]/50 text-[#1F1F1F] dark:text-[#E3E3E3]',
    sm: 'h-9 px-3 text-xs rounded-lg border border-[#747775]/40 bg-white dark:bg-[#1E1F20] dark:border-[#747775]/50 text-[#1F1F1F] dark:text-[#E3E3E3]',
    chip: cn(
      'min-h-10 px-3.5 text-xs font-medium rounded-full border transition-colors whitespace-nowrap',
      value && value !== 'all' && value !== 'date_desc'
        ? 'border-[#0B57D0]/60 bg-[#C2E7FF]/50 text-[#001D35] dark:border-[#A8C7FA]/60 dark:bg-[#004A77]/40 dark:text-[#C2E7FF]'
        : 'border-[#747775]/30 bg-white dark:bg-[#1E1F20] dark:border-[#747775]/50 text-[#1F1F1F] dark:text-[#E3E3E3] hover:bg-[#F0F4F9] dark:hover:bg-[#28292A]'
    ),
  }

  const activeFocusStyle = isOpen
    ? 'border-[#0B57D0] ring-2 ring-[#0B57D0]/20 dark:border-[#A8C7FA] dark:ring-[#A8C7FA]/20'
    : 'hover:border-[#0B57D0]/60 dark:hover:border-[#A8C7FA]/60'

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-block text-left', isOpen ? 'z-50' : 'z-auto', className)}
    >
      {/* Hidden input for form submission compatibility */}
      {name && <input type="hidden" name={name} value={value ?? ''} />}

      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-label={ariaLabel ?? selectedOption?.label ?? placeholder}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        role="combobox"
        aria-activedescendant={isOpen && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => isOpen ? setIsOpen(false) : openList()}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex w-full items-center justify-between gap-2 text-left transition-colors duration-150 cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B57D0] dark:focus-visible:outline-[#A8C7FA]',
          variantStyles[variant],
          activeFocusStyle,
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.icon}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-[#747775] dark:text-[#8E918F] transition-transform duration-200 ease-[cubic-bezier(0.05,0.7,0.1,1.0)]',
            isOpen && 'rotate-180 text-[#0B57D0] dark:text-[#A8C7FA]'
          )}
        />
      </button>

      {isOpen && (
        <div
          id={listId}
          role="listbox"
          aria-label={ariaLabel ?? selectedOption?.label ?? placeholder}
          tabIndex={-1}
          className={cn(
            'absolute left-0 top-full z-[100] mt-1.5 w-max min-w-full max-w-[calc(100vw-2rem)] max-h-64 overflow-y-auto rounded-2xl border border-[#E0E3E7] bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-sm dark:border-[#36373A] dark:bg-[#1E1F20] dark:shadow-[0_12px_36px_rgba(0,0,0,0.7)] animate-m3-popover origin-top',
            dropdownClassName
          )}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[#747775] dark:text-[#8E918F]">
              No options available
            </div>
          ) : (
            options.map((option, index) => {
              const isSelected = option.value === value
              return (
                <div
                  key={option.value}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  onMouseEnter={() => !option.disabled && setActiveIndex(index)}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    'group flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 py-2 transition-colors duration-150 cursor-pointer select-none',
                    index === activeIndex && 'outline outline-2 -outline-offset-2 outline-[#0B57D0] dark:outline-[#A8C7FA]',
                    variant === 'default' ? 'text-sm' : 'text-xs',
                    isSelected
                      ? 'bg-[#C2E7FF]/40 text-[#001D35] font-medium dark:bg-[#004A77]/40 dark:text-[#C2E7FF]'
                      : 'text-[#1F1F1F] hover:bg-[#F0F4F9] dark:text-[#E3E3E3] dark:hover:bg-[#28292A]',
                    option.disabled &&
                      'opacity-40 cursor-not-allowed pointer-events-none'
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    {option.icon}
                    <div className="truncate">
                      <div>{option.label}</div>
                      {option.description && (
                        <div className="text-[11px] text-[#747775] dark:text-[#8E918F]">
                          {option.description}
                        </div>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 shrink-0 text-[#0B57D0] dark:text-[#A8C7FA]" />
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
