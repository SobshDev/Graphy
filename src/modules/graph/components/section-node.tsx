import type { NodeProps } from '@xyflow/react'
import { memo } from 'react'

import type { SectionNodeData } from '@/modules/graph/types'

type SectionNodeProps = NodeProps & { data: SectionNodeData }

function SectionNodeImpl({ data, selected }: SectionNodeProps) {
  return (
    <div
      className={`border-border/90 bg-card/25 relative h-full w-full rounded-md border ${
        selected ? 'border-primary bg-card/35' : ''
      }`}
      style={{ width: data.width, height: data.height }}
      title={`${data.label} · ${data.subtitle}`}
    />
  )
}

export const SectionNode = memo(SectionNodeImpl)
