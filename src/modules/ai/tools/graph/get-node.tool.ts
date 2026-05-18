import type { Graph } from '@/modules/parser'

import type { AiTool } from '../tools.interface'

interface GetNodeInput {
  id?: string
}

export function createGetNodeTool(graph: Graph): AiTool {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]))
  return {
    name: 'get_node',
    description:
      'Look up a single graph node by its id (e.g. "src/foo.ts::Bar.baz"). Returns the full node record including type, file, line, signature, body size, and in/out degree.',
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
    handler: (input: unknown) => {
      const { id } = input as GetNodeInput
      if (!id) {
        throw new Error('`id` is required.')
      }
      const node = byId.get(id)
      if (!node) {
        return { found: false, id }
      }
      return { found: true, node }
    },
  }
}
