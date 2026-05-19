import { useEffect } from 'react'

import { useGraph, useProject } from '@/modules/graph'

import { useDiffChanges } from './use-diff-changes'
import { useDiffOverlay } from './use-diff-overlay'
import { diffToNodeStatus } from '../lib/diff-to-node-status'
import { setNodeStatusMap } from '../state/node-status'

export function useRecomputeNodeStatus(): void {
  const overlay = useDiffOverlay()
  const { graph } = useGraph()
  const { folder } = useProject()
  const changesState = useDiffChanges(folder)

  useEffect(() => {
    if (!overlay.active || changesState.status !== 'ready') {
      setNodeStatusMap(new Map())
      return
    }

    const { files } = changesState.data
    const map = diffToNodeStatus(graph, files, {
      changed: overlay.changed,
      callers: overlay.callers,
      callees: overlay.callees,
    })
    setNodeStatusMap(map)
  }, [
    overlay.active,
    overlay.changed,
    overlay.callers,
    overlay.callees,
    graph,
    changesState,
  ])
}
