import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { memo } from 'react'

import type { NodeType } from '@/modules/parser'
import type { CodeNodeData } from '@/modules/graph/types'

type CodeNodeProps = NodeProps & { data: CodeNodeData }

const TYPE_LABEL: Record<NodeType, string> = {
  function: 'fn',
  arrow: 'fn',
  method: 'm',
  class: 'cls',
}

function CodeNodeImpl({ data, selected }: CodeNodeProps) {
  const accent = typeAccent(data.type)
  const fileShort = data.file.split('/').slice(-2).join('/')

  return (
    <div
      className={`glass relative flex w-[240px] flex-col overflow-hidden rounded-md border shadow-sm transition-shadow ${
        selected
          ? 'border-primary shadow-[0_0_0_1px_var(--primary)]'
          : 'border-border'
      } ${data.isExported ? '' : 'border-dashed'}`}
      title={`${data.file}:${data.line}`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-[3px] ${accent.bar}`}
      />

      <div className="flex flex-col gap-1 px-3 py-2 pl-4">
        <div className="flex items-baseline gap-1.5 font-mono">
          <span
            className={`shrink-0 text-[10px] uppercase tracking-wider ${accent.label}`}
          >
            {TYPE_LABEL[data.type]}
          </span>
          <span className="text-foreground truncate text-[13px] font-semibold">
            {data.displayName}
          </span>
          <span className="text-muted-foreground truncate text-[11.5px]">
            {data.signature}
          </span>
        </div>

        <div className="text-muted-foreground/80 truncate font-mono text-[10.5px]">
          {fileShort}:{data.line}
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

function typeAccent(type: NodeType): { bar: string; label: string } {
  switch (type) {
    case 'class':
      return { bar: 'bg-node-class', label: 'text-node-class-fg' }
    case 'method':
      return { bar: 'bg-node-method', label: 'text-node-method' }
    case 'arrow':
      return { bar: 'bg-node-arrow', label: 'text-node-arrow' }
    case 'function':
    default:
      return { bar: 'bg-primary', label: 'text-primary' }
  }
}

export const CodeNode = memo(CodeNodeImpl)
