import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 ease-[cubic-bezier(0.05,0.7,0.1,1.0)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B57D0] disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none',
  {
    variants: {
      variant: {
        default: 'bg-[#0B57D0] text-white hover:bg-[#0842A0] active:bg-[#063175] shadow-sm hover:shadow-md active:shadow-none',
        tonal: 'bg-[#C2E7FF] text-[#001D35] hover:bg-[#B3DCF5] active:bg-[#97D1FA] hover:shadow-sm',
        outline: 'border border-[#747775]/40 bg-white text-[#0B57D0] hover:bg-[#F0F4F9] hover:border-[#0B57D0]/60 dark:bg-[#1E1F20] dark:border-[#747775]/50 dark:text-[#A8C7FA] dark:hover:bg-[#28292A]',
        ghost: 'text-[#444746] hover:bg-black/5 dark:text-[#C4C7C5] dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15',
        soft: 'bg-[#F0F4F9] text-[#1F1F1F] hover:bg-[#E9EEF6] dark:bg-[#28292A] dark:text-[#E3E3E3] dark:hover:bg-[#333537] active:bg-[#DFE4EC]',
        danger: 'text-[#B3261E] hover:bg-[#F9DEDC]/50 dark:text-[#F2B8B5] dark:hover:bg-[#8C1D18]/30 active:bg-[#F9DEDC]',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-8 px-4 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10 p-2.5',
        'icon-sm': 'h-8 w-8 p-1.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
}
