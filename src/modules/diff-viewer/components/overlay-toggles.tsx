import {
  ArrowLeftToLine,
  ArrowRightFromLine,
  Eye,
  Sparkles,
} from 'lucide-react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

import { useDiffOverlay } from '../hooks/use-diff-overlay'
import { toggleDiffOverlayLayer } from '../state/diff-overlay'
import type { DiffOverlayState } from '../types'

type LayerKey = 'changed' | 'callers' | 'callees' | 'dimOthers'

const LAYERS: Array<{
  key: LayerKey
  icon: React.ElementType
  label: string
}> = [
  { key: 'changed', icon: Sparkles, label: 'Changed nodes' },
  { key: 'callers', icon: ArrowLeftToLine, label: 'Impacted callers' },
  { key: 'callees', icon: ArrowRightFromLine, label: 'Impacted callees' },
  { key: 'dimOthers', icon: Eye, label: 'Dim unrelated' },
]

export function OverlayToggles() {
  const overlay = useDiffOverlay()

  if (!overlay.active) return null

  return (
    <div className="border-sidebar-border/60 flex items-center gap-1 border-b px-2 py-1.5">
      {LAYERS.map(({ key, icon: Icon, label }) => {
        const active = overlay[key as keyof DiffOverlayState]
        return (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => toggleDiffOverlayLayer(key)}
                className={`rounded p-1 transition-colors ${
                  active
                    ? 'bg-sidebar-accent text-foreground'
                    : 'text-muted-foreground/60 hover:text-muted-foreground'
                }`}
                aria-pressed={active}
                aria-label={label}
              >
                <Icon className="size-3.5" strokeWidth={1.8} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{label}</TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
