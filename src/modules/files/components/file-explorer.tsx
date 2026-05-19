import { useCallback, useMemo, useRef, useState } from 'react'
import {
  ChevronsDownUp,
  ChevronsUpDown,
  FilePlus,
  FolderOpen,
  FolderPlus,
} from 'lucide-react'

import { usePanelResize } from '@/shared/hooks/use-panel-resize'
import { useActivePanel } from '@/shared/lib/active-panel'
import { getDesktop } from '@/shared/lib/desktop'
import type { FileNode } from '@/shared/lib/desktop'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

import { useFileTree } from '../hooks/use-file-tree'
import { useGitFileStatus } from '../hooks/use-git-file-status'
import type { ContextMenuState } from '../lib/file-tree-context'
import { FileTreeContext } from '../lib/file-tree-context'
import { FileContextMenu } from './file-context-menu'
import { FileTreeNode } from './file-tree-node'
import { NewEntryInput } from './new-entry-input'

type NewEntry = { kind: 'file' | 'dir' } | null

export function FileExplorer() {
  const open = useActivePanel() === 'files'
  const { refresh: refreshTree, ...state } = useFileTree()
  const tree = state.status === 'ready' ? state.tree : null
  const { statusMap: gitStatusMap, refresh: refreshGitStatus } =
    useGitFileStatus(tree)
  const refresh = useCallback(() => {
    refreshTree()
    refreshGitStatus()
  }, [refreshTree, refreshGitStatus])
  const [menu, setMenu] = useState<ContextMenuState>(null)
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [newEntry, setNewEntry] = useState<NewEntry>(null)
  const newInputRef = useRef<HTMLInputElement>(null)
  const [expandAll, setExpandAll] = useState(0)
  const [collapseAll, setCollapseAll] = useState(0)
  const resize = usePanelResize({
    defaultWidth: 288,
    minWidth: 200,
    maxWidth: 560,
  })

  const openContextMenu = useCallback((e: React.MouseEvent, node: FileNode) => {
    e.preventDefault()
    setMenu({ node, x: e.clientX, y: e.clientY })
  }, [])

  const startRename = useCallback((path: string) => {
    setMenu(null)
    setRenamingPath(path)
  }, [])

  const clearRename = useCallback(() => {
    setRenamingPath(null)
  }, [])

  const moveNode = useCallback(
    async (sourcePath: string, destDir: string) => {
      const desktop = getDesktop()
      if (!desktop) return
      try {
        await desktop.moveFile(sourcePath, destDir)
      } catch (err) {
        console.error('Failed to move:', err)
      }
      refresh()
    },
    [refresh],
  )

  const actions = useMemo(
    () => ({
      refresh,
      openContextMenu,
      renamingPath,
      startRename,
      clearRename,
      moveNode,
      expandAll,
      collapseAll,
      gitStatusMap,
    }),
    [
      refresh,
      openContextMenu,
      renamingPath,
      startRename,
      clearRename,
      moveNode,
      expandAll,
      collapseAll,
      gitStatusMap,
    ],
  )

  const startNew = (kind: 'file' | 'dir') => {
    setNewEntry({ kind })
    requestAnimationFrame(() => newInputRef.current?.focus())
  }

  const commitNew = async (name: string) => {
    const entry = newEntry
    if (!entry) return
    setNewEntry(null)
    const trimmed = name.trim()
    if (!trimmed) return
    const desktop = getDesktop()
    if (!desktop) return
    try {
      if (entry.kind === 'file') {
        await desktop.createFile(trimmed)
      } else {
        await desktop.createDir(trimmed)
      }
    } catch (err) {
      console.error('Failed to create entry:', err)
    }
    refresh()
  }

  if (!open) return null

  const hasFolder = state.status === 'ready'

  return (
    <FileTreeContext value={actions}>
      <aside
        className="bg-sidebar border-sidebar-border relative flex shrink-0 flex-col border-r"
        style={{ width: resize.width }}
      >
        <div
          role="separator"
          aria-label="Resize files panel"
          aria-orientation="vertical"
          aria-valuemin={resize.minWidth}
          aria-valuemax={resize.maxWidth}
          aria-valuenow={resize.width}
          tabIndex={0}
          onPointerDown={resize.beginResize}
          className="app-no-drag absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize touch-none outline-none before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-transparent before:transition-colors hover:before:bg-sidebar-border focus-visible:before:bg-primary"
        />
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-muted-foreground/70 text-[11px] font-medium uppercase tracking-wider">
            Explorer
          </span>
          {hasFolder && (
            <div className="flex items-center gap-0.5">
              <ToolbarBtn
                icon={FilePlus}
                tip="New file"
                onClick={() => startNew('file')}
              />
              <ToolbarBtn
                icon={FolderPlus}
                tip="New folder"
                onClick={() => startNew('dir')}
              />
              <ToolbarBtn
                icon={ChevronsUpDown}
                tip="Expand all"
                onClick={() => setExpandAll((n) => n + 1)}
              />
              <ToolbarBtn
                icon={ChevronsDownUp}
                tip="Collapse all"
                onClick={() => setCollapseAll((n) => n + 1)}
              />
            </div>
          )}
        </div>
        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto pb-2">
          {newEntry && (
            <NewEntryInput
              ref={newInputRef}
              kind={newEntry.kind}
              onCommit={commitNew}
              onCancel={() => setNewEntry(null)}
            />
          )}
          {state.status === 'loading' && (
            <div className="text-muted-foreground/60 px-3 py-2 text-[12px]">
              Loading…
            </div>
          )}
          {state.status === 'error' && (
            <div className="text-muted-foreground/60 px-3 py-2 text-[12px]">
              Failed to load files
            </div>
          )}
          {state.status === 'idle' && (
            <button
              type="button"
              onClick={() => getDesktop()?.openFolder()}
              className="text-muted-foreground hover:text-foreground mx-3 mt-4 flex flex-col items-center gap-2 text-[12px]"
            >
              <FolderOpen className="size-8 opacity-40" strokeWidth={1.2} />
              <span>Open a folder</span>
            </button>
          )}
          {state.status === 'ready' &&
            state.tree.children?.map((child) => (
              <FileTreeNode key={child.path} node={child} depth={0} />
            ))}
        </div>
      </aside>
      {menu && (
        <FileContextMenu
          node={menu.node}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          onRefresh={refresh}
          onRename={() => startRename(menu.node.path)}
        />
      )}
    </FileTreeContext>
  )
}

function ToolbarBtn({
  icon: Icon,
  tip,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  tip: string
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className="text-muted-foreground hover:text-foreground rounded p-0.5"
        >
          <Icon className="size-3.5" strokeWidth={1.6} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tip}</TooltipContent>
    </Tooltip>
  )
}
