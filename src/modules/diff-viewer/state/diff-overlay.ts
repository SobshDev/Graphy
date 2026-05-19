import type { DiffOverlayState } from '../types'

let state: DiffOverlayState = {
  active: false,
  changed: true,
  callers: true,
  callees: true,
  dimOthers: true,
}

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

export function subscribeDiffOverlay(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getDiffOverlay(): DiffOverlayState {
  return state
}

export function setDiffOverlayActive(active: boolean) {
  if (state.active === active) return
  state = { ...state, active }
  emit()
}

export function setDiffOverlayLayer(
  key: 'changed' | 'callers' | 'callees' | 'dimOthers',
  value: boolean,
) {
  if (state[key] === value) return
  state = { ...state, [key]: value }
  emit()
}

export function toggleDiffOverlayLayer(
  key: 'changed' | 'callers' | 'callees' | 'dimOthers',
) {
  setDiffOverlayLayer(key, !state[key])
}
