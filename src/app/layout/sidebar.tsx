import {
  Bell,
  Folder,
  GitBranch,
  Network,
  Puzzle,
  Search,
  Settings,
} from 'lucide-react'

import { Button } from '@/shared/ui/button'
import { Kbd, KbdGroup } from '@/shared/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

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

export function Sidebar() {
  return (
    <aside className="bg-sidebar border-sidebar-border app-drag titlebar-pad flex w-15 shrink-0 flex-col items-center justify-between border-r py-3">
      <div className="app-no-drag flex flex-col items-center gap-1">
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

      <div className="app-no-drag flex flex-col items-center gap-1">
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
