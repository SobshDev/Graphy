import { applyThemeToDocument } from '../services/apply-theme'
import { loadThemeState, saveThemeState } from '../services/storage'
import type { ThemeMode, ThemePresetId, ThemeState } from '../types'

type Listener = () => void

let state: ThemeState = loadThemeState()
const listeners = new Set<Listener>()
let initialized = false
let mediaUnsubscribe: (() => void) | null = null

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

function attachSystemListener() {
  if (typeof window === 'undefined') return
  if (mediaUnsubscribe) return
  const mql = window.matchMedia('(prefers-color-scheme: light)')
  const handler = () => {
    if (state.mode === 'system') {
      state = { ...state }
      applyThemeToDocument(state)
      emit()
    }
  }
  mql.addEventListener('change', handler)
  mediaUnsubscribe = () => mql.removeEventListener('change', handler)
}

if (typeof window !== 'undefined') {
  attachSystemListener()
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
    attachSystemListener()
    if (initialized) return
    initialized = true
    state = loadThemeState()
    applyThemeToDocument(state)
  },
  setPreset(presetId: ThemePresetId): void {
    commit({ ...state, preset: presetId })
  },
  setMode(mode: ThemeMode): void {
    commit({ ...state, mode })
  },
}
