import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { memo } from 'react'

import type { NodeType } from '@/modules/parser'
import type { CodeNodeData } from '@/modules/graph/types'
import { useDiffOverlay, useNodeDiffStatus } from '@/modules/diff-viewer'

type CodeNodeProps = NodeProps & { data: CodeNodeData }

const TYPE_LABEL: Record<NodeType, string> = {
  file: 'file',
  route: 'route',
  component: 'cmp',
  hook: 'hook',
  function: 'fn',
  arrow: 'fn',
  method: 'm',
  class: 'cls',
  object: 'obj',
  constructor: 'ctor',
  getter: 'get',
  setter: 'set',
}

function CodeNodeImpl({ id, data, selected }: CodeNodeProps) {
  const accent = typeAccent(data.type)
  const fileShort = data.file.split('/').slice(-2).join('/')
  const status = useNodeDiffStatus(id)
  const overlay = useDiffOverlay()

  const diffBarClass = diffAccentBar(overlay, status)
  const ringClass = diffRing(overlay, status)
  const dimmed = overlay.active && overlay.dimOthers && !status

  return (
    <div
      className={`graph-node-surface relative flex w-[240px] flex-col overflow-hidden rounded-md border ${
        selected ? 'border-primary' : 'border-border'
      } ${data.isExported ? '' : 'border-dashed'} ${ringClass} ${dimmed ? 'opacity-30' : ''}`}
      title={`${data.file}:${data.line}`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-[3px] ${diffBarClass ?? accent.bar}`}
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

function diffAccentBar(
  overlay: ReturnType<typeof useDiffOverlay>,
  status: ReturnType<typeof useNodeDiffStatus>,
): string | null {
  if (!overlay.active) return null
  if (overlay.changed && status?.status === 'added')
    return 'bg-[color:var(--node-diff-added)]'
  if (overlay.changed && status?.status === 'modified')
    return 'bg-[color:var(--node-diff-modified)]'
  return null
}

function diffRing(
  overlay: ReturnType<typeof useDiffOverlay>,
  status: ReturnType<typeof useNodeDiffStatus>,
): string {
  if (!overlay.active) return ''
  if (overlay.callers && status?.impact === 'caller')
    return 'ring-2 ring-[color:var(--node-diff-caller)]'
  if (overlay.callees && status?.impact === 'callee')
    return 'ring-2 ring-[color:var(--node-diff-callee)]'
  return ''
}

function typeAccent(type: NodeType): { bar: string; label: string } {
  switch (type) {
    case 'file':
      return { bar: 'bg-muted-foreground', label: 'text-muted-foreground' }
    case 'route':
      return { bar: 'bg-rose-500', label: 'text-rose-500' }
    case 'component':
      return { bar: 'bg-node-class', label: 'text-node-class-fg' }
    case 'hook':
      return { bar: 'bg-node-arrow', label: 'text-node-arrow' }
    case 'class':
    case 'object':
      return { bar: 'bg-node-class', label: 'text-node-class-fg' }
    case 'method':
    case 'constructor':
      return { bar: 'bg-node-method', label: 'text-node-method' }
    case 'getter':
    case 'setter':
      return { bar: 'bg-node-accessor', label: 'text-node-accessor' }
    case 'arrow':
      return { bar: 'bg-node-arrow', label: 'text-node-arrow' }
    case 'function':
    default:
      return { bar: 'bg-primary', label: 'text-primary' }
  }
}

export const CodeNode = memo(CodeNodeImpl)
