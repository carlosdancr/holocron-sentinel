import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  breadcrumb?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, breadcrumb, actions }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface px-9 pb-[18px] pt-[22px]">
      {breadcrumb && (
        <div className="mb-1.5 font-mono text-xs text-text-muted">{breadcrumb}</div>
      )}

      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
          {subtitle && (
            <p className="mt-[3px] text-[13.5px] text-text-muted">{subtitle}</p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2.5">{actions}</div>}
      </div>
    </header>
  )
}
