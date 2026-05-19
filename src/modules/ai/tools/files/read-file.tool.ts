import { getDesktop } from '@/shared/lib/desktop'

import type { AiTool } from '../tools.interface'

interface ReadFileInput {
  path?: string
  startLine?: number
  endLine?: number
  maxBytes?: number
}

type ReadProjectFileFn = (payload: {
  path: string
  startLine?: number
  endLine?: number
  maxBytes: number
}) => Promise<{
  found: boolean
  path: string
  startLine: number
  endLine: number
  source: string
  truncated: boolean
}>

const DEFAULT_MAX_BYTES = 65536

export function createReadFileTool(): AiTool {
  return {
    name: 'read_file',
    description:
      'Read a project file (or a line range within it) from disk. Use this to inspect source the graph parser does not represent as nodes — configs, plain modules, tests, READMEs.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Project-relative path to the file.',
        },
        startLine: {
          type: 'integer',
          minimum: 1,
          description: '1-based first line to include. Defaults to 1.',
        },
        endLine: {
          type: 'integer',
          minimum: 1,
          description: '1-based last line to include. Defaults to end of file.',
        },
        maxBytes: {
          type: 'integer',
          minimum: 1,
          description: `Cap on returned bytes. Defaults to ${DEFAULT_MAX_BYTES}.`,
        },
      },
      required: ['path'],
      additionalProperties: false,
    },
    handler: async (input: unknown) => {
      const { path, startLine, endLine, maxBytes } = input as ReadFileInput
      if (!path) {
        throw new Error('`path` is required.')
      }
      const desktop = getDesktop()
      const readProjectFile =
        desktop && 'readProjectFile' in desktop
          ? (desktop.readProjectFile as ReadProjectFileFn | undefined)
          : undefined
      if (!readProjectFile) {
        return {
          available: false,
          reason: 'IPC method `graphy:fs:read-file` not wired — see STUBS.md',
        }
      }
      return readProjectFile({
        path,
        startLine,
        endLine,
        maxBytes: maxBytes ?? DEFAULT_MAX_BYTES,
      })
    },
  }
}
