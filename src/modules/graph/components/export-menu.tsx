import { useReactFlow } from '@xyflow/react'
import { Download } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

import { exportGraphImage } from '../lib/export-graph'
import type { ExportFormat } from '../lib/export-graph'

function buildFilename(folder: string | null, format: ExportFormat) {
  const base = folder?.split(/[\\/]/).filter(Boolean).pop() ?? 'graph'
  const stamp = new Date().toISOString().slice(0, 10)
  return `${base}-graph-${stamp}.${format}`
}

interface Props {
  folder: string | null
  disabled?: boolean
}

export function ExportMenu({ folder, disabled }: Props) {
  const { getNodes } = useReactFlow()
  const [busy, setBusy] = useState(false)

  const handleExport = async (format: ExportFormat) => {
    if (busy) return
    setBusy(true)
    try {
      await exportGraphImage(getNodes(), format, buildFilename(folder, format))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="absolute top-4 right-4 z-20">
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={disabled || busy}
                className="glass border-border h-8 w-8 rounded-lg border"
                aria-label="Export graph"
              >
                <Download className="size-3.5" strokeWidth={1.8} />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="left">Export graph</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuItem onClick={() => void handleExport('png')}>
            Export as PNG
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void handleExport('svg')}>
            Export as SVG
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
