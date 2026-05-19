import { Network, Orbit } from 'lucide-react'

import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

import type { GraphLayout } from '@/modules/graph/types'

type Props = {
  value: GraphLayout
  onChange: (layout: GraphLayout) => void
}

export function LayoutSelector({ value, onChange }: Props) {
  return (
    <div className="glass border-border absolute right-4 top-4 z-20 flex items-center overflow-hidden rounded-lg border">
      <LayoutBtn
        active={value === 'tree'}
        tip="Tree layout"
        onClick={() => onChange('tree')}
      >
        <Network className="size-3.5 -rotate-90" strokeWidth={1.7} />
      </LayoutBtn>
      <div className="flex h-4 items-center">
        <Separator orientation="vertical" />
      </div>
      <LayoutBtn
        active={value === 'radial'}
        tip="Radial layout"
        onClick={() => onChange('radial')}
      >
        <Orbit className="size-3.5" strokeWidth={1.7} />
      </LayoutBtn>
    </div>
  )
}

function LayoutBtn({
  active,
  tip,
  onClick,
  children,
}: {
  active: boolean
  tip: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-pressed={active}
          onClick={onClick}
          className={
            active
              ? 'bg-accent text-foreground rounded-none'
              : 'text-muted-foreground rounded-none'
          }
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tip}</TooltipContent>
    </Tooltip>
  )
}
