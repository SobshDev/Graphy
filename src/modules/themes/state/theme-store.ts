import { applyThemeToDocument } from '../services/apply-theme'
import { loadThemeState, saveThemeState } from '../services/storage'
import type { ThemePresetId, ThemeState } from '../types'

type Listener = () => void

let state: ThemeState = loadThemeState()
const listeners = new Set<Listener>()
let initialized = false

if (typeof document !== 'undefined') {
  applyThemeToDocument(state)
  initialized = true
}

function emit() {
  for (const listener of listeners) listener()
}

function commit(next: ThemeState) {
  state = next
  applyThemeToDocument(state)
  saveThemeState(state)
  emit()
}

export const themeStore = {
  getState(): ThemeState {
    return state
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  init(): void {
    if (initialized) return
    initialized = true
    state = loadThemeState()
    applyThemeToDocument(state)
  },
  setPreset(presetId: ThemePresetId): void {
    commit({ preset: presetId })
  },
}
