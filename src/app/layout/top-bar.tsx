import { useStore } from '@xyflow/react'
import { ChevronRight } from 'lucide-react'

import { AiChatToggle } from '@/modules/ai-chat'
import { Separator } from '@/shared/ui/separator'

export function TopBar() {
  const nodeCount = useStore((s) => s.nodes.length)
  const edgeCount = useStore((s) => s.edges.length)

  return (
    <header className="bg-sidebar border-sidebar-border app-drag titlebar-inset flex h-12 shrink-0 items-center justify-between border-b pl-5 pr-6">
      <div className="flex items-center gap-2 font-mono text-[12px]">
        <span className="text-muted-foreground/60">~/projects</span>
        <ChevronRight
          className="text-muted-foreground/60 size-3"
          strokeWidth={1.8}
        />
        <span className="text-foreground">graphy</span>
      </div>

      <div className="app-no-drag flex items-center gap-2">
        <div className="text-muted-foreground/70 mr-2 hidden items-center gap-3 font-mono text-[11px] md:flex">
          <span>
            <span className="text-muted-foreground">{nodeCount}</span> nodes
          </span>
          <span>·</span>
          <span>
            <span className="text-muted-foreground">{edgeCount}</span> edges
          </span>
        </div>

        <div className="flex h-4 items-center">
          <Separator orientation="vertical" />
        </div>

        <AiChatToggle />
      </div>
    </header>
  )
}
