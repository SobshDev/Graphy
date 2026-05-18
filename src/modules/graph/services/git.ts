import { createServerFn } from '@tanstack/react-start'

export const getCurrentBranch = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { simpleGit } = await import('simple-git')
    try {
      const git = simpleGit(process.cwd())
      const branch = await git.revparse(['--abbrev-ref', 'HEAD'])
      return branch.trim() || null
    } catch {
      return null
    }
  },
)
