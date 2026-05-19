import { ArrowRightLeft, Minus, Pencil, Plus } from 'lucide-react'

import type { ChangedFile } from '../types'
import { openDiff } from '../state/open-diff'

const STATUS_ICON: Record<
  ChangedFile['status'],
  { icon: React.ElementType; className: string }
> = {
  added: { icon: Plus, className: 'text-green-500' },
  untracked: { icon: Plus, className: 'text-green-500' },
  modified: { icon: Pencil, className: 'text-amber-500' },
  deleted: { icon: Minus, className: 'text-red-500' },
  renamed: { icon: ArrowRightLeft, className: 'text-blue-400' },
}

export function ChangedFileRow({ file }: { file: ChangedFile }) {
  const { icon: Icon, className: iconClass } = STATUS_ICON[file.status]

  const label =
    file.status === 'renamed' && file.oldPath
      ? `${file.oldPath} → ${file.path}`
      : file.path

  return (
    <button
      type="button"
      onClick={() => openDiff(file.path)}
      className="hover:bg-sidebar-accent flex h-6 w-full items-center gap-1.5 px-2 text-left"
    >
      <Icon className={`size-3 shrink-0 ${iconClass}`} strokeWidth={2} />
      <span className="min-w-0 flex-1 truncate text-[12px] text-foreground/85">
        {label}
      </span>
      <span className="shrink-0 tabular-nums text-[10.5px]">
        {file.additions > 0 && (
          <span className="text-green-500">+{file.additions}</span>
        )}
        {file.additions > 0 && file.deletions > 0 && (
          <span className="text-muted-foreground/40"> </span>
        )}
        {file.deletions > 0 && (
          <span className="text-red-500">-{file.deletions}</span>
        )}
      </span>
    </button>
  )
}
