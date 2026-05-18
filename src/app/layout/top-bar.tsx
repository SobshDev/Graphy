import { useStore } from '@xyflow/react'

import { AiChatToggle } from '@/modules/ai-chat'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/ui/breadcrumb'

export function TopBar() {
  const nodeCount = useStore((s) => s.nodes.length)
  const edgeCount = useStore((s) => s.edges.length)

  return (
    <header className="bg-sidebar border-sidebar-border app-drag titlebar-inset flex h-12 shrink-0 items-center justify-between border-b pl-5 pr-2">
      <Breadcrumb>
        <BreadcrumbList className="font-mono text-[12px]">
          <BreadcrumbItem>
            <BreadcrumbLink href="#" className="text-muted-foreground/60">
              ~/projects
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-muted-foreground/60" />
          <BreadcrumbItem>
            <BreadcrumbPage>graphy</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

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

        <AiChatToggle />
      </div>
    </header>
  )
}
