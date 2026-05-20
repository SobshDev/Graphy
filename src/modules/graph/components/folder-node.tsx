import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { memo } from 'react'

import { colorForDepth } from '@/modules/graph/lib/depth-color'
import type { FolderNodeData } from '@/modules/graph/types'

type FolderNodeProps = NodeProps & { data: FolderNodeData }

function FolderNodeImpl({ data }: FolderNodeProps) {
  const colors = colorForDepth(data.depth)

  return (
    <div
      className="bg-background relative flex h-8 items-center gap-2 rounded-md border px-2.5"
      style={{ borderColor: colors.accent }}
      title={data.path || '/'}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-md"
        style={{ backgroundColor: colors.surface }}
      />
      <Handle
        type="target"
        position={Position.Left}
        style={
          data.layout === 'radial' ? { left: '50%', top: '50%' } : undefined
        }
        className="!h-0 !w-0 !border-0 !bg-transparent !opacity-0"
      />
      <span
        aria-hidden
        className="relative size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: colors.accent }}
      />
      <span className="text-foreground relative truncate font-mono text-[12px] font-medium">
        {data.name || '/'}
      </span>
      <Handle
        type="source"
        position={Position.Right}
        style={
          data.layout === 'radial' ? { left: '50%', top: '50%' } : undefined
        }
        className="!h-0 !w-0 !border-0 !bg-transparent !opacity-0"
      />
    </div>
  )
}

export const FolderNode = memo(FolderNodeImpl)
