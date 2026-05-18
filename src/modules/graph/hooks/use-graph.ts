import { useEffect, useState } from 'react'

import type { Graph } from '@/modules/parser'

const MOCK_GRAPH_URL = '/sample-graph.json'

export interface UseGraphResult {
  graph: Graph | null
  loading: boolean
  error: Error | null
}

export function useGraph(root: string | null): UseGraphResult {
  const [graph, setGraph] = useState<Graph | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    loadGraph(root)
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
  }, [root])

  return { graph, loading, error }
}

async function loadGraph(root: string | null): Promise<Graph> {
  if (root && typeof window !== 'undefined' && window.graphyDesktop) {
    return window.graphyDesktop.parseProject(root)
  }

  const response = await fetch(MOCK_GRAPH_URL)
  if (!response.ok) {
    throw new Error(
      `Failed to load mock graph (${response.status}). Run "bun run parser:dump" to generate it.`,
    )
  }
  return (await response.json()) as Graph
}
