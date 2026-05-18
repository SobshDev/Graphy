import { themePresetById } from '../data/presets'
import { themeTokens } from '../data/tokens'
import type { ThemeState } from '../types'

export function resolveTokenValue(
  tokenId: string,
  state: ThemeState,
): string | undefined {
  if (state.overrides[tokenId] !== undefined) return state.overrides[tokenId]
  const preset = themePresetById.get(state.preset)
  if (preset && preset.values[tokenId] !== undefined) {
    return preset.values[tokenId]
  }
  const token = themeTokens.find((t) => t.id === tokenId)
  return token?.defaultValue
}

export function applyThemeToDocument(state: ThemeState): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const token of themeTokens) {
    const value = resolveTokenValue(token.id, state)
    if (value !== undefined) {
      root.style.setProperty(token.cssVar, value)
    }
  }
}
