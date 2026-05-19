import type { ClassInspector, Graph, GraphNode } from '@/modules/parser'

import type { AiTool } from '../tools.interface'

interface GetNeighborsInput {
  id?: string
  depth?: 1 | 2
}

interface SlimNode {
  id: string
  name: string
  type: GraphNode['type']
  file: string
  line: number
}

function slim(node: GraphNode): SlimNode {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    file: node.file,
    line: node.line,
  }
}

function dedup(nodes: GraphNode[]): GraphNode[] {
  const seen = new Set<string>()
  return nodes.filter((n) => {
    if (seen.has(n.id)) return false
    seen.add(n.id)
    return true
  })
}

export function createGetNeighborsTool(
  graph: Graph,
  inspector: ClassInspector,
): AiTool {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  return {
    name: 'get_neighbors',
    description:
      'Return the callers and callees of a node, optionally up to depth 2 (callers-of-callers and callees-of-callees). Use this to understand the immediate call-graph neighborhood around a function or class.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Node id to look up neighbors for.',
        },
        depth: {
          type: 'number',
          enum: [1, 2],
          description: 'How many hops to traverse. Defaults to 1.',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
    handler: (input: unknown) => {
      const { id, depth = 1 } = input as GetNeighborsInput
      if (!id) throw new Error('`id` is required.')
      if (!byId.has(id)) return { found: false, id }

      const callers1 = inspector.callersOf(id)
      const callees1 = inspector.calleesOf(id)

      if (depth === 1) {
        return {
          found: true,
          id,
          depth: 1,
          neighbors: {
            callers: dedup(callers1).map(slim),
            callees: dedup(callees1).map(slim),
          },
        }
      }

      const callers2: GraphNode[] = []
      for (const c of callers1) callers2.push(...inspector.callersOf(c.id))
      const callees2: GraphNode[] = []
      for (const c of callees1) callees2.push(...inspector.calleesOf(c.id))

      return {
        found: true,
        id,
        depth: 2,
        neighbors: {
          callers: dedup([...callers1, ...callers2]).map(slim),
          callees: dedup([...callees1, ...callees2]).map(slim),
        },
      }
    },
  }
}
