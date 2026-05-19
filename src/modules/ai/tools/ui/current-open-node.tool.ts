import { getOpenFile } from '@/modules/files'

import type { AiTool } from '../tools.interface'

export function createCurrentOpenNodeTool(): AiTool {
  return {
    name: 'current_open_node',
    description:
      'Return the file currently open in the editor. Returns { open: false } when no tab is active. Use this to answer "what am I looking at?" without the user having to paste a file path.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    handler: () => {
      const active = getOpenFile()
      if (!active) return { open: false }
      return { open: true, file: active.path, name: active.name }
    },
  }
}
