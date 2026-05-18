const PALETTE = [
  'bg-rose-500/80',
  'bg-orange-500/80',
  'bg-amber-500/80',
  'bg-lime-500/80',
  'bg-emerald-500/80',
  'bg-teal-500/80',
  'bg-sky-500/80',
  'bg-indigo-500/80',
  'bg-violet-500/80',
  'bg-fuchsia-500/80',
]

export function avatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  const idx = Math.abs(hash) % PALETTE.length
  return PALETTE[idx]
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
