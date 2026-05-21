import { cn } from '@/lib/utils'

interface LogoProps {
  size?: number
}

export function Logo({ size = 28 }: LogoProps) {
  const iconSize = Math.round(size * 0.57)

  return (
    <div
      className={cn('relative grid shrink-0 place-items-center rounded-[8px] bg-brand')}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.25),
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.25), inset 0 0 0 1px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shield / sentinel shape */}
        <path
          d="M12 2L4 6v5c0 5.25 3.4 10.15 8 11.4 4.6-1.25 8-6.15 8-11.4V6l-8-4z"
          fill="var(--color-brand-ink)"
          fillOpacity={0.85}
        />
        {/* Inner diamond / holocron core */}
        <path d="M12 7l3.5 5L12 17l-3.5-5L12 7z" fill="var(--color-brand)" />
        {/* Center dot */}
        <circle cx="12" cy="12" r="1.5" fill="var(--color-brand-ink)" />
      </svg>
    </div>
  )
}
