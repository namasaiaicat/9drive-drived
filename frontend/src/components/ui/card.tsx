import * as React from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[#E0E3E7] bg-white p-4 shadow-none dark:border-[#36373A] dark:bg-[#1E1F20]',
        className
      )}
      {...props}
    />
  )
}
