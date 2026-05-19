import { useSyncExternalStore } from 'react'

import { getDiffOverlay, subscribeDiffOverlay } from '../state/diff-overlay'
import type { DiffOverlayState } from '../types'

export function useDiffOverlay(): DiffOverlayState {
  return useSyncExternalStore(
    subscribeDiffOverlay,
    getDiffOverlay,
    getDiffOverlay,
  )
}
