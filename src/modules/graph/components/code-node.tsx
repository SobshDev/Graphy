import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { memo } from 'react'

export type CodeNodeData = {
  label: string
  kind: 'function' | 'module' | 'import'
}

type CodeNodeProps = NodeProps & { data: CodeNodeData }

function CodeNodeImpl({ data, selected }: CodeNodeProps) {
  return (
    <div
      className={`glass border-border min-w-[180px] overflow-hidden rounded-md border shadow-sm transition-shadow ${
        selected ? 'shadow-[0_0_0_1px_var(--primary)]' : ''
      }`}
    >
      <header className="border-border text-muted-foreground flex items-center gap-2 border-b px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em]">
        <span className="bg-primary inline-block size-1.5 rounded-full" />
        {data.kind}
      </header>
      <div className="text-foreground px-3 py-2 font-mono text-[12.5px]">
        {data.label}
      </div>

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

export const CodeNode = memo(CodeNodeImpl)
