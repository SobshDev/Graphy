import { DEFAULT_PRESET_ID } from '../data/presets'
import type { ThemeState } from '../types'

const STORAGE_KEY = 'graphy.theme.v1'

export function loadThemeState(): ThemeState {
  if (typeof window === 'undefined') {
    return { preset: DEFAULT_PRESET_ID }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { preset: DEFAULT_PRESET_ID }
    const parsed = JSON.parse(raw) as Partial<ThemeState>
    return {
      preset:
        typeof parsed.preset === 'string' ? parsed.preset : DEFAULT_PRESET_ID,
    }
  } catch {
    return { preset: DEFAULT_PRESET_ID }
  }
}

export function saveThemeState(state: ThemeState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore quota / private-mode errors
  }
}
