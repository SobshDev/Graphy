import { getDesktop } from '@/shared/lib/desktop'
import type { GraphyDesktop } from '@/shared/lib/desktop'

import type { AiTool } from '../tools.interface'

interface ReparseProjectResult {
  ok: true
}

type DesktopExt = GraphyDesktop & {
  reparseProject: () => Promise<ReparseProjectResult>
}

export function createReparseProjectTool(): AiTool {
  return {
    name: 'reparse_project',
    description:
      'Re-run static analysis on the open project so the graph reflects on-disk source. Returns `{ ok: true }` once the renderer has received a fresh graph. Use this after edits or external file changes when you need the call graph to be up to date.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    handler: async () => {
      const ext = getDesktop() as DesktopExt | null
      if (!ext?.reparseProject) {
        return {
          available: false,
          reason: 'IPC method `graphy:graph:reparse` not wired — see STUBS.md.',
        }
      }
      return ext.reparseProject()
    },
  }
}
