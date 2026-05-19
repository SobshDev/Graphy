import { useSyncExternalStore } from 'react'

let open = false
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

function emit() {
  for (const listener of listeners) listener()
}

export function useSettingsOpen() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function openSettings() {
  if (open) return
  open = true
  emit()
}

export function closeSettings() {
  if (!open) return
  open = false
  emit()
}

export function toggleSettings() {
  open = !open
  emit()
}
