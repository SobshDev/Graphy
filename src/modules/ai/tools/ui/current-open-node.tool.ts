import { getDesktop } from '@/shared/lib/desktop'

import type { AiTool } from '../tools.interface'

interface CurrentOpenNodeDesktop {
  getCurrentOpenNode?: () => Promise<
    { open: true; id: string; file: string; line: number } | { open: false }
  >
}

export function createCurrentOpenNodeTool(): AiTool {
  return {
    name: 'current_open_node',
    description:
      'Return the node currently selected in the canvas or opened in the function sheet. Returns { open: false } when nothing is focused. Use this to answer "what am I looking at?" without the user having to paste a node id.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    handler: async () => {
      const ext = getDesktop() as (CurrentOpenNodeDesktop & object) | null
      if (!ext?.getCurrentOpenNode) {
        return {
          available: false,
          reason: 'IPC method `getCurrentOpenNode` not wired — see STUBS.md',
        }
      }
      return ext.getCurrentOpenNode()
    },
  }
}
