import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { memo } from 'react'

import { colorForDepth } from '@/modules/graph/lib/depth-color'
import type { FileNodeData } from '@/modules/graph/types'

type FileNodeProps = NodeProps & { data: FileNodeData }

function FileNodeImpl({ data }: FileNodeProps) {
  const colors = colorForDepth(data.depth)

  return (
    <div
      className="graph-node-surface relative flex w-[240px] flex-col overflow-hidden rounded-md"
      title={data.file}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: colors.accent }}
      />

      <div className="flex flex-col gap-1 px-3 py-2 pl-4">
        <div className="text-foreground truncate font-mono text-[13px] font-semibold">
          {data.displayName}
        </div>
        <div className="text-muted-foreground/80 flex items-center gap-2 truncate font-mono text-[10.5px]">
          <span className="truncate">{data.folder || '/'}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{data.symbolCount} sym</span>
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

export const FileNode = memo(FileNodeImpl)
