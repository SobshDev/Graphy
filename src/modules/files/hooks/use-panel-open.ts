import { useSyncExternalStore } from 'react'

let open = true
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return open
}

export function usePanelOpen() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function togglePanel() {
  open = !open
  for (const listener of listeners) listener()
}

export function setPanelOpen(next: boolean) {
  if (open === next) return
  open = next
  for (const listener of listeners) listener()
}
