import { Check } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

import { themeTokenById } from '../data/tokens'
import type { ResolvedMode, ThemePreset } from '../types'

type ThemePresetCardProps = {
  preset: ThemePreset
  mode: ResolvedMode
  selected: boolean
  onSelect: () => void
}

function tokenFromPreset(
  preset: ThemePreset,
  id: string,
  mode: ResolvedMode,
): string {
  return preset[mode][id] ?? themeTokenById.get(id)?.[mode] ?? '#000'
}

export function ThemePresetCard({
  preset,
  mode,
  selected,
  onSelect,
}: ThemePresetCardProps) {
  const bg = tokenFromPreset(preset, 'background', mode)
  const card = tokenFromPreset(preset, 'card', mode)
  const foreground = tokenFromPreset(preset, 'foreground', mode)
  const muted = tokenFromPreset(preset, 'muted-foreground', mode)
  const primary = preset.accent[mode]

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'group relative flex flex-col gap-2 rounded-lg border p-2.5 text-left transition-all outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-foreground/30 bg-card/30',
      )}
    >
      <div
        className="relative flex h-[68px] items-stretch overflow-hidden rounded-md border border-border/60"
        style={{ background: bg }}
      >
        <div
          className="w-1/3 border-r border-border/40"
          style={{ background: card }}
        />
        <div className="flex flex-1 flex-col justify-between px-2 py-2">
          <div
            className="h-1.5 w-2/3 rounded-full"
            style={{ background: foreground, opacity: 0.85 }}
          />
          <div className="flex items-center gap-1">
            <span
              className="size-2.5 rounded-full"
              style={{ background: primary }}
            />
            <div
              className="h-1 flex-1 rounded-full"
              style={{ background: muted, opacity: 0.4 }}
            />
          </div>
        </div>
        {selected ? (
          <span className="bg-primary text-primary-foreground absolute right-1.5 top-1.5 inline-flex size-4 items-center justify-center rounded-full">
            <Check size={10} strokeWidth={3} />
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-foreground text-[12.5px] font-medium tracking-tight">
          {preset.label}
        </span>
        <span className="text-muted-foreground text-[11px] leading-snug">
          {preset.blurb}
        </span>
      </div>
    </button>
  )
}
