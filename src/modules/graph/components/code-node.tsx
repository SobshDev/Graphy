import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { memo } from 'react'

import type { NodeType } from '@/modules/parser'

export type CodeNodeData = {
  name: string
  type: NodeType
  signature: string
  file: string
  line: number
}

type CodeNodeProps = NodeProps & { data: CodeNodeData }

function CodeNodeImpl({ data, selected }: CodeNodeProps) {
  return (
    <div
      className={`glass border-border min-w-[200px] max-w-[300px] overflow-hidden rounded-md border shadow-sm transition-shadow ${
        selected ? 'shadow-[0_0_0_1px_var(--primary)]' : ''
      }`}
      title={`${data.file}:${data.line}`}
    >
      <header className="border-border text-muted-foreground flex items-center gap-2 border-b px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em]">
        <span
          className={`inline-block size-1.5 rounded-full ${typeDotClass(data.type)}`}
        />
        {data.type}
      </header>

      <div className="text-foreground px-3 py-2 font-mono text-[12.5px]">
        <div className="truncate">
          <span className="font-semibold">{data.name}</span>
          <span className="text-muted-foreground">{data.signature}</span>
        </div>
      </div>

      <footer className="border-border text-muted-foreground/80 truncate border-t px-3 py-1 font-mono text-[10px]">
        {data.file}:{data.line}
      </footer>

      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-0"
      />
    </div>
  )
}

function typeDotClass(type: NodeType): string {
  switch (type) {
    case 'class':
      return 'bg-amber-500'
    case 'method':
      return 'bg-violet-500'
    case 'arrow':
      return 'bg-sky-500'
    case 'function':
    default:
      return 'bg-primary'
  }
}

export const CodeNode = memo(CodeNodeImpl)
