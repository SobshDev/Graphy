import type { NodeProps } from '@xyflow/react'
import { CornerRightDown } from 'lucide-react'
import { memo } from 'react'

import type { SectionNodeData } from '@/modules/graph/types'

type SectionNodeProps = NodeProps & { data: SectionNodeData }

function SectionNodeImpl({ data, selected }: SectionNodeProps) {
  return (
    <div
      className={`border-border/70 bg-card/15 relative h-full w-full rounded-md border border-dashed ${
        selected ? 'border-primary' : ''
      }`}
      style={{ width: data.width, height: data.height }}
    >
      <div className="border-border/60 bg-background absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-sm border px-2.5 py-1.5 font-mono">
        <CornerRightDown
          className="text-muted-foreground size-3 shrink-0"
          strokeWidth={1.8}
        />
        <div className="min-w-0">
          <div className="text-foreground truncate text-[11px] font-semibold">
            {data.label}
          </div>
          <div className="text-muted-foreground truncate text-[9.5px]">
            {data.subtitle}
          </div>
        </div>
      </div>
    </div>
  )
}

export const SectionNode = memo(SectionNodeImpl)
