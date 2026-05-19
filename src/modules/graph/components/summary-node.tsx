import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Layers } from 'lucide-react'
import { memo } from 'react'

import type { SummaryNodeData } from '@/modules/graph/types'

type SummaryNodeProps = NodeProps & { data: SummaryNodeData }

function SummaryNodeImpl({ data, selected }: SummaryNodeProps) {
  return (
    <div
      className={`graph-node-surface border-border relative flex w-[240px] flex-col overflow-hidden rounded-md border border-dashed ${
        selected ? 'border-primary' : ''
      }`}
      title={`${data.count} symbols across ${data.fileCount} files`}
    >
      <span
        aria-hidden
        className="bg-muted-foreground/50 absolute inset-y-0 left-0 w-[3px]"
      />

      <div className="flex flex-col gap-1 px-3 py-2 pl-4">
        <div className="flex items-center gap-1.5 font-mono">
          <Layers
            className="text-muted-foreground size-3 shrink-0"
            strokeWidth={1.8}
          />
          <span className="text-foreground truncate text-[13px] font-semibold">
            {data.label}
          </span>
        </div>

        <div className="text-muted-foreground/80 truncate font-mono text-[10.5px]">
          {data.subtitle}
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!h-0 !w-0 !border-0 !bg-transparent !opacity-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-0 !w-0 !border-0 !bg-transparent !opacity-0"
      />
    </div>
  )
}

export const SummaryNode = memo(SummaryNodeImpl)
