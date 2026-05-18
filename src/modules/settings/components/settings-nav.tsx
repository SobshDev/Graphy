import { settingsSections } from '../data/sections'
import type { SettingsSectionId } from '../types'
import { cn } from '@/shared/lib/utils'

type SettingsNavProps = {
  active: SettingsSectionId
  onSelect: (id: SettingsSectionId) => void
}

export function SettingsNav({ active, onSelect }: SettingsNavProps) {
  return (
    <nav
      aria-label="Settings sections"
      className="border-sidebar-border bg-sidebar/60 flex w-[220px] shrink-0 flex-col border-r py-3"
    >
      <ul className="flex flex-col gap-px px-2">
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
