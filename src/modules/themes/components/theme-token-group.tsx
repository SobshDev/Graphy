import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/shared/lib/utils'

import type { ThemeState, ThemeToken, ThemeTokenGroup } from '../types'
import { ThemeTokenRow } from './theme-token-row'

type ThemeTokenGroupProps = {
  group: ThemeTokenGroup
  tokens: Array<ThemeToken>
  state: ThemeState
  defaultOpen?: boolean
}

export function ThemeTokenGroupSection({
  group,
  tokens,
  state,
  defaultOpen = false,
}: ThemeTokenGroupProps) {
  const [open, setOpen] = useState(defaultOpen)
  const overriddenCount = tokens.filter(
    (t) => state.overrides[t.id] !== undefined,
  ).length

  return (
    <div className="border-border bg-card/30 rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left outline-none"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-foreground text-[13px] font-medium tracking-tight">
            {group.label}
          </span>
          <span className="text-muted-foreground/80 text-[11px]">
            {group.blurb}
          </span>
        </div>
        {overriddenCount > 0 ? (
          <span className="text-primary text-[10.5px] font-mono">
            {overriddenCount} custom
          </span>
        ) : null}
        <ChevronDown
          size={14}
          strokeWidth={1.8}
          className={cn(
            'text-muted-foreground transition-transform',
            open ? 'rotate-180' : 'rotate-0',
          )}
        />
      </button>
      {open ? (
        <div className="border-border/60 divide-border/60 divide-y border-t">
          {tokens.map((token) => (
            <ThemeTokenRow key={token.id} token={token} state={state} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
