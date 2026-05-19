import { useCallback, useRef, useState } from 'react'

import { getDesktop } from '@/shared/lib/desktop'
import type { SearchMatch } from '@/shared/lib/desktop'

export interface FileGroup {
  file: string
  matches: SearchMatch[]
}

type State =
  | { status: 'idle'; results: null }
  | { status: 'searching'; results: null }
  | { status: 'ready'; results: FileGroup[] }
  | { status: 'error'; results: null }

export function useSearch() {
  const [state, setState] = useState<State>({ status: 'idle', results: null })
  const generationRef = useRef(0)

  const search = useCallback(async (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) {
      setState({ status: 'idle', results: null })
      return
    }
    const desktop = getDesktop()
    if (!desktop) return

    const gen = ++generationRef.current
    setState({ status: 'searching', results: null })

    try {
      const matches = await desktop.searchText(trimmed)
      if (gen !== generationRef.current) return

      const grouped = new Map<string, SearchMatch[]>()
      for (const m of matches) {
        let arr = grouped.get(m.file)
        if (!arr) {
          arr = []
          grouped.set(m.file, arr)
        }
        arr.push(m)
      }

      const results: FileGroup[] = []
      for (const [file, fileMatches] of grouped) {
        results.push({ file, matches: fileMatches })
      }

      setState({ status: 'ready', results })
    } catch {
      if (gen !== generationRef.current) return
      setState({ status: 'error', results: null })
    }
  }, [])

  const clear = useCallback(() => {
    generationRef.current++
    setState({ status: 'idle', results: null })
  }, [])

  return { ...state, search, clear }
}
