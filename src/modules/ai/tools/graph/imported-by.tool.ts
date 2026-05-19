import type { Graph, GraphNode } from '@/modules/parser'

import type { AiTool } from '../tools.interface'

interface ImportedByInput {
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

export function createImportedByTool(graph: Graph): AiTool {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const importEdges = graph.edges.filter((e) => e.type === 'imports')

  return {
    name: 'imported_by',
    description:
      'Return every node that imports the given node (incoming "imports" edges). Use this to answer "who imports X?" or "what depends on X?".',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description:
            'Target node id formatted as "<relative-file>::<qualified-name>".',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
    handler: (input: unknown) => {
      const { id } = input as ImportedByInput
      if (!id) {
        throw new Error('`id` is required.')
      }
      if (importEdges.length === 0) {
        return {
          available: false,
          reason:
            'No import edges in graph — see STUBS.md (import-extractor TODO)',
        }
      }
      const sources = importEdges
        .filter((e) => e.target === id)
        .map((e) => byId.get(e.source))
        .filter((n): n is GraphNode => n !== undefined)
        .map(slim)
      return { id, importedBy: sources, available: true }
    },
  }
}
