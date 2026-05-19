import { useStore } from '@xyflow/react'

import { AiChatToggle } from '@/modules/ai-chat'
import { useProject } from '@/modules/graph'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/ui/breadcrumb'

function folderToBreadcrumbs(folder: string | null) {
  if (!folder) return { parent: null, name: null }
  const home = folder.startsWith('/Users/')
    ? '/Users/' + folder.split('/')[2]
    : null
  const display = home ? '~' + folder.slice(home.length) : folder
  const lastSlash = display.lastIndexOf('/')
  if (lastSlash === -1) return { parent: null, name: display }
  return {
    parent: display.slice(0, lastSlash),
    name: display.slice(lastSlash + 1),
  }
}

export function TopBar() {
  const nodeCount = useStore((s) => s.nodes.length)
  const edgeCount = useStore((s) => s.edges.length)
  const { folder } = useProject()
  const { parent, name } = folderToBreadcrumbs(folder)

  return (
    <header className="bg-sidebar border-sidebar-border app-drag titlebar-inset flex h-12 shrink-0 items-center justify-between border-b pl-5 pr-2">
      <Breadcrumb>
        <BreadcrumbList className="font-mono text-[12px]">
          {parent && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink href="#" className="text-muted-foreground/60">
                  {parent}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-muted-foreground/60" />
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage>{name ?? 'No folder open'}</BreadcrumbPage>
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
