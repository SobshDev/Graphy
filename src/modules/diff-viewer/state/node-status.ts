import { useSyncExternalStore } from 'react'

import type { NodeDiffStatus } from '../types'

let statusMap: Map<string, NodeDiffStatus> = new Map()

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

export function subscribeNodeStatusMap(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getNodeStatusMap(): Map<string, NodeDiffStatus> {
  return statusMap
}

export function setNodeStatusMap(map: Map<string, NodeDiffStatus>): void {
  statusMap = map
  emit()
}

export function useNodeStatusMap(): Map<string, NodeDiffStatus> {
  return useSyncExternalStore(
    subscribeNodeStatusMap,
    getNodeStatusMap,
    getNodeStatusMap,
  )
}

export function useNodeDiffStatus(id: string): NodeDiffStatus | undefined {
  const map = useNodeStatusMap()
  return map.get(id)
}
