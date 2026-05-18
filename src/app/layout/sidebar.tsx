import { Link, useLocation } from '@tanstack/react-router'
import {
  Bell,
  Folder,
  GitBranch,
  Network,
  Puzzle,
  Search,
  Settings,
} from 'lucide-react'

import { toggleActivePanel, useActivePanel } from '@/shared/lib/active-panel'
import type { ActivePanel } from '@/shared/lib/active-panel'
import { Button } from '@/shared/ui/button'
import { Kbd, KbdGroup } from '@/shared/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

type NavItem = {
  id: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  shortcut?: string
  to?: string
  panel?: Exclude<ActivePanel, null>
}

const navItems: Array<NavItem> = [
  {
    id: 'files',
    icon: Folder,
    label: 'Files',
    shortcut: '⌘1',
    panel: 'files',
  },
  { id: 'search', icon: Search, label: 'Search', shortcut: '⌘⇧F' },
  {
    id: 'git',
    icon: GitBranch,
    label: 'Source control',
    shortcut: '⌘⇧G',
    panel: 'git',
  },
  { id: 'graphs', icon: Network, label: 'Graphs', shortcut: '⌘⇧H' },
  {
    id: 'extensions',
    icon: Puzzle,
    label: 'Extensions',
    shortcut: '⌘⇧X',
  },
]

export function Sidebar() {
  const location = useLocation()
  const isSettings = location.pathname.startsWith('/settings')
  const activePanel = useActivePanel()

  return (
    <aside className="bg-sidebar border-sidebar-border app-drag titlebar-pad flex w-15 shrink-0 flex-col items-center justify-between border-r py-3">
      <div className="app-no-drag flex flex-col items-center gap-2">
        {navItems.map(({ id, icon: Icon, label, shortcut, to, panel }) => {
          const active = isSettings
            ? false
            : panel
              ? activePanel === panel
              : false
          const handleClick = panel
            ? (e: React.MouseEvent) => {
                e.preventDefault()
                toggleActivePanel(panel)
              }
            : undefined
          const button = (
            <Button
              variant="ghost"
              size="icon-lg"
              onClick={handleClick}
              className={
                active
                  ? 'text-foreground hover:bg-sidebar-accent relative'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground relative'
              }
            >
              {active && (
                <span className="bg-primary absolute -left-2.5 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r" />
              )}
              <Icon className="size-5" strokeWidth={1.6} />
            </Button>
          )

          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                {to ? <Link to={to}>{button}</Link> : button}
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
          )
        })}
      </div>

      <div className="app-no-drag flex flex-col items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-lg"
              className="text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            >
              <Bell className="size-5" strokeWidth={1.6} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Notifications</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link to="/settings">
              <Button
                variant="ghost"
                size="icon-lg"
                className={
                  isSettings
                    ? 'text-foreground hover:bg-sidebar-accent relative'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground relative'
                }
              >
                {isSettings && (
                  <span className="bg-primary absolute -left-2.5 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r" />
                )}
                <Settings className="size-5" strokeWidth={1.6} />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Settings</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  )
}
