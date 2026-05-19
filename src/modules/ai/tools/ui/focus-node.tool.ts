import { getDesktop } from '@/shared/lib/desktop'
import type { GraphyDesktop } from '@/shared/lib/desktop'

import type { AiTool } from '../tools.interface'

interface FocusNodeInput {
  id?: string
}

type DesktopExt = GraphyDesktop & {
  focusNode?: (payload: { id: string }) => Promise<void>
}

export function createFocusNodeTool(): AiTool {
  return {
    name: 'focus_node',
    description:
      'Center and highlight a node on the graph canvas by its id. Use this when the user asks to "show", "navigate to", or "highlight" a specific function or class.',
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
    handler: async (input: unknown) => {
      const { id } = input as FocusNodeInput
      if (!id) throw new Error('`id` is required.')

      const desktop = getDesktop()
      if (!desktop?.focusNode) {
        return {
          available: false,
          reason: 'IPC method `focusNode` not wired — see STUBS.md',
        }
      }

      await desktop.focusNode({ id })
      return { ok: true, id }
    },
  }
}
