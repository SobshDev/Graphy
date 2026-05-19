import { useEffect, useState } from 'react'

import { getGitHistory } from '../services/git-history'
import type { GitHistory } from '../services/git-history'

type State =
  | { status: 'loading' }
  | { status: 'ready'; data: GitHistory }
  | { status: 'error' }

export function useGitHistory() {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    getGitHistory()
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
