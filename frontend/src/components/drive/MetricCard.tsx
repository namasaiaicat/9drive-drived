import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'

export function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: LucideIcon
}) {
  return (
    <Card className="p-4 border border-[#E0E3E7] bg-white rounded-2xl dark:border-[#36373A] dark:bg-[#1E1F20]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#747775] dark:text-[#8E918F]">{label}</p>
          <p className="mt-1 text-2xl font-normal text-[#1F1F1F] dark:text-[#E3E3E3]">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDF2FC] text-[#0B57D0] dark:bg-[#28292A] dark:text-[#A8C7FA]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  )
}
