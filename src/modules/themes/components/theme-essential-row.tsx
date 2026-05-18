import { RotateCcw } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

import { themePresetById } from '../data/presets'
import { cssColorToHex } from '../services/color-to-hex'
import { themeStore } from '../state/theme-store'
import type { ThemeState, ThemeToken } from '../types'

type ThemeEssentialRowProps = {
  token: ThemeToken
  state: ThemeState
}

function baseValue(token: ThemeToken, state: ThemeState): string {
  const preset = themePresetById.get(state.preset)
  return preset?.values[token.id] ?? token.defaultValue
}

export function ThemeEssentialRow({ token, state }: ThemeEssentialRowProps) {
  const override = state.overrides[token.id]
  const value = override ?? baseValue(token, state)
  const isOverridden = override !== undefined

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <label
        className={cn(
          'relative inline-flex size-8 cursor-pointer items-center justify-center rounded-md border transition-colors',
          isOverridden
            ? 'border-primary/60'
            : 'border-border hover:border-foreground/40',
        )}
        title="Pick color"
      >
        <span
          className="size-6 rounded-[5px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
          style={{ background: value }}
        />
        <input
          type="color"
          value={cssColorToHex(value)}
          onChange={(event) =>
            themeStore.setOverride(token.id, event.target.value)
          }
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label={`Pick color for ${token.label}`}
        />
      </label>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-foreground text-[13px] tracking-tight">
          {token.label}
        </span>
        {token.description ? (
          <span className="text-muted-foreground/80 text-[11px] leading-snug">
            {token.description}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => themeStore.clearOverride(token.id)}
        disabled={!isOverridden}
        aria-label="Reset to preset value"
        className={cn(
          'inline-flex size-7 items-center justify-center rounded-md border transition-colors',
          isOverridden
            ? 'border-border text-muted-foreground hover:text-foreground hover:bg-accent'
            : 'border-transparent text-muted-foreground/20 cursor-not-allowed',
        )}
      >
        <RotateCcw size={12} strokeWidth={1.8} />
      </button>
    </div>
  )
}
