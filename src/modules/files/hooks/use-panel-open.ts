import {
  setActivePanel,
  toggleActivePanel,
  useActivePanel,
} from '@/shared/lib/active-panel'

export function usePanelOpen() {
  return useActivePanel() === 'files'
}

export function togglePanel() {
  toggleActivePanel('files')
}

export function setPanelOpen(next: boolean) {
  setActivePanel(next ? 'files' : null)
}
