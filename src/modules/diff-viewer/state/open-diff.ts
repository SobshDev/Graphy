import { useSyncExternalStore } from 'react'

import { setActiveView } from '@/shared/lib/active-view'

let currentPath: string | null = null
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return currentPath
}

export function useOpenDiff() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function getOpenDiff() {
  return currentPath
}

export function openDiff(path: string) {
  currentPath = path
  setActiveView('diff')
  for (const listener of listeners) listener()
}

export function closeDiff() {
  if (currentPath === null) return
  currentPath = null
  for (const listener of listeners) listener()
}
