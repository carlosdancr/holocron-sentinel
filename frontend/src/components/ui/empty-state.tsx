import type { ReactNode } from 'react'
import { Info } from 'lucide-react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="py-14 px-6 text-center text-text-muted">
      <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-[14px] border border-border bg-surface-2 text-text-faint">
        {icon || <Info size={24} strokeWidth={1.6} />}
      </div>

      <p className="mb-1 text-[15px] font-semibold text-text">{title}</p>
      <p className="mx-auto max-w-[360px] text-[13px]">{description}</p>

      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
