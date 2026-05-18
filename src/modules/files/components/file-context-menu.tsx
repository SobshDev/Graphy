import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ClipboardCopy, Pencil, Trash2 } from 'lucide-react'

import { getDesktop } from '@/shared/lib/desktop'
import type { FileNode } from '@/shared/lib/desktop'
import { cn } from '@/shared/lib/utils'

import { closeFile, useOpenFile } from '../lib/open-file'

type Props = {
  node: FileNode
  x: number
  y: number
  onClose: () => void
  onRefresh: () => void
  onRename: () => void
}

export function FileContextMenu({
  node,
  x,
  y,
  onClose,
  onRefresh,
  onRename,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null)
  const currentFile = useOpenFile()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handler, true)
    document.addEventListener('contextmenu', handler, true)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handler, true)
      document.removeEventListener('contextmenu', handler, true)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const handleDelete = () => {
    onClose()
    const desktop = getDesktop()
    if (!desktop) return
    desktop.deleteFile(node.path).then(() => {
      if (currentFile?.path === node.path) closeFile()
      onRefresh()
    })
  }

  const handleCopyPath = () => {
    navigator.clipboard.writeText(node.path)
    onClose()
  }

  return createPortal(
    <div
      ref={menuRef}
      style={{ top: y, left: x }}
      className="bg-popover text-popover-foreground ring-foreground/10 fixed z-[9999] min-w-40 rounded-md p-1 shadow-md ring-1"
    >
      <MenuItem onClick={onRename}>
        <Pencil className="size-3.5" />
        Rename
      </MenuItem>
      <MenuItem onClick={handleCopyPath}>
        <ClipboardCopy className="size-3.5" />
        Copy path
      </MenuItem>
      <div className="bg-border -mx-1 my-1 h-px" />
      <MenuItem onClick={handleDelete} destructive>
        <Trash2 className="size-3.5" />
        Delete
      </MenuItem>
    </div>,
    document.body,
  )
}

function MenuItem({
  onClick,
  destructive,
  children,
}: {
  onClick: () => void
  destructive?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
        destructive
          ? 'text-destructive hover:bg-destructive/10'
          : 'hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {children}
    </button>
  )
}
