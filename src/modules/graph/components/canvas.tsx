import { GitBranch } from 'lucide-react'

import { GraphCanvas } from '@/modules/graph/components/graph-canvas'
import { ZoomControls } from '@/modules/graph/components/zoom-controls'
import { useCurrentBranch } from '@/modules/graph/hooks/use-current-branch'

export function Canvas() {
  const branch = useCurrentBranch()

  return (
    <section className="relative min-h-0 flex-1 overflow-hidden">
      <GraphCanvas />

      <div
        aria-hidden="true"
        className="from-canvas via-canvas/80 pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b to-transparent"
      />
      <div
        aria-hidden="true"
        className="from-canvas via-canvas/80 pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 bg-gradient-to-t to-transparent"
      />

      <div className="text-muted-foreground/70 pointer-events-none absolute bottom-4 left-6 z-20 flex h-8 items-center gap-3 font-mono text-[11px]">
        <span className="inline-flex items-center gap-1.5">
          <GitBranch className="size-3" strokeWidth={1.8} />
          {branch ?? '—'}
        </span>
        <span>·</span>
        <span>typescript</span>
      </div>

      <ZoomControls />
    </section>
  )
}
