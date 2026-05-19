import { useSyncExternalStore } from 'react'

export type ActivePanel = 'files' | 'search' | 'git' | null

let active: ActivePanel = 'files'
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

export function useActivePanel() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function toggleActivePanel(id: Exclude<ActivePanel, null>) {
  active = active === id ? null : id
  for (const listener of listeners) listener()
}
