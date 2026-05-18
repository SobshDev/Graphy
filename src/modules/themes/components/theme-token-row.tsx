import { RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/shared/lib/utils'

import { themePresetById } from '../data/presets'
import { cssColorToHex } from '../services/color-to-hex'
import { themeStore } from '../state/theme-store'
import type { ThemeState, ThemeToken } from '../types'

type ThemeTokenRowProps = {
  token: ThemeToken
  state: ThemeState
}

function baseValue(token: ThemeToken, state: ThemeState): string {
  const preset = themePresetById.get(state.preset)
  return preset?.values[token.id] ?? token.defaultValue
}

export function ThemeTokenRow({ token, state }: ThemeTokenRowProps) {
  const override = state.overrides[token.id]
  const fallback = baseValue(token, state)
  const value = override ?? fallback
  const isOverridden = override !== undefined

  const [draft, setDraft] = useState(value)
  const lastSyncedRef = useRef(value)

  useEffect(() => {
    if (value !== lastSyncedRef.current) {
      setDraft(value)
      lastSyncedRef.current = value
    }
  }, [value])

  const commit = (next: string) => {
    const trimmed = next.trim()
    if (!trimmed) {
      themeStore.clearOverride(token.id)
      return
    }
    themeStore.setOverride(token.id, trimmed)
  }

  return (
    <div className="flex items-center gap-2.5 px-4 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-foreground text-[12.5px] tracking-tight">
          {token.label}
        </span>
        <span className="text-muted-foreground/80 font-mono text-[10.5px]">
          {token.cssVar}
        </span>
      </div>
      <label
        className={cn(
          'relative inline-flex size-7 cursor-pointer items-center justify-center rounded-md border transition-colors',
          isOverridden
            ? 'border-primary/60'
            : 'border-border hover:border-foreground/40',
        )}
        title="Pick color"
      >
        <span
          className="size-5 rounded-sm shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
          style={{ background: value }}
        />
        <input
          type="color"
          value={cssColorToHex(value)}
          onChange={(event) => commit(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label={`Pick color for ${token.label}`}
        />
      </label>
      <input
        type="text"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur()
          } else if (event.key === 'Escape') {
            setDraft(value)
            event.currentTarget.blur()
          }
        }}
        spellCheck={false}
        className={cn(
          'h-7 w-[180px] rounded-md border bg-background/60 px-2 font-mono text-[11px] outline-none transition-colors',
          'focus:border-foreground/40',
          isOverridden ? 'border-primary/60' : 'border-border',
        )}
      />
      <button
        type="button"
        onClick={() => themeStore.clearOverride(token.id)}
        disabled={!isOverridden}
        aria-label="Reset to preset value"
        className={cn(
          'inline-flex size-7 items-center justify-center rounded-md border transition-colors',
          isOverridden
            ? 'border-border text-muted-foreground hover:text-foreground hover:bg-accent'
            : 'border-transparent text-muted-foreground/30 cursor-not-allowed',
        )}
      >
        <RotateCcw size={12} strokeWidth={1.8} />
      </button>
    </div>
  )
}
