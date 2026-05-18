import { createServerFn } from '@tanstack/react-start'

import { openRepo } from '@/shared/lib/git'

export const getCurrentBranch = createServerFn({ method: 'GET' }).handler(
  async () => {
    try {
      const git = await openRepo()
      const branch = await git.revparse(['--abbrev-ref', 'HEAD'])
      return branch.trim() || null
    } catch {
      return null
    }
  },
)
