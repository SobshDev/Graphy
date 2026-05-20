import { DEFAULT_PRESET_ID, themePresetById } from '../data/presets'
import type { ThemeMode, ThemeState } from '../types'

const STORAGE_KEY = 'graphy.theme.v2'
const DEFAULT_MODE: ThemeMode = 'system'

const VALID_MODES: ReadonlySet<ThemeMode> = new Set<ThemeMode>([
  'system',
  'light',
  'dark',
])

function defaultState(): ThemeState {
  return { preset: DEFAULT_PRESET_ID, mode: DEFAULT_MODE }
}

export function loadThemeState(): ThemeState {
  if (typeof window === 'undefined') return defaultState()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as Partial<ThemeState>
    const preset =
      typeof parsed.preset === 'string' && themePresetById.has(parsed.preset)
        ? parsed.preset
        : DEFAULT_PRESET_ID
    const mode =
      typeof parsed.mode === 'string' && VALID_MODES.has(parsed.mode)
        ? parsed.mode
        : DEFAULT_MODE
    return { preset, mode }
  } catch {
    return defaultState()
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
