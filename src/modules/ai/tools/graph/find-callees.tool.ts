import type { ClassInspector, GraphNode } from '@/modules/parser'

import type { AiTool } from '../tools.interface'

interface FindCalleesInput {
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

export function createFindCalleesTool(inspector: ClassInspector): AiTool {
  return {
    name: 'find_callees',
    description:
      'Return every node the given node calls (outgoing "calls" edges). Use this to answer "what does X call?" or "what does X depend on?".',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Source node id (function, method, arrow, or class).',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
    handler: (input: unknown) => {
      const { id } = input as FindCalleesInput
      if (!id) {
        throw new Error('`id` is required.')
      }
      const callees = inspector.calleesOf(id).map(slim)
      return { id, callees, totalCallees: callees.length }
    },
  }
}
