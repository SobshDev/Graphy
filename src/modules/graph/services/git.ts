import { createServerFn } from '@tanstack/react-start'

export const getCurrentBranch = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { simpleGit } = await import('simple-git')
    const path = await import('node:path')
    try {
      const git = simpleGit(path.join(process.cwd(), 'tests/fixtures'))
      const branch = await git.revparse(['--abbrev-ref', 'HEAD'])
      return branch.trim() || null
    } catch {
      return null
    }
  },
)
