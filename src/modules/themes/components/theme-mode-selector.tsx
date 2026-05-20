import { Monitor, Moon, Sun } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

import { useThemeState } from '../hooks/use-theme'
import { themeStore } from '../state/theme-store'
import type { ThemeMode } from '../types'

const MODES: ReadonlyArray<{
  id: ThemeMode
  label: string
  icon: typeof Sun
}> = [
  { id: 'system', label: 'System', icon: Monitor },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
]

export function ThemeModeSelector() {
  const state = useThemeState()

  return (
    <div
      role="radiogroup"
      aria-label="Appearance mode"
      className="border-border bg-card/30 inline-flex w-full rounded-lg border p-0.5"
    >
      {MODES.map(({ id, label, icon: Icon }) => {
        const active = state.mode === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => themeStore.setMode(id)}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium tracking-tight transition-colors outline-none',
              'focus-visible:ring-2 focus-visible:ring-ring/60',
              active
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon size={13} strokeWidth={2} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
