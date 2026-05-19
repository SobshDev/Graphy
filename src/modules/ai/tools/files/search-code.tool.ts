import { getDesktop } from '@/shared/lib/desktop'

import type { AiTool } from '../tools.interface'

interface SearchCodeInput {
  query?: string
  regex?: boolean
  filePattern?: string
  maxResults?: number
}

type SearchProjectFn = (payload: {
  query: string
  regex: boolean
  filePattern?: string
  maxResults: number
}) => Promise<{
  results: Array<{ file: string; line: number; match: string; preview: string }>
  truncated: boolean
}>

const DEFAULT_MAX_RESULTS = 50

export function createSearchCodeTool(): AiTool {
  return {
    name: 'search_code',
    description:
      'Search the project for a string (or regex) across files. Returns the matching files, line numbers, and short previews. Use this to find usages, identifiers, or TODOs the call graph does not surface.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Substring or regex pattern to search for.',
        },
        regex: {
          type: 'boolean',
          description:
            'If true, interpret `query` as a regular expression. Defaults to false.',
        },
        filePattern: {
          type: 'string',
          description:
            'Optional glob to restrict which files are searched (e.g. "src/**/*.ts").',
        },
        maxResults: {
          type: 'integer',
          minimum: 1,
          description: `Cap on returned hits. Defaults to ${DEFAULT_MAX_RESULTS}.`,
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
    handler: async (input: unknown) => {
      const { query, regex, filePattern, maxResults } = input as SearchCodeInput
      if (!query) {
        throw new Error('`query` is required.')
      }
      const desktop = getDesktop()
      const searchProject =
        desktop && 'searchProject' in desktop
          ? (desktop.searchProject as SearchProjectFn | undefined)
          : undefined
      if (!searchProject) {
        return {
          available: false,
          reason: 'IPC method `graphy:fs:search` not wired',
        }
      }
      return searchProject({
        query,
        regex: regex ?? false,
        filePattern,
        maxResults: maxResults ?? DEFAULT_MAX_RESULTS,
      })
    },
  }
}
