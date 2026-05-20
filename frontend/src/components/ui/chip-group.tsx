'use client'

import { cn } from '@/lib/utils'

interface ChipOption {
  value: string
  label: string
  count?: number
  disabled?: boolean
}

interface ChipGroupProps {
  options: ChipOption[]
  value: string
  onChange: (value: string) => void
}

export function ChipGroup({ options, value, onChange }: ChipGroupProps) {
  return (
    <div className="flex gap-1 rounded-[6px] border border-border bg-surface-2 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={option.disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-[4px] px-2.5 text-[12.5px] font-medium text-text-muted transition-[background,color,box-shadow] duration-[120ms]',
            value === option.value && 'bg-surface text-text shadow-sm',
            value !== option.value && !option.disabled && 'hover:text-text',
            option.disabled && 'opacity-40 cursor-not-allowed',
          )}
        >
          {option.label}
          {option.count !== undefined && (
            <span
              className={cn(
                'pl-0.5 font-mono text-[11px]',
                value === option.value ? 'text-text-muted' : 'text-text-faint',
              )}
            >
              {option.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
