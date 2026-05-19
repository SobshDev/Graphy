import type { Graph, GraphNode } from '@/modules/parser'

import type { AiTool } from '../tools.interface'

interface ImportsOfInput {
  id?: string
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

export function createImportsOfTool(graph: Graph): AiTool {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const importEdges = graph.edges.filter((e) => e.type === 'imports')

  return {
    name: 'imports_of',
    description:
      'Return every node that the given node imports (outgoing "imports" edges). Use this to answer "what does X import?" or "what modules does X depend on?".',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description:
            'Source node id formatted as "<relative-file>::<qualified-name>".',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
    handler: (input: unknown) => {
      const { id } = input as ImportsOfInput
      if (!id) {
        throw new Error('`id` is required.')
      }
      const targets = importEdges
        .filter((e) => e.source === id)
        .map((e) => byId.get(e.target))
        .filter((n): n is GraphNode => n !== undefined)
        .map(slim)
      return { id, imports: targets }
    },
  }
}
