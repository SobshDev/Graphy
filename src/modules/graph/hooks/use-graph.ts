import { useEffect, useState } from 'react'

import type { Graph } from '@/modules/parser'
import { getDesktop } from '@/shared/lib/desktop'

export interface UseGraphResult {
  graph: Graph | null
  folder: string | null
  loading: boolean
  error: Error | null
  layout: unknown
}

export function useGraph(): UseGraphResult {
  const [state, setState] = useState<UseGraphResult>({
    graph: null,
    folder: null,
    loading: false,
    error: null,
    layout: null,
  })

  useEffect(() => {
    const desktop = getDesktop()
    if (!desktop) {
      setState({
        graph: null,
        folder: null,
        loading: false,
        error: new Error('Graphy must be launched as a desktop app.'),
        layout: null,
      })
      return
    }

    let cancelled = false

    desktop.getInitialState().then((initial) => {
      if (cancelled) return
      setState({
        graph: initial.graph,
        folder: initial.folder,
        loading: initial.loading,
        error: initial.error ? new Error(initial.error) : null,
        layout: initial.layout,
      })
    })

    const unsubscribe = desktop.onGraph((payload) => {
      setState({
        graph: payload.graph,
        folder: payload.folder,
        loading: payload.loading,
        error: payload.error ? new Error(payload.error) : null,
        layout: payload.layout,
      })
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return state
}
