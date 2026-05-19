import { requestGraphFocus } from '@/shared/lib/graph-focus'

import type { AiTool } from '../tools.interface'

interface FocusNodeInput {
  id?: string
}

export function createFocusNodeTool(): AiTool {
  return {
    name: 'focus_node',
    description:
      'Center and highlight a node on the graph canvas by its id. The id is formatted as "<relative-file>::<qualified-name>". Use this when the user asks to "show", "navigate to", or "highlight" a specific function or class.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Node id to focus on the canvas.',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
    handler: (input: unknown) => {
      const { id } = input as FocusNodeInput
      if (!id) throw new Error('`id` is required.')

      const sepIdx = id.indexOf('::')
      const file = sepIdx === -1 ? id : id.slice(0, sepIdx)
      requestGraphFocus(file)
      return { ok: true, id }
    },
  }
}
