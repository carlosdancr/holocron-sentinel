import { cn } from '@/lib/utils'

interface TypeBadgeProps {
  type: 'info' | 'warning' | 'critical'
}

const TYPE_STYLES = {
  info: 'bg-info-bg text-info',
  warning: 'bg-warning-bg text-warning',
  critical: 'bg-critical-bg text-critical',
} as const

const DOT_STYLES = {
  info: 'bg-info',
  warning: 'bg-warning',
  critical: 'bg-critical',
} as const

export function TypeBadge({ type }: TypeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-transparent px-[9px] py-[2px] pl-[7px] text-[11.5px] font-medium tracking-[0.005em]',
        TYPE_STYLES[type],
      )}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOT_STYLES[type])} />
      {type}
    </span>
  )
}
