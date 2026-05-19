import type { Graph, GraphEdge } from '@/modules/parser'

import type { ChangedFile, NodeDiffStatus } from '../types'

type OverlayFlags = {
  changed: boolean
  callers: boolean
  callees: boolean
}

export function diffToNodeStatus(
  graph: Graph | null,
  changedFiles: ChangedFile[],
  overlay: OverlayFlags,
): Map<string, NodeDiffStatus> {
  if (!graph || changedFiles.length === 0) return new Map()

  const fileRanges = buildFileRanges(changedFiles)
  const fileStatuses = buildFileStatuses(changedFiles)

  const changedNodeIds = new Set<string>()
  const result = new Map<string, NodeDiffStatus>()

  for (const node of graph.nodes) {
    if (node.type === 'file') continue

    const ranges = fileRanges.get(node.file)
    if (!ranges) continue

    const overlaps = ranges.some(
      ([start, end]) => node.line <= end && node.endLine >= start,
    )
    if (!overlaps) continue

    changedNodeIds.add(node.id)
    const fileStatus = fileStatuses.get(node.file)
    result.set(node.id, {
      status:
        fileStatus === 'added' || fileStatus === 'untracked'
          ? 'added'
          : 'modified',
      impact: null,
    })
  }

  if (changedNodeIds.size === 0) return result

  const { incoming, outgoing } = buildEdgeMaps(graph.edges)

  if (overlay.callers) {
    const visited = new Set<string>(changedNodeIds)
    let frontier = [...changedNodeIds]

    for (let depth = 0; depth < 3; depth++) {
      const next: string[] = []
      for (const nodeId of frontier) {
        for (const edge of incoming.get(nodeId) ?? []) {
          if (visited.has(edge.source)) continue
          visited.add(edge.source)
          next.push(edge.source)
          if (!result.has(edge.source)) {
            result.set(edge.source, { status: 'unchanged', impact: 'caller' })
          }
        }
      }
      frontier = next
      if (frontier.length === 0) break
    }
  }

  if (overlay.callees) {
    const visited = new Set<string>(changedNodeIds)
    let frontier = [...changedNodeIds]

    for (let depth = 0; depth < 3; depth++) {
      const next: string[] = []
      for (const nodeId of frontier) {
        for (const edge of outgoing.get(nodeId) ?? []) {
          if (visited.has(edge.target)) continue
          visited.add(edge.target)
          next.push(edge.target)
          if (!result.has(edge.target)) {
            result.set(edge.target, { status: 'unchanged', impact: 'callee' })
          }
        }
      }
      frontier = next
      if (frontier.length === 0) break
    }
  }

  return result
}

function buildFileRanges(
  changedFiles: ChangedFile[],
): Map<string, Array<[number, number]>> {
  const map = new Map<string, Array<[number, number]>>()

  for (const file of changedFiles) {
    const ranges: Array<[number, number]> = []

    if (file.status === 'added' || file.status === 'untracked') {
      ranges.push([1, Infinity])
    } else {
      for (const hunk of file.hunks) {
        const start = hunk.newStart
        const end = hunk.newStart + Math.max(hunk.newLines - 1, 0)
        ranges.push([start, end])
      }
    }

    map.set(file.path, ranges)
  }

  return map
}

function buildFileStatuses(
  changedFiles: ChangedFile[],
): Map<string, ChangedFile['status']> {
  const map = new Map<string, ChangedFile['status']>()
  for (const file of changedFiles) {
    map.set(file.path, file.status)
  }
  return map
}

function buildEdgeMaps(edges: GraphEdge[]): {
  incoming: Map<string, GraphEdge[]>
  outgoing: Map<string, GraphEdge[]>
} {
  const incoming = new Map<string, GraphEdge[]>()
  const outgoing = new Map<string, GraphEdge[]>()

  for (const edge of edges) {
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, [])
    outgoing.get(edge.source)!.push(edge)

    if (!incoming.has(edge.target)) incoming.set(edge.target, [])
    incoming.get(edge.target)!.push(edge)
  }

  return { incoming, outgoing }
}
