import { useEffect, useState } from 'react'

import { getGitBranches } from '../services/git-history'
import type { GitBranches } from '../services/git-history'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: GitBranches }
  | { status: 'error' }

export function useGitBranches(folder: string | null) {
  const [state, setState] = useState<State>({ status: 'idle' })

  useEffect(() => {
    if (!folder) {
      setState({ status: 'idle' })
      return
    }

    let cancelled = false
    setState({ status: 'loading' })
    getGitBranches({ data: { folder } })
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [folder])

  return state
}
