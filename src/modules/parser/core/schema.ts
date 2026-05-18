import type { Graph } from './models.ts'

export const SCHEMA_VERSION = '1.2'

export function serializeGraph(graph: Graph, pretty = true): string {
  return JSON.stringify(graph, null, pretty ? 2 : 0)
}

export function validateGraph(graph: Graph): void {
  if (graph.version !== SCHEMA_VERSION) {
    throw new Error(`[!] Schema version mismatch: expected
            ${SCHEMA_VERSION}, got ${graph.version}`)
  }

  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const node of graph.nodes) {
    if (seen.has(node.id)) duplicates.add(node.id)
    seen.add(node.id)
  }

  if (duplicates.size > 0) {
    const list = Array.from(duplicates).join(', ')
    throw new Error(
      `[!] Found ${duplicates.size} duplicate node id(s): ${list}`,
    )
  }

  for (const edge of graph.edges) {
    if (!seen.has(edge.source)) {
      throw new Error(`[!] Edge source not found in nodes: ${edge.source}`)
    }
    if (!seen.has(edge.target)) {
      throw new Error(`[!] Edge target not found in nodes: ${edge.target}`)
    }
  }
}
