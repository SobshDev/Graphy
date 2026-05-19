import type { FileNode, GitStatusResult } from '@/shared/lib/desktop'

import type { GitFileStatus } from '../types'

const PRIORITY: Record<GitFileStatus, number> = {
  added: 1,
  modified: 2,
  deleted: 3,
}

function merge(
  map: Map<string, GitFileStatus>,
  path: string,
  status: GitFileStatus,
) {
  const existing = map.get(path)
  if (!existing || PRIORITY[status] > PRIORITY[existing]) {
    map.set(path, status)
  }
}

export function buildFileStatusMap(
  status: GitStatusResult,
): Map<string, GitFileStatus> {
  const map = new Map<string, GitFileStatus>()
  for (const p of status.untracked) merge(map, p, 'added')
  for (const p of status.modified) merge(map, p, 'modified')
  for (const p of status.deleted) merge(map, p, 'deleted')
  for (const r of status.renamed) merge(map, r.to, 'added')
  for (const p of status.staged) {
    if (!map.has(p)) merge(map, p, 'modified')
  }
  return map
}

export function propagateToFolders(
  tree: FileNode,
  fileMap: Map<string, GitFileStatus>,
): Map<string, GitFileStatus> {
  const combined = new Map(fileMap)

  function visit(node: FileNode): GitFileStatus | null {
    if (node.kind === 'file') return combined.get(node.path) ?? null
    let worst: GitFileStatus | null = null
    for (const child of node.children ?? []) {
      const childStatus = visit(child)
      if (!childStatus) continue
      if (!worst || PRIORITY[childStatus] > PRIORITY[worst]) {
        worst = childStatus
      }
    }
    if (worst && node.path !== '') combined.set(node.path, worst)
    return worst
  }

  visit(tree)
  return combined
}
