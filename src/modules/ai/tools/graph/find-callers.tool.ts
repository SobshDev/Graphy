import type { ClassInspector, GraphNode } from '@/modules/parser'

import type { AiTool } from '../tools.interface'

interface FindCallersInput {
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

export function createFindCallersTool(inspector: ClassInspector): AiTool {
  return {
    name: 'find_callers',
    description:
      'Return every node that calls the given node (incoming "calls" edges). Use this to answer "who uses X?" or "where is X invoked?".',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Target node id (function, method, arrow, or class).',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
    handler: (input: unknown) => {
      const { id } = input as FindCallersInput
      if (!id) {
        throw new Error('`id` is required.')
      }
      const callers = inspector.callersOf(id).map(slim)
      return { id, callers, totalCallers: callers.length }
    },
  }
}
