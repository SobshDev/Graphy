import { getDesktop } from '@/shared/lib/desktop'

import type { AiTool } from '../tools.interface'

interface ListFilesInput {
  pattern?: string
  dir?: string
  maxResults?: number
}

type ListProjectFilesFn = (payload: {
  pattern?: string
  dir?: string
  maxResults: number
}) => Promise<{
  files: string[]
  truncated: boolean
}>

const DEFAULT_MAX_RESULTS = 200

export function createListFilesTool(): AiTool {
  return {
    name: 'list_files',
    description:
      'List project files, optionally filtered by glob pattern or subdirectory. Use this to discover what files exist before reading or searching them.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description:
            'Optional glob to filter results (e.g. "src/**/*.tsx"). Matches the project-relative path.',
        },
        dir: {
          type: 'string',
          description:
            'Project-relative directory to scope the listing to. Defaults to the project root.',
        },
        maxResults: {
          type: 'integer',
          minimum: 1,
          description: `Cap on returned paths. Defaults to ${DEFAULT_MAX_RESULTS}.`,
        },
      },
      additionalProperties: false,
    },
    handler: async (input: unknown) => {
      const { pattern, dir, maxResults } = input as ListFilesInput
      const desktop = getDesktop()
      const listProjectFiles =
        desktop && 'listProjectFiles' in desktop
          ? (desktop.listProjectFiles as ListProjectFilesFn | undefined)
          : undefined
      if (!listProjectFiles) {
        return {
          available: false,
          reason: 'IPC method `graphy:fs:list-files` not wired — see STUBS.md',
        }
      }
      return listProjectFiles({
        pattern,
        dir,
        maxResults: maxResults ?? DEFAULT_MAX_RESULTS,
      })
    },
  }
}
