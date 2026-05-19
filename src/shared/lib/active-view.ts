import { useSyncExternalStore } from 'react'

export type ActiveView = 'editor' | 'graph' | 'diff'

let active: ActiveView = 'graph'
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return active
}

export function useActiveView() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function setActiveView(next: ActiveView) {
  if (active === next) return
  active = next
  for (const listener of listeners) listener()
}
