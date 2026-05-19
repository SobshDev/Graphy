import { forwardRef, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react'

import { getDesktop } from '@/shared/lib/desktop'
import { cn } from '@/shared/lib/utils'

import { getFileIcon } from '../lib/file-icon'
import { useFileTreeActions } from '../lib/file-tree-context'
import { closeFile, openFile, useOpenFile } from '../lib/open-file'
import type { FileNode } from '../types'

const DRAG_MIME = 'application/x-graphy-path'

type Props = {
  node: FileNode
  depth: number
}

export function FileTreeNode({ node, depth }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const currentFile = useOpenFile()
  const { openContextMenu, renamingPath, clearRename, refresh, moveNode } =
    useFileTreeActions()

  const { expandAll, collapseAll } = useFileTreeActions()

  const isRenaming = renamingPath === node.path

  useEffect(() => {
    if (expandAll > 0 && node.kind === 'dir') setExpanded(true)
  }, [expandAll, node.kind])

  useEffect(() => {
    if (collapseAll > 0 && node.kind === 'dir') setExpanded(false)
  }, [collapseAll, node.kind])

  useEffect(() => {
    if (!isRenaming) return
    setRenameValue(node.name)
    requestAnimationFrame(() => {
      const input = inputRef.current
      if (!input) return
      input.focus()
      const dotIndex = node.name.lastIndexOf('.')
      input.setSelectionRange(0, dotIndex > 0 ? dotIndex : node.name.length)
    })
  }, [isRenaming, node.name])

  const commitRename = async () => {
    clearRename()
    const trimmed = renameValue.trim()
    if (!trimmed || trimmed === node.name) return
    const desktop = getDesktop()
    if (!desktop) return
    try {
      const { newPath } = await desktop.renameFile(node.path, trimmed)
      if (currentFile?.path === node.path) {
        closeFile()
        await openFile(newPath, trimmed)
      }
      refresh()
    } catch {
      /* rename failed */
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    openContextMenu(e, node)
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(DRAG_MIME, node.path)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (node.kind !== 'dir') return
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    setDragOver(false)
    if (node.kind !== 'dir') return
    const sourcePath = e.dataTransfer.getData(DRAG_MIME)
    if (!sourcePath) return
    e.preventDefault()
    if (sourcePath === node.path) return
    if (sourcePath.startsWith(node.path + '/')) return
    await moveNode(sourcePath, node.path)
  }

  if (node.kind === 'dir') {
    const Icon = expanded ? FolderOpen : Folder
    const Chevron = expanded ? ChevronDown : ChevronRight
    return (
      <>
        <Row
          depth={depth}
          dropTarget={dragOver}
          dimmed={node.ignored}
          onClick={() => setExpanded((v) => !v)}
          onContextMenu={handleContextMenu}
          draggable
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Chevron
            className="text-muted-foreground/60 size-3 shrink-0"
            strokeWidth={1.8}
          />
          <Icon
            className="text-muted-foreground size-3.5 shrink-0"
            strokeWidth={1.6}
          />
          {isRenaming ? (
            <RenameInput
              ref={inputRef}
              value={renameValue}
              onChange={setRenameValue}
              onCommit={commitRename}
              onCancel={clearRename}
            />
          ) : (
            <span className="truncate">{node.name}</span>
          )}
        </Row>
        {expanded &&
          node.children?.map((child) => (
            <FileTreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
      </>
    )
  }

  const isActive = currentFile?.path === node.path
  const FileIcon = getFileIcon(node.name)

  return (
    <Row
      depth={depth}
      active={isActive}
      dimmed={node.ignored}
      onClick={() => {
        if (!isRenaming) openFile(node.path, node.name)
      }}
      onContextMenu={handleContextMenu}
      draggable
      onDragStart={handleDragStart}
    >
      <span className="w-3 shrink-0" />
      <FileIcon
        className="text-muted-foreground size-3.5 shrink-0"
        strokeWidth={1.6}
      />
      {isRenaming ? (
        <RenameInput
          ref={inputRef}
          value={renameValue}
          onChange={setRenameValue}
          onCommit={commitRename}
          onCancel={clearRename}
        />
      ) : (
        <span className="truncate">{node.name}</span>
      )}
    </Row>
  )
}

const RenameInput = forwardRef<
  HTMLInputElement,
  {
    value: string
    onChange: (v: string) => void
    onCommit: () => void
    onCancel: () => void
  }
>(function ({ value, onChange, onCommit, onCancel }, ref) {
  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onCommit()
        if (e.key === 'Escape') onCancel()
        e.stopPropagation()
      }}
      onClick={(e) => e.stopPropagation()}
      className="bg-input text-foreground min-w-0 flex-1 rounded px-1 py-0 text-[12px] outline-none ring-1 ring-blue-500"
    />
  )
})

RenameInput.displayName = 'RenameInput'

function Row({
  depth,
  active,
  dropTarget,
  dimmed,
  onClick,
  onContextMenu,
  draggable,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  children,
}: {
  depth: number
  active?: boolean
  dropTarget?: boolean
  dimmed?: boolean
  onClick: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: () => void
  onDrop?: (e: React.DragEvent) => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{ paddingLeft: 8 + depth * 12 }}
      className={cn(
        'flex w-full items-center gap-1.5 py-1 pr-2 text-left text-[12px] outline-none',
        dropTarget
          ? 'bg-primary/15 text-foreground'
          : active
            ? 'bg-sidebar-accent text-foreground'
            : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
        dimmed && !active && !dropTarget && 'opacity-45',
      )}
    >
      {children}
    </button>
  )
}
