import { useSyncExternalStore } from 'react'

export type GraphFocusRequest = {
  file: string
  timestamp: number
} | null

let request: GraphFocusRequest = null
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return request
}

export function useGraphFocusRequest() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function requestGraphFocus(file: string) {
  request = { file, timestamp: Date.now() }
  for (const listener of listeners) listener()
}

export function clearGraphFocus() {
  request = null
  for (const listener of listeners) listener()
}
