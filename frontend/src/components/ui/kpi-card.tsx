import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface KpiCardProps {
  label: string
  value: ReactNode
  footer?: ReactNode
  hero?: boolean
}

export function KpiCard({ label, value, footer, hero = false }: KpiCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[10px] border px-[18px] py-4',
        hero
          ? 'border-transparent bg-brand text-brand-ink'
          : 'border-border bg-surface',
      )}
    >
      <span
        className={cn(
          'text-xs font-medium uppercase tracking-[0.06em]',
          hero ? 'text-brand-ink/70' : 'text-text-muted',
        )}
      >
        {label}
      </span>

      <div className="mt-1.5 text-[30px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
        {value}
      </div>

      {footer && (
        <div
          className={cn(
            'mt-1 flex items-center gap-1.5 text-xs',
            hero ? 'text-brand-ink/70' : 'text-text-muted',
          )}
        >
          {footer}
        </div>
      )}
    </div>
  )
}
