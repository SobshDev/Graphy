import { ChevronDown, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'

import { cn } from '@/shared/lib/utils'

import { essentialTokenIds } from '../data/essentials'
import { themeTokenGroups } from '../data/groups'
import { DEFAULT_PRESET_ID } from '../data/presets'
import { themeTokenById, themeTokens } from '../data/tokens'
import { useThemeState } from '../hooks/use-theme'
import { themeStore } from '../state/theme-store'
import type { ThemeTokenGroupId } from '../types'
import { ThemeEssentialRow } from './theme-essential-row'
import { ThemePresetGrid } from './theme-preset-grid'
import { ThemeTokenGroupSection } from './theme-token-group'

export function ThemesSection() {
  const state = useThemeState()
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const essentialTokens = useMemo(
    () =>
      essentialTokenIds
        .map((id) => themeTokenById.get(id))
        .filter((t): t is NonNullable<typeof t> => t !== undefined),
    [],
  )

  const advancedTokensByGroup = useMemo(() => {
    const map = new Map<ThemeTokenGroupId, typeof themeTokens>()
    for (const token of themeTokens) {
      if (essentialTokenIds.includes(token.id)) continue
      const list = map.get(token.group)
      if (list) {
        list.push(token)
      } else {
        map.set(token.group, [token])
      }
    }
    return map
  }, [])

  const totalOverrides = Object.keys(state.overrides).length
  const canReset = totalOverrides > 0 || state.preset !== DEFAULT_PRESET_ID

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2.5">
        <header className="flex items-baseline justify-between gap-2">
          <h2 className="text-foreground text-[13px] font-medium tracking-tight">
            Preset
          </h2>
          <button
            type="button"
            onClick={() => themeStore.reset()}
            disabled={!canReset}
            className="text-muted-foreground hover:text-foreground border-border hover:bg-accent disabled:hover:text-muted-foreground inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <RotateCcw size={11} strokeWidth={1.8} />
            <span>Reset</span>
          </button>
        </header>
        <ThemePresetGrid />
      </section>

      <section className="flex flex-col gap-2.5">
        <header className="flex items-baseline justify-between gap-2">
          <h2 className="text-foreground text-[13px] font-medium tracking-tight">
            Colors
          </h2>
          <span className="text-muted-foreground/80 text-[11px]">
            Tweak the essentials
          </span>
        </header>
        <div className="border-border bg-card/30 divide-border/60 divide-y rounded-lg border">
          {essentialTokens.map((token) => (
            <ThemeEssentialRow key={token.id} token={token} state={state} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          aria-expanded={advancedOpen}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 self-start text-[11.5px] outline-none transition-colors"
        >
          <ChevronDown
            size={12}
            strokeWidth={1.8}
            className={cn(
              'transition-transform',
              advancedOpen ? 'rotate-180' : 'rotate-0',
            )}
          />
          <span>{advancedOpen ? 'Hide advanced' : 'Customize all colors'}</span>
          {totalOverrides > 0 && !advancedOpen ? (
            <span className="text-primary font-mono">
              · {totalOverrides} custom
            </span>
          ) : null}
        </button>
        {advancedOpen ? (
          <div className="flex flex-col gap-2">
            {themeTokenGroups.map((group) => {
              const tokens = advancedTokensByGroup.get(group.id) ?? []
              if (tokens.length === 0) return null
              return (
                <ThemeTokenGroupSection
                  key={group.id}
                  group={group}
                  tokens={tokens}
                  state={state}
                />
              )
            })}
          </div>
        ) : null}
      </section>
    </div>
  )
}
