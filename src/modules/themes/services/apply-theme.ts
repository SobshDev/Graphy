import { themePresetById } from '../data/presets'
import { themeTokens } from '../data/tokens'
import type { ResolvedMode, ThemeMode, ThemeState } from '../types'

export function getSystemMode(): ResolvedMode {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

export function resolveMode(mode: ThemeMode): ResolvedMode {
  return mode === 'system' ? getSystemMode() : mode
}

export function applyThemeToDocument(state: ThemeState): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const resolved = resolveMode(state.mode)
  const preset = themePresetById.get(state.preset)
  const overrides = preset?.[resolved] ?? {}
  for (const token of themeTokens) {
    const value = overrides[token.id] ?? token[resolved]
    root.style.setProperty(token.cssVar, value)
  }
  root.style.colorScheme = resolved
  root.dataset.themeMode = resolved
}
