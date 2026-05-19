import { getDesktop } from '@/shared/lib/desktop'

import type { AiTool } from '../tools.interface'

interface GitStatusDesktop {
  gitStatus?: () => Promise<{
    branch: string | null
    staged: string[]
    unstaged: string[]
    untracked: string[]
  }>
}

export function createGitStatusTool(): AiTool {
  return {
    name: 'git_status',
    description:
      'Return the current git status of the project: branch name, staged files, unstaged files, and untracked files. Use this to answer questions about what has changed or what branch the user is on.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    handler: async () => {
      const ext = getDesktop() as (GitStatusDesktop & object) | null
      if (!ext?.gitStatus) {
        return {
          available: false,
          reason: 'IPC method `gitStatus` not wired',
        }
      }
      return ext.gitStatus()
    },
  }
}
