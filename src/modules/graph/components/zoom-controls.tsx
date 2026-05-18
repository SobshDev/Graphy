import { useReactFlow, useStore } from '@xyflow/react'
import { Maximize2, Minus, Plus } from 'lucide-react'

import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

export function ZoomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const zoom = useStore((s) => s.transform[2])

  return (
    <div className="glass border-border absolute bottom-4 right-4 flex items-center overflow-hidden rounded-lg border">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-none"
            onClick={() => zoomOut({ duration: 200 })}
          >
            <Minus className="size-3.5" strokeWidth={2} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom out</TooltipContent>
      </Tooltip>

      <div className="text-foreground select-none px-2 font-mono text-[11px] tabular-nums">
        {Math.round(zoom * 100)}%
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-none"
            onClick={() => zoomIn({ duration: 200 })}
          >
            <Plus className="size-3.5" strokeWidth={2} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom in</TooltipContent>
      </Tooltip>

      <div className="flex h-4 items-center">
        <Separator orientation="vertical" />
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-none"
            onClick={() => fitView({ padding: 0.25, duration: 200 })}
          >
            <Maximize2 className="size-3" strokeWidth={1.7} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Fit to view</TooltipContent>
      </Tooltip>
    </div>
  )
}
