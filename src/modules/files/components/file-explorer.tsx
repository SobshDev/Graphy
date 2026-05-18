import { useFileTree } from '../hooks/use-file-tree'
import { usePanelOpen } from '../hooks/use-panel-open'
import { FileTreeNode } from './file-tree-node'

export function FileExplorer() {
  const state = useFileTree()
  const open = usePanelOpen()

  if (!open) return null

  return (
    <aside className="bg-sidebar border-sidebar-border flex w-60 shrink-0 flex-col border-r">
      <div className="text-muted-foreground/70 px-3 py-2 text-[11px] font-medium uppercase tracking-wider">
        Files
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
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
        {state.status === 'ready' &&
          state.tree.children?.map((child) => (
            <FileTreeNode key={child.path} node={child} depth={0} />
          ))}
      </div>
    </aside>
  )
}
