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

      <div className="border-border/60 text-muted-foreground/90 flex items-center gap-2 border-t border-dashed px-3 py-1 pl-4 font-mono text-[10px]">
        <span title="callers">← {data.inDegree}</span>
        <span title="callees">→ {data.outDegree}</span>
        <span className="text-muted-foreground/60">·</span>
        <span title="body length">{data.bodyLines} ln</span>

        <span className="ml-auto flex items-center gap-1.5">
          {data.isAsync && <Flag tone="primary">async</Flag>}
          {data.isStatic && <Flag>static</Flag>}
        </span>
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

function Flag({
  children,
  tone = 'default',
}: {
  children: React.ReactNode
  tone?: 'default' | 'primary'
}) {
  const toneClass =
    tone === 'primary'
      ? 'bg-primary/15 text-primary'
      : 'bg-muted text-foreground/70'
  return (
    <span
      className={`rounded-sm px-1.5 py-px text-[9.5px] uppercase tracking-wide ${toneClass}`}
    >
      {children}
    </span>
  )
}

function typeAccent(type: NodeType): { bar: string; label: string } {
  switch (type) {
    case 'class':
      return { bar: 'bg-amber-500', label: 'text-amber-600' }
    case 'method':
      return { bar: 'bg-violet-500', label: 'text-violet-500' }
    case 'arrow':
      return { bar: 'bg-sky-500', label: 'text-sky-500' }
    case 'function':
    default:
      return { bar: 'bg-primary', label: 'text-primary' }
  }
}

export const CodeNode = memo(CodeNodeImpl)
