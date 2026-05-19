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
      className="flex h-8 items-center gap-2 rounded-md border px-2.5"
      style={{
        borderColor: colors.accent,
        backgroundColor: colors.surface,
      }}
      title={data.path || '/'}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-0 !w-0 !border-0 !bg-transparent !opacity-0"
      />
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: colors.accent }}
      />
      <span
        className="truncate font-mono text-[12px] font-medium"
        style={{ color: colors.label }}
      >
        {data.name || '/'}
      </span>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-0 !w-0 !border-0 !bg-transparent !opacity-0"
      />
    </div>
  )
}

export const FolderNode = memo(FolderNodeImpl)
