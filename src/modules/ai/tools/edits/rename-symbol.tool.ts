import { getDesktop } from '@/shared/lib/desktop'
import type { GraphyDesktop } from '@/shared/lib/desktop'

import type { AiTool } from '../tools.interface'

interface RenameSymbolInput {
  id?: string
  newName?: string
}

interface RenameSymbolPayload {
  id: string
  newName: string
}

interface RenameSymbolResult {
  applied: boolean
  id: string
  newId: string
  affectedFiles: string[]
}

type DesktopExt = GraphyDesktop & {
  renameSymbol: (payload: RenameSymbolPayload) => Promise<RenameSymbolResult>
}

export function createRenameSymbolTool(): AiTool {
  return {
    name: 'rename_symbol',
    description:
      'Rename a function, method, arrow, or class across the project using ts-morph. Returns the new node id and the list of files touched. Use this for safe project-wide renames instead of editing text directly.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description:
            'Existing node id, formatted as "<relative-file>::<qualified-name>".',
        },
        newName: {
          type: 'string',
          description: 'New identifier. Must be a valid TypeScript identifier.',
        },
      },
      required: ['id', 'newName'],
      additionalProperties: false,
    },
    handler: async (input: unknown) => {
      const { id, newName } = input as RenameSymbolInput
      if (!id) {
        throw new Error('`id` is required.')
      }
      if (!newName) {
        throw new Error('`newName` is required.')
      }
      const ext = getDesktop() as DesktopExt | null
      if (!ext?.renameSymbol) {
        return {
          available: false,
          reason:
            'IPC method `graphy:edits:rename-symbol` not wired — see STUBS.md.',
        }
      }
      return ext.renameSymbol({ id, newName })
    },
  }
}
