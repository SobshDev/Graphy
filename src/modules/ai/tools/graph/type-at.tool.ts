import { getDesktop } from '@/shared/lib/desktop'

import type { AiTool } from '../tools.interface'

interface TypeAtInput {
  file?: string
  line?: number
  column?: number
}

type TypeAtFn = (p: { file: string; line: number; column: number }) => Promise<{
  found: boolean
  file?: string
  line?: number
  column?: number
  name?: string
  type?: string
  kind?: string
}>

export function createTypeAtTool(): AiTool {
  return {
    name: 'type_at',
    description:
      'Look up the TypeScript type of the symbol at a given file position. Use this to answer "what type does X have?" or "what is the signature of the variable at line N?".',
    inputSchema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          description: 'Relative file path within the project root.',
        },
        line: {
          type: 'number',
          description: 'One-based line number.',
        },
        column: {
          type: 'number',
          description: 'One-based column number (default: 1).',
        },
      },
      required: ['file', 'line'],
      additionalProperties: false,
    },
    handler: async (input: unknown) => {
      const { file, line, column = 1 } = input as TypeAtInput
      if (!file) throw new Error('`file` is required.')
      if (line === undefined) throw new Error('`line` is required.')

      const desktop = getDesktop()
      const tsTypeAt =
        desktop && 'tsTypeAt' in desktop
          ? (desktop.tsTypeAt as TypeAtFn | undefined)
          : undefined
      if (!tsTypeAt) {
        return {
          available: false,
          reason: 'IPC method `graphy:ts:type-at` not wired',
        }
      }

      return tsTypeAt({ file, line, column })
    },
  }
}
