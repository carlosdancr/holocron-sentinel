interface EntityAvatarProps {
  name: string
  size?: number
}

export function EntityAvatar({ name, size = 28 }: EntityAvatarProps) {
  const parts = (name || '?').trim().split(/\s+/)
  const initials = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase()

  return (
    <div
      className="grid shrink-0 place-items-center border border-border bg-surface-2 font-mono font-semibold uppercase text-text-muted"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.25),
        fontSize: Math.round(size * 0.4),
        letterSpacing: '-0.02em',
      }}
    >
      {initials.slice(0, 2)}
    </div>
  )
}
