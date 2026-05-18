const FALLBACK_HEX = '#000000'

let probe: HTMLDivElement | null = null

function getProbe(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null
  if (probe && probe.isConnected) return probe
  const el = document.createElement('div')
  el.style.position = 'absolute'
  el.style.pointerEvents = 'none'
  el.style.opacity = '0'
  el.style.width = '0'
  el.style.height = '0'
  document.body.appendChild(el)
  probe = el
  return el
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function cssColorToHex(value: string): string {
  if (!value) return FALLBACK_HEX
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const [, r, g, b] = value
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }

  const el = getProbe()
  if (!el) return FALLBACK_HEX
  el.style.color = ''
  el.style.color = value
  if (!el.style.color) return FALLBACK_HEX
  const computed = getComputedStyle(el).color
  const match = computed.match(/rgba?\(([^)]+)\)/i)
  if (!match) return FALLBACK_HEX
  const parts = match[1].split(/\s*[,/]\s*|\s+/).filter(Boolean)
  const r = Number.parseFloat(parts[0])
  const g = Number.parseFloat(parts[1])
  const b = Number.parseFloat(parts[2])
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
    return FALLBACK_HEX
  }
  return rgbToHex(r, g, b)
}
