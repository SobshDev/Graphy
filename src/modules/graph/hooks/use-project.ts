import { useEffect, useState } from 'react'

import { getDesktop } from '@/shared/lib/desktop'

export interface UseProjectResult {
  folder: string | null
  recents: string[]
  openFolder: () => void
  openRecent: (folder: string) => void
  closeFolder: () => void
  reloadGraph: () => void
  clearRecents: () => void
}

export function useProject(): UseProjectResult {
  const [state, setState] = useState<{
    folder: string | null
    recents: string[]
  }>({
    folder: null,
    recents: [],
  })

  useEffect(() => {
    const desktop = getDesktop()
    if (!desktop) return

    let cancelled = false

    desktop.getInitialState().then((initial) => {
      if (cancelled) return
      setState({ folder: initial.folder, recents: initial.recents })
    })

    const unsubscribe = desktop.onProject((payload) => {
      setState({ folder: payload.folder, recents: payload.recents })
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const desktop = getDesktop()

  return {
    folder: state.folder,
    recents: state.recents,
    openFolder: () => void desktop?.openFolder(),
    openRecent: (folder: string) => void desktop?.openRecent(folder),
    closeFolder: () => void desktop?.closeFolder(),
    reloadGraph: () => void desktop?.reloadGraph(),
    clearRecents: () => void desktop?.clearRecents(),
  }
}
