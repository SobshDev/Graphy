import { createServerFn } from '@tanstack/react-start'

import { openRepo } from '@/shared/lib/git'

export const getCurrentBranch = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => data as { folder: string })
  .handler(async ({ data }) => {
    try {
      const git = await openRepo(data.folder)
      const branch = await git.revparse(['--abbrev-ref', 'HEAD'])
      return branch.trim() || null
    } catch {
      return null
    }
  })
