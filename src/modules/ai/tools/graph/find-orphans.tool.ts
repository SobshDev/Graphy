import type { Graph, GraphNode } from '@/modules/parser'

import type { AiTool } from '../tools.interface'

interface FindOrphansInput {
  kind?: 'source' | 'sink'
  limit?: number
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

const DEFAULT_LIMIT = 50

export function createFindOrphansTool(graph: Graph): AiTool {
  return {
    name: 'find_orphans',
    description:
      'Find orphan nodes: sources (inDegree === 0, potentially unused) or sinks (outDegree === 0, leaf nodes with no outgoing calls). Use this to find dead code candidates or entry points.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['source', 'sink'],
          description:
            'source = inDegree 0 (unused), sink = outDegree 0 (leaf). Defaults to "source".',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 200,
          description: `Maximum nodes to return. Defaults to ${DEFAULT_LIMIT}.`,
        },
      },
      additionalProperties: false,
    },
    handler: (input: unknown) => {
      const { kind = 'source', limit = DEFAULT_LIMIT } =
        input as FindOrphansInput
      const cap = Math.min(Math.max(limit, 1), 200)

      const matches: GraphNode[] = []
      for (const node of graph.nodes) {
        const match =
          kind === 'source' ? node.inDegree === 0 : node.outDegree === 0
        if (match) matches.push(node)
        if (matches.length >= cap + 1) break
      }

      const truncated = matches.length > cap
      return {
        kind,
        total: truncated ? cap : matches.length,
        truncated,
        nodes: matches.slice(0, cap).map(slim),
      }
    },
  }
}
