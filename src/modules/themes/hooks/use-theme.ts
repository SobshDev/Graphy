import { useSyncExternalStore } from 'react'

import { themeStore } from '../state/theme-store'
import type { ThemeState } from '../types'

function getServerSnapshot(): ThemeState {
  return themeStore.getState()
}

export function useThemeState(): ThemeState {
  return useSyncExternalStore(
    themeStore.subscribe,
    themeStore.getState,
    getServerSnapshot,
  )
}
