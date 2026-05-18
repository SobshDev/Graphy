import type { Graph } from '@/modules/parser'

export interface ProjectPayload {
  folder: string | null
  recents: string[]
}

export interface GraphPayload {
  folder: string | null
  graph: Graph | null
  error: string | null
  loading: boolean
}

export interface InitialState extends ProjectPayload, GraphPayload {}

export interface GraphyDesktop {
  platform: NodeJS.Platform
  getInitialState: () => Promise<InitialState>
  openFolder: () => Promise<void>
  openRecent: (folder: string) => Promise<void>
  closeFolder: () => Promise<void>
  reloadGraph: () => Promise<void>
  clearRecents: () => Promise<void>
  onProject: (handler: (payload: ProjectPayload) => void) => () => void
  onGraph: (handler: (payload: GraphPayload) => void) => () => void
}

declare global {
  interface Window {
    graphyDesktop?: GraphyDesktop
  }
}

export function getDesktop(): GraphyDesktop | null {
  if (typeof window === 'undefined') return null
  return window.graphyDesktop ?? null
}
