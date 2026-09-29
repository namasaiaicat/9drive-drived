import type { ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E0E3E7]/60 dark:border-[#36373A]/60">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-[22px] font-normal text-[#1F1F1F] dark:text-[#E3E3E3] tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="mt-0.5 text-xs text-[#747775] dark:text-[#8E918F]">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
