import { useCallback, useEffect, useState } from 'react'

import { getDesktop } from '@/shared/lib/desktop'
import type { FileNode } from '@/shared/lib/desktop'

type State =
  | { status: 'idle'; tree: null; error: null }
  | { status: 'loading'; tree: null; error: null }
  | { status: 'ready'; tree: FileNode; error: null }
  | { status: 'error'; tree: null; error: string }

type FileTreeResult = State & { refresh: () => void }

export function useFileTree(showHidden: boolean): FileTreeResult {
  const [state, setState] = useState<State>({
    status: 'idle',
    tree: null,
    error: null,
  })

  const fetchTree = useCallback(async () => {
    const desktop = getDesktop()
    if (!desktop) {
      setState({ status: 'idle', tree: null, error: null })
      return
    }
    setState({ status: 'loading', tree: null, error: null })
    try {
      const tree = await desktop.getFileTree({ showHidden })
      if (!tree) {
        setState({ status: 'idle', tree: null, error: null })
        return
      }
      setState({ status: 'ready', tree, error: null })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setState({ status: 'error', tree: null, error: message })
    }
  }, [showHidden])

  useEffect(() => {
    fetchTree()
    const desktop = getDesktop()
    if (!desktop) return
    return desktop.onProject(() => {
      fetchTree()
    })
  }, [fetchTree])

  return { ...state, refresh: fetchTree }
}
