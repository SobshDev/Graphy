import { getDesktop } from '@/shared/lib/desktop'

import type { AiTool } from '../tools.interface'

interface GitBlameDesktop {
  gitBlame?: (payload: {
    file: string
    line?: number
    contextLines?: number
  }) => Promise<{
    lines: Array<{
      line: number
      sha: string
      author: string
      date: string
      content: string
    }>
  }>
}

interface GitBlameInput {
  file?: string
  line?: number
  contextLines?: number
}

const DEFAULT_CONTEXT_LINES = 5

export function createGitBlameTool(): AiTool {
  return {
    name: 'git_blame',
    description:
      'Return git blame information for a file, optionally around a specific line. Each result includes the commit sha, author, date, and line content. Use this to answer "who wrote this?" or "when was this changed?".',
    inputSchema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          description: 'Relative file path to blame.',
        },
        line: {
          type: 'integer',
          minimum: 1,
          description:
            'Target line number. If provided, results are scoped to contextLines around this line.',
        },
        contextLines: {
          type: 'integer',
          minimum: 0,
          description: `Lines of context around the target line. Defaults to ${DEFAULT_CONTEXT_LINES}.`,
        },
      },
      required: ['file'],
      additionalProperties: false,
    },
    handler: async (input: unknown) => {
      const {
        file,
        line,
        contextLines = DEFAULT_CONTEXT_LINES,
      } = input as GitBlameInput
      if (!file) {
        throw new Error('`file` is required.')
      }
      const ext = getDesktop() as (GitBlameDesktop & object) | null
      if (!ext?.gitBlame) {
        return {
          available: false,
          reason: 'IPC method `gitBlame` not wired — see STUBS.md',
        }
      }
      return ext.gitBlame({ file, line, contextLines })
    },
  }
}
