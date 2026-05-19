const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR = 365 * DAY

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Math.max(0, (Date.now() - then) / 1000)

  if (diff < MINUTE) return 'just now'
  if (diff < HOUR) {
    const m = Math.floor(diff / MINUTE)
    return `${m}m ago`
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR)
    return `${h}h ago`
  }
  if (diff < WEEK) {
    const d = Math.floor(diff / DAY)
    return `${d}d ago`
  }
  if (diff < MONTH) {
    const w = Math.floor(diff / WEEK)
    return `${w}w ago`
  }
  if (diff < YEAR) {
    const mo = Math.floor(diff / MONTH)
    return `${mo}mo ago`
  }
  const y = Math.floor(diff / YEAR)
  return `${y}y ago`
}

export function formatFullDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function dateGroup(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Unknown'

  const now = new Date()
  const today = startOfDay(now)
  const commitDay = startOfDay(d)

  if (commitDay === today) return 'Today'
  if (commitDay === today - DAY * 1000) return 'Yesterday'

  const diffMs = today - commitDay
  if (diffMs < 7 * DAY * 1000) return 'This week'
  if (diffMs < 30 * DAY * 1000) return 'This month'

  return d.toLocaleString(undefined, { month: 'long', year: 'numeric' })
}
