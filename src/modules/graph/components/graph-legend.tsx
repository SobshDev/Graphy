import { Info } from 'lucide-react'
import { useState } from 'react'

import type { NodeType } from '@/modules/parser'
import { Button } from '@/shared/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

const LEGEND_ITEMS: { type: NodeType; abbr: string; label: string }[] = [
  { type: 'component', abbr: 'cmp', label: 'Component' },
  { type: 'hook', abbr: 'hook', label: 'Hook' },
  { type: 'function', abbr: 'fn', label: 'Function' },
  { type: 'arrow', abbr: 'fn', label: 'Arrow function' },
  { type: 'class', abbr: 'cls', label: 'Class' },
  { type: 'object', abbr: 'obj', label: 'Object literal' },
  { type: 'method', abbr: 'm', label: 'Method' },
  { type: 'constructor', abbr: 'ctor', label: 'Constructor' },
  { type: 'getter', abbr: 'get', label: 'Getter' },
  { type: 'setter', abbr: 'set', label: 'Setter' },
]

function accentColor(type: NodeType): string {
  switch (type) {
    case 'component':
    case 'class':
    case 'object':
      return 'bg-amber-500'
    case 'hook':
    case 'method':
    case 'constructor':
      return 'bg-violet-500'
    case 'getter':
    case 'setter':
      return 'bg-teal-500'
    case 'arrow':
      return 'bg-sky-500'
    case 'function':
    default:
      return 'bg-primary'
  }
}

function labelColor(type: NodeType): string {
  switch (type) {
    case 'component':
    case 'class':
    case 'object':
      return 'text-amber-600'
    case 'hook':
    case 'method':
    case 'constructor':
      return 'text-violet-500'
    case 'getter':
    case 'setter':
      return 'text-teal-500'
    case 'arrow':
      return 'text-sky-500'
    case 'function':
    default:
      return 'text-primary'
  }
}

export function GraphLegend() {
  const [open, setOpen] = useState(false)

  return (
    <div className="absolute bottom-16 right-4 z-20 flex flex-col items-end gap-2">
      {open && (
        <div className="glass border-border flex flex-col gap-1 rounded-lg border p-2">
          {LEGEND_ITEMS.map((item) => (
            <div
              key={item.type}
              className="flex items-center gap-2 px-1.5 py-0.5"
            >
              <span
                className={`h-3 w-[3px] shrink-0 rounded-full ${accentColor(item.type)}`}
              />
              <span
                className={`w-7 shrink-0 font-mono text-[10px] uppercase tracking-wider ${labelColor(item.type)}`}
              >
                {item.abbr}
              </span>
              <span className="text-muted-foreground font-mono text-[11px]">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="glass border-border rounded-lg border"
            onClick={() => setOpen((v) => !v)}
          >
            <Info className="size-3.5" strokeWidth={1.8} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Node legend</TooltipContent>
      </Tooltip>
    </div>
  )
}
