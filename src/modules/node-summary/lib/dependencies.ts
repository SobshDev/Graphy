import type { Graph } from '@/modules/parser'

import type { NodeSummaryDependency } from '../types'

export type FileDependencies = {
  uses: NodeSummaryDependency[]
  usedBy: NodeSummaryDependency[]
}

export function getFileDependencies(
  graph: Graph,
  file: string,
): FileDependencies {
  const fileBySymbolId = new Map<string, string>()
  for (const node of graph.nodes) fileBySymbolId.set(node.id, node.file)

  const usesSet = new Set<string>()
  const usedBySet = new Set<string>()

  for (const edge of graph.edges) {
    const source = fileBySymbolId.get(edge.source)
    const target = fileBySymbolId.get(edge.target)
    if (!source || !target || source === target) continue
    if (source === file) usesSet.add(target)
    if (target === file) usedBySet.add(source)
  }

  return {
    uses: toDependencies(usesSet),
    usedBy: toDependencies(usedBySet),
  }
}

function toDependencies(files: Set<string>): NodeSummaryDependency[] {
  return Array.from(files)
    .sort((a, b) => a.localeCompare(b))
    .map((file) => ({
      file,
      displayName: file.split('/').pop() ?? file,
    }))
}
