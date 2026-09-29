import * as React from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-lg border border-[#747775]/40 bg-white px-3.5 text-sm text-[#1F1F1F] placeholder:text-[#747775] outline-none transition focus:border-[#0B57D0] focus:ring-2 focus:ring-[#0B57D0]/20 disabled:opacity-50 dark:bg-[#1E1F20] dark:border-[#747775]/50 dark:text-[#E3E3E3] dark:placeholder:text-[#8E918F] dark:focus:border-[#A8C7FA]',
        className
      )}
      {...props}
    />
  )
}
