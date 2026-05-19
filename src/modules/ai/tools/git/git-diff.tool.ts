import { getDesktop } from '@/shared/lib/desktop'

import type { AiTool } from '../tools.interface'

interface GitDiffDesktop {
  gitDiff?: (payload: {
    file?: string
    staged?: boolean
    maxBytes?: number
  }) => Promise<{ diff: string; truncated: boolean }>
}

interface GitDiffInput {
  file?: string
  staged?: boolean
  maxBytes?: number
}

const DEFAULT_MAX_BYTES = 32768

export function createGitDiffTool(): AiTool {
  return {
    name: 'git_diff',
    description:
      'Return the git diff for the project or a specific file. Use this to see exactly what changed in working tree or staged files.',
    inputSchema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          description: 'Relative file path to diff. Omit to diff all files.',
        },
        staged: {
          type: 'boolean',
          description:
            'If true, return staged (index) diff. Defaults to false (unstaged).',
        },
        maxBytes: {
          type: 'integer',
          minimum: 1,
          description: `Maximum bytes of diff to return. Defaults to ${DEFAULT_MAX_BYTES}.`,
        },
      },
      additionalProperties: false,
    },
    handler: async (input: unknown) => {
      const {
        file,
        staged = false,
        maxBytes = DEFAULT_MAX_BYTES,
      } = input as GitDiffInput
      const ext = getDesktop() as (GitDiffDesktop & object) | null
      if (!ext?.gitDiff) {
        return {
          available: false,
          reason: 'IPC method `gitDiff` not wired',
        }
      }
      return ext.gitDiff({ file, staged, maxBytes })
    },
  }
}
