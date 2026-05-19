import type { Graph, GraphNode } from '@/modules/parser'

import type { AiTool } from '../tools.interface'

interface FindPathInput {
  from?: string
  to?: string
  maxLength?: number
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

const DEFAULT_MAX_LENGTH = 6

export function createFindPathTool(graph: Graph): AiTool {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const callees = new Map<string, string[]>()
  for (const edge of graph.edges) {
    if (edge.type !== 'calls') continue
    const bucket = callees.get(edge.source)
    if (bucket) bucket.push(edge.target)
    else callees.set(edge.source, [edge.target])
  }

  return {
    name: 'find_path',
    description:
      'Find a shortest call path between two nodes using BFS on "calls" edges. Use this to answer "how does A reach B?" or "is there a dependency chain from X to Y?".',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Source node id.' },
        to: { type: 'string', description: 'Target node id.' },
        maxLength: {
          type: 'integer',
          minimum: 1,
          maximum: 20,
          description: `Maximum path length. Defaults to ${DEFAULT_MAX_LENGTH}.`,
        },
      },
      required: ['from', 'to'],
      additionalProperties: false,
    },
    handler: (input: unknown) => {
      const {
        from,
        to,
        maxLength = DEFAULT_MAX_LENGTH,
      } = input as FindPathInput
      if (!from) throw new Error('`from` is required.')
      if (!to) throw new Error('`to` is required.')

      if (!byId.has(from) || !byId.has(to)) return { found: false, from, to }
      if (from === to) {
        const node = byId.get(from)!
        return { found: true, from, to, path: [slim(node)], length: 0 }
      }

      const queue: { id: string; path: string[] }[] = [
        { id: from, path: [from] },
      ]
      const visited = new Set<string>([from])

      while (queue.length > 0) {
        const current = queue.shift()!
        if (current.path.length > maxLength) continue
        for (const nextId of callees.get(current.id) ?? []) {
          if (visited.has(nextId)) continue
          const newPath = [...current.path, nextId]
          if (nextId === to) {
            const path = newPath.map((id) => slim(byId.get(id)!))
            return { found: true, from, to, path, length: newPath.length - 1 }
          }
          visited.add(nextId)
          queue.push({ id: nextId, path: newPath })
        }
      }

      return { found: false, from, to }
    },
  }
}
