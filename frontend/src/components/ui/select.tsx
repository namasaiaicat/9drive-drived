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
  }

  // Variant classes
  const variantStyles = {
    default:
      'h-10 px-3.5 text-sm rounded-xl border border-[#747775]/40 bg-white dark:bg-[#1E1F20] dark:border-[#747775]/50 text-[#1F1F1F] dark:text-[#E3E3E3]',
    sm: 'h-9 px-3 text-xs rounded-lg border border-[#747775]/40 bg-white dark:bg-[#1E1F20] dark:border-[#747775]/50 text-[#1F1F1F] dark:text-[#E3E3E3]',
    chip: cn(
      'h-8 px-3.5 text-xs font-medium rounded-full border transition-colors whitespace-nowrap',
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
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={cn(
          'flex w-full items-center justify-between gap-2 text-left transition-all duration-200 ease-[cubic-bezier(0.05,0.7,0.1,1.0)] active:scale-[0.98] cursor-pointer select-none outline-none',
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
          role="listbox"
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
            options.map((option) => {
              const isSelected = option.value === value
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    'group flex items-center justify-between gap-2 rounded-lg px-3 py-2 transition-all duration-150 active:scale-[0.99] cursor-pointer select-none',
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
