export interface DepthColor {
  accent: string
  surface: string
}

export function colorForDepth(depth: number): DepthColor {
  const hue = (depth * 55 + 30) % 360
  return {
    accent: `hsl(${hue} 70% 58%)`,
    surface: `hsl(${hue} 70% 55% / 0.10)`,
  }
}
