import type { Graph } from '@/modules/parser'

declare global {
  interface Window {
    graphyDesktop?: {
      platform: string
      parseProject: (root: string) => Promise<Graph>
    }
  }
}

export {}
