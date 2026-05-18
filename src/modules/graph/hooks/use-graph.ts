import { useCallback, useEffect, useState } from 'react'

import type { Graph } from '@/modules/parser'

const MOCK_GRAPH_URL = '/sample-graph.json'
const GRAPH_UPDATE_EVENT = 'graphy:graph-updated'

export interface UseGraphResult {
  graph: Graph | null
  loading: boolean
  error: Error | null
  reload: () => void
}

export function useGraph(): UseGraphResult {
  const [graph, setGraph] = useState<Graph | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [tick, setTick] = useState(0)

  const reload = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    loadGraph()
      .then((result) => {
        if (!cancelled) setGraph(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [tick])

  useEffect(() => {
    if (!import.meta.hot) return
    const handler = () => reload()
    import.meta.hot.on(GRAPH_UPDATE_EVENT, handler)
    return () => {
      import.meta.hot?.off(GRAPH_UPDATE_EVENT, handler)
    }
  }, [reload])

  return { graph, loading, error, reload }
}

async function loadGraph(): Promise<Graph> {
  const response = await fetch(`${MOCK_GRAPH_URL}?t=${Date.now()}`)
  if (!response.ok) {
    throw new Error(
      `Failed to load graph (${response.status}). Run "bun run parser:dump" to generate it.`,
    )
  }
  return (await response.json()) as Graph
}
