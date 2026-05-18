import { Network, X } from 'lucide-react'

import { setActiveView } from '@/shared/lib/active-view'
import { requestGraphFocus } from '@/shared/lib/graph-focus'
import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

import { getFileIcon } from '../lib/file-icon'
import { closeTab, setActiveTab, useOpenTabs } from '../lib/open-file'

export function TabBar() {
  const { tabs, activeIndex } = useOpenTabs()

  if (tabs.length === 0) return null

  const jumpToGraph = () => {
    requestGraphFocus(tabs[activeIndex].path)
    setActiveView('graph')
  }

  return (
    <div className="bg-sidebar border-sidebar-border flex h-9 shrink-0 items-center border-b px-1">
      {tabs.map((tab, i) => {
        const isActive = i === activeIndex
        const isDirty = tab.content !== tab.savedContent
        const { icon: Icon, color } = getFileIcon(tab.name)
        return (
          <button
            key={tab.path}
            type="button"
            onClick={() => setActiveTab(tab.path)}
            className={cn(
              'group flex items-center gap-1.5 rounded px-2.5 py-1 text-[12px]',
              isActive
                ? 'bg-sidebar-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className={cn('size-3 shrink-0', color)} strokeWidth={1.6} />
            <span className={cn('truncate', isDirty && 'italic')}>
              {tab.name}
              {isDirty && ' •'}
            </span>
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.path)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation()
                  closeTab(tab.path)
                }
              }}
              className="text-muted-foreground hover:text-foreground -mr-1 rounded p-0.5 opacity-0 group-hover:opacity-100"
            >
              <X className="size-3" strokeWidth={2} />
            </span>
          </button>
        )
      })}
      <div className="ml-auto pr-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={jumpToGraph}
              className="text-muted-foreground hover:text-foreground rounded p-1"
            >
              <Network className="size-3.5" strokeWidth={1.6} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Show in graph</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
