import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

import { settingsSections } from '../data/sections'
import type { SettingsSectionId } from '../types'

type SettingsNavProps = {
  active: SettingsSectionId
  onSelect: (id: SettingsSectionId) => void
}

export function SettingsNav({ active, onSelect }: SettingsNavProps) {
  return (
    <nav
      aria-label="Settings sections"
      className="border-sidebar-border bg-sidebar/60 app-drag titlebar-spacer flex w-[220px] shrink-0 flex-col border-r pb-3"
    >
      <Link
        to="/"
        className="app-no-drag text-muted-foreground hover:text-foreground mx-2 mb-2 mt-1 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors outline-none"
      >
        <ArrowLeft className="size-3.5 shrink-0" strokeWidth={1.7} />
        <span className="tracking-tight">Back to app</span>
      </Link>
      <ul className="app-no-drag flex flex-col gap-px px-2">
        {settingsSections.map((section) => {
          const Icon = section.icon
          const selected = section.id === active
          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => onSelect(section.id)}
                aria-current={selected ? 'page' : undefined}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors outline-none',
                  selected
                    ? 'bg-sidebar-accent text-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground',
                )}
              >
                <Icon
                  className={cn(
                    'size-3.5 shrink-0',
                    selected ? 'text-primary' : 'text-muted-foreground/80',
                  )}
                  strokeWidth={1.7}
                />
                <span className="tracking-tight">{section.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
