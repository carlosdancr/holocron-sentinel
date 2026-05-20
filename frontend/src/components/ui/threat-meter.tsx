import { CRITICAL_EVENTS_LIMIT } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface ThreatMeterProps {
  count: number
  limit?: number
}

export function ThreatMeter({ count, limit = CRITICAL_EVENTS_LIMIT }: ThreatMeterProps) {
  const pct = Math.min(100, (count / limit) * 100)

  let colorClass = 'bg-success'
  if (count >= limit) colorClass = 'bg-critical'
  else if (count >= limit * 0.5) colorClass = 'bg-warning'

  return (
    <span className="inline-flex items-center gap-2">
      {/* Barra */}
      <span className="h-[5px] w-20 overflow-hidden rounded-full border border-border bg-surface-2">
        <span
          className={cn('block h-full transition-[width] duration-200', colorClass)}
          style={{ width: `${pct}%` }}
        />
      </span>

      {/* Valor */}
      <span className="font-mono text-[12.5px] tabular-nums">
        {count}
        <span className="opacity-40">/{limit}</span>
      </span>
    </span>
  )
}
