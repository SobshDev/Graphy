import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
} from 'lucide-react'

import { cn } from '@/shared/lib/utils'

import type { FileNode } from '../types'

type Props = {
  node: FileNode
  depth: number
}

export function FileTreeNode({ node, depth }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (node.kind === 'dir') {
    const Icon = expanded ? FolderOpen : Folder
    const Chevron = expanded ? ChevronDown : ChevronRight
    return (
      <>
        <Row depth={depth} onClick={() => setExpanded((v) => !v)}>
          <Chevron
            className="text-muted-foreground/60 size-3 shrink-0"
            strokeWidth={1.8}
          />
          <Icon
            className="text-muted-foreground size-3.5 shrink-0"
            strokeWidth={1.6}
          />
          <span className="truncate">{node.name}</span>
        </Row>
        {expanded &&
          node.children?.map((child) => (
            <FileTreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
      </>
    )
  }

  return (
    <Row depth={depth} onClick={() => {}}>
      <span className="w-3 shrink-0" />
      <File
        className="text-muted-foreground/70 size-3.5 shrink-0"
        strokeWidth={1.6}
      />
      <span className="truncate">{node.name}</span>
    </Row>
  )
}

function Row({
  depth,
  onClick,
  children,
}: {
  depth: number
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ paddingLeft: 8 + depth * 12 }}
      className={cn(
        'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
        'flex w-full items-center gap-1.5 py-1 pr-2 text-left text-[12px] outline-none',
      )}
    >
      {children}
    </button>
  )
}
