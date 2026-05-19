import type { Graph, GraphNode } from '@/modules/parser'

import type { AiTool } from '../tools.interface'

interface GraphStatsInput {
  topN?: number
}

interface SlimNode {
  id: string
  name: string
  type: GraphNode['type']
  file: string
  line: number
  inDegree: number
  outDegree: number
}

function slim(node: GraphNode): SlimNode {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    file: node.file,
    line: node.line,
    inDegree: node.inDegree,
    outDegree: node.outDegree,
  }
}

const DEFAULT_TOP_N = 10

export function createGraphStatsTool(graph: Graph): AiTool {
  return {
    name: 'graph_stats',
    description:
      'Return aggregate statistics about the parsed graph: node/edge counts, breakdown by type, top nodes by in/out degree, and most-populated files. Use this to get a high-level overview of the codebase.',
    inputSchema: {
      type: 'object',
      properties: {
        topN: {
          type: 'integer',
          minimum: 1,
          maximum: 50,
          description: `How many top nodes to return in each ranking. Defaults to ${DEFAULT_TOP_N}.`,
        },
      },
      additionalProperties: false,
    },
    handler: (input: unknown) => {
      const { topN = DEFAULT_TOP_N } = input as GraphStatsInput
      const n = Math.min(Math.max(topN, 1), 50)

      const countsByType: Partial<Record<GraphNode['type'], number>> = {}
      const fileCounts = new Map<string, number>()
      for (const node of graph.nodes) {
        countsByType[node.type] = (countsByType[node.type] ?? 0) + 1
        fileCounts.set(node.file, (fileCounts.get(node.file) ?? 0) + 1)
      }

      const sorted = [...graph.nodes].sort((a, b) => b.inDegree - a.inDegree)
      const topByInDegree = sorted.slice(0, n).map(slim)
      const topByOutDegree = [...graph.nodes]
        .sort((a, b) => b.outDegree - a.outDegree)
        .slice(0, n)
        .map(slim)

      const filesByNodeCount = [...fileCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([file, count]) => ({ file, count }))

      return {
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        countsByType,
        topByInDegree,
        topByOutDegree,
        filesByNodeCount,
      }
    },
  }
}
