import { createFileRoute } from '@tanstack/react-router'
import { ReactFlowProvider, useReactFlow, useStore } from '@xyflow/react'
import {
  Bell,
  ChevronRight,
  Folder,
  GitBranch,
  Maximize2,
  Minus,
  Network,
  Play,
  Plus,
  Puzzle,
  Search,
  Settings,
  Share2,
} from 'lucide-react'

import { GraphCanvas } from '@/components/graph/graph-canvas'
import { Button } from '@/components/ui/button'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <TooltipProvider delayDuration={200}>
      <ReactFlowProvider>
        <main className="bg-canvas text-foreground flex h-screen w-screen overflow-hidden">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <Canvas />
          </div>
        </main>
      </ReactFlowProvider>
    </TooltipProvider>
  )
}

type NavItem = {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  shortcut?: string
  active?: boolean
}

const navItems: Array<NavItem> = [
  { icon: Folder, label: 'Files', shortcut: '⌘1', active: true },
  { icon: Search, label: 'Search', shortcut: '⌘⇧F' },
  { icon: GitBranch, label: 'Source control', shortcut: '⌘⇧G' },
  { icon: Network, label: 'Graphs', shortcut: '⌘⇧H' },
  { icon: Puzzle, label: 'Extensions', shortcut: '⌘⇧X' },
]

function Sidebar() {
  return (
    <aside className="bg-sidebar border-sidebar-border flex w-15 shrink-0 flex-col items-center justify-between border-r py-3">
      <div className="flex flex-col items-center gap-1">
        {navItems.map(({ icon: Icon, label, shortcut, active }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className={
                  active
                    ? 'text-foreground hover:bg-sidebar-accent relative'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground relative'
                }
              >
                {active && (
                  <span className="bg-primary absolute -left-3 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r" />
                )}
                <Icon className="size-5" strokeWidth={1.6} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <span>{label}</span>
              {shortcut ? (
                <KbdGroup>
                  {Array.from(shortcut).map((key, i) => (
                    <Kbd key={i}>{key}</Kbd>
                  ))}
                </KbdGroup>
              ) : null}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div className="flex flex-col items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            >
              <Bell className="size-4.5" strokeWidth={1.6} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Notifications</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            >
              <Settings className="size-4.5" strokeWidth={1.6} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Settings</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  )
}

function TopBar() {
  const nodeCount = useStore((s) => s.nodes.length)
  const edgeCount = useStore((s) => s.edges.length)

  return (
    <header className="bg-sidebar border-sidebar-border flex h-12 shrink-0 items-center justify-between border-b pl-5 pr-3">
      <div className="flex items-center gap-2 font-mono text-[12px]">
        <span className="text-muted-foreground/60">~/projects</span>
        <ChevronRight
          className="text-muted-foreground/60 size-3"
          strokeWidth={1.8}
        />
        <span className="text-foreground">graphy</span>
      </div>

      <div className="flex items-center gap-2">
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

        <Button variant="ghost" size="sm">
          <Share2 className="size-3.5" strokeWidth={1.7} />
          Share
        </Button>

        <Button size="sm">
          <Play className="size-3 fill-current" strokeWidth={0} />
          Run graph
        </Button>
      </div>
    </header>
  )
}

function Canvas() {
  return (
    <section className="relative min-h-0 flex-1 overflow-hidden">
      <GraphCanvas />

      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2">
        <span className="glass border-border text-muted-foreground inline-flex h-7 items-center gap-2 rounded-md border px-2.5 font-mono text-[11px]">
          <span className="bg-muted-foreground/40 h-1.5 w-1.5 rounded-full" />
          Idle
        </span>
        <span className="glass border-border text-muted-foreground inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 font-mono text-[11px]">
          <span className="text-muted-foreground/60">view</span>
          <span className="text-foreground">graph</span>
        </span>
      </div>

      <div className="text-muted-foreground/70 pointer-events-none absolute bottom-4 left-4 flex items-center gap-3 font-mono text-[11px]">
        <span className="inline-flex items-center gap-1.5">
          <GitBranch className="size-3" strokeWidth={1.8} />
          main
        </span>
        <span>·</span>
        <span>typescript</span>
        <span>·</span>
        <span>
          ln <span className="text-muted-foreground">0</span>, col{' '}
          <span className="text-muted-foreground">0</span>
        </span>
      </div>

      <ZoomControls />
    </section>
  )
}

function ZoomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const zoom = useStore((s) => s.transform[2])

  return (
    <div className="glass border-border absolute bottom-4 right-4 flex items-center overflow-hidden rounded-lg border">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-none"
            onClick={() => zoomOut({ duration: 200 })}
          >
            <Minus className="size-3.5" strokeWidth={2} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom out</TooltipContent>
      </Tooltip>

      <div className="text-foreground select-none px-2 font-mono text-[11px] tabular-nums">
        {Math.round(zoom * 100)}%
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-none"
            onClick={() => zoomIn({ duration: 200 })}
          >
            <Plus className="size-3.5" strokeWidth={2} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom in</TooltipContent>
      </Tooltip>

      <div className="flex h-4 items-center">
        <Separator orientation="vertical" />
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-none"
            onClick={() => fitView({ padding: 0.25, duration: 200 })}
          >
            <Maximize2 className="size-3" strokeWidth={1.7} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Fit to view</TooltipContent>
      </Tooltip>
    </div>
  )
}
