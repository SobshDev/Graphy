import { createServerFn } from '@tanstack/react-start'

import { openRepo } from '@/shared/lib/git'

export type GitCommit = {
  hash: string
  shortHash: string
  subject: string
  body: string
  author: string
  email: string
  date: string
  refs: string
}

export type GitHistory = {
  branch: string | null
  ahead: number
  behind: number
  tracking: string | null
  commits: Array<GitCommit>
}

export const getGitHistory = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GitHistory> => {
    try {
      const git = await openRepo()
      const status = await git.status()
      const log = await git.log({ maxCount: 200 })
      const commits: Array<GitCommit> = log.all.map((c) => ({
        hash: c.hash,
        shortHash: c.hash.slice(0, 7),
        subject: c.message,
        body: c.body.trim(),
        author: c.author_name,
        email: c.author_email,
        date: c.date,
        refs: c.refs,
      }))
      return {
        branch: status.current,
        ahead: status.ahead,
        behind: status.behind,
        tracking: status.tracking,
        commits,
      }
    } catch {
      return {
        branch: null,
        ahead: 0,
        behind: 0,
        tracking: null,
        commits: [],
      }
    }
  },
)
