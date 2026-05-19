import { getDesktop } from '@/shared/lib/desktop'

import type { AiTool } from '../tools.interface'

interface ApplyEditInput {
  file?: string
  oldString?: string
  newString?: string
  replaceAll?: boolean
}

export function createApplyEditTool(): AiTool {
  return {
    name: 'apply_edit',
    description:
      "Apply a string replacement to a file in the user's project. Returns whether the edit was applied, the file written, and the number of replacements made. Use this to make targeted code edits; the main process will show a confirmation dialog before writing.",
    inputSchema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          description:
            'Project-relative path of the file to edit (e.g. "src/foo.ts").',
        },
        oldString: {
          type: 'string',
          description:
            'Exact text to replace. Must be unique unless `replaceAll` is true.',
        },
        newString: {
          type: 'string',
          description: 'Replacement text. May be empty to delete the match.',
        },
        replaceAll: {
          type: 'boolean',
          description:
            'When true, replace every occurrence. Defaults to false (require a unique match).',
        },
      },
      required: ['file', 'oldString', 'newString'],
      additionalProperties: false,
    },
    handler: async (input: unknown) => {
      const { file, oldString, newString, replaceAll } = input as ApplyEditInput
      if (!file) {
        throw new Error('`file` is required.')
      }
      if (typeof oldString !== 'string') {
        throw new Error('`oldString` is required.')
      }
      if (typeof newString !== 'string') {
        throw new Error('`newString` is required.')
      }
      const ext = getDesktop()
      if (!ext?.applyEdit) {
        return {
          available: false,
          reason: 'IPC method `graphy:fs:apply-edit` not wired',
        }
      }
      return ext.applyEdit({
        file,
        oldString,
        newString,
        replaceAll: replaceAll === true,
      })
    },
  }
}
