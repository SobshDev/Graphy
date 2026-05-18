import { useEffect, useState } from 'react'

import { getFileTree } from '../services/file-tree'
import type { FileNode } from '../types'

type State =
  | { status: 'loading'; tree: null; error: null }
  | { status: 'ready'; tree: FileNode; error: null }
  | { status: 'error'; tree: null; error: string }

export function useFileTree(): State {
  const [state, setState] = useState<State>({
    status: 'loading',
    tree: null,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    getFileTree()
      .then((tree) => {
        if (!cancelled) setState({ status: 'ready', tree, error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Unknown error'
        setState({ status: 'error', tree: null, error: message })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
