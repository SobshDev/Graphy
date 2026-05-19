import { themePresetById } from '../data/presets'
import { themeTokens } from '../data/tokens'
import type { ThemeState } from '../types'

export function applyThemeToDocument(state: ThemeState): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const preset = themePresetById.get(state.preset)
  for (const token of themeTokens) {
    const value = preset?.values[token.id] ?? token.defaultValue
    root.style.setProperty(token.cssVar, value)
  }
}
