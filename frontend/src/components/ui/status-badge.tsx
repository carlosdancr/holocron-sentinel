import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: 'active' | 'suspended'
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-transparent px-2.25 py-0.5 pl-1.75 text-[11.5px] font-medium tracking-[0.005em]',
        status === 'active' && 'bg-success-bg text-success',
        status === 'suspended' && 'bg-critical-bg text-critical',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          status === 'active' && 'bg-success',
          status === 'suspended' && 'bg-critical',
        )}
      />
      {status === 'active' ? 'Ativa' : 'Suspensa'}
    </span>
  )
}
