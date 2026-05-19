import type { Graph, GraphNode } from '@/modules/parser'
import { getDesktop } from '@/shared/lib/desktop'

import type { AiTool } from '../tools.interface'

interface ReadNodeSourceInput {
  id?: string
}

export function createReadNodeSourceTool(graph: Graph): AiTool {
  const byId = new Map<string, GraphNode>(
    graph.nodes.map((node) => [node.id, node]),
  )
  const root = graph.root
  return {
    name: 'read_node_source',
    description:
      'Return the source code of a graph node (function, method, arrow, or class) by its id. Use this when you need the actual implementation rather than just metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description:
            'Exact node id, formatted as "<relative-file>::<qualified-name>".',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
    handler: async (input: unknown) => {
      const { id } = input as ReadNodeSourceInput
      if (!id) {
        throw new Error('`id` is required.')
      }
      const node = byId.get(id)
      if (!node) {
        return { found: false, id }
      }
      const desktop = getDesktop()
      if (!desktop) {
        return {
          available: false,
          reason: 'Desktop bridge unavailable in this runtime.',
        }
      }
      const result = await desktop.readFunctionSource({
        root,
        file: node.file,
        startLine: node.line,
        endLine: node.endLine,
      })
      return {
        found: true,
        id,
        file: node.file,
        startLine: result.startLine,
        endLine: result.endLine,
        source: result.source,
      }
    },
  }
}
