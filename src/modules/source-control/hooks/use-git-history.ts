import { useEffect, useState } from 'react'

import { getGitHistory } from '../services/git-history'
import type { GitHistory } from '../services/git-history'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: GitHistory }
  | { status: 'error' }

export function useGitHistory(folder: string | null, branch?: string) {
  const [state, setState] = useState<State>({ status: 'idle' })

  useEffect(() => {
    if (!folder) {
      setState({ status: 'idle' })
      return
    }

    let cancelled = false
    setState({ status: 'loading' })
    getGitHistory({ data: { folder, branch } })
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [folder, branch])

  return state
}
