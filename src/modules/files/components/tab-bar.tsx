import { X } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

import { getFileIcon } from '../lib/file-icon'
import { requestCloseTab, setActiveTab, useOpenTabs } from '../lib/open-file'

export function TabBar() {
  const { tabs, activeIndex } = useOpenTabs()

  if (tabs.length === 0) return null

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
                requestCloseTab(tab.path)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation()
                  requestCloseTab(tab.path)
                }
              }}
              className="text-muted-foreground hover:text-foreground -mr-1 rounded p-0.5 opacity-0 group-hover:opacity-100"
            >
              <X className="size-3" strokeWidth={2} />
            </span>
          </button>
        )
      })}
    </div>
  )
}
