import { Fragment, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, History } from 'lucide-react'

import { useProject } from '@/modules/graph'
import { ChangesSection, OverlayToggles } from '@/modules/diff-viewer'
import { usePanelResize } from '@/shared/hooks/use-panel-resize'
import { useActivePanel } from '@/shared/lib/active-panel'

import { useGitBranches } from '../hooks/use-git-branches'
import { useGitHistory } from '../hooks/use-git-history'
import { BranchPicker } from './branch-picker'
import { CommitItem, GraphConnector } from './commit-item'

export function SourceControlPanel() {
  const open = useActivePanel() === 'git'
  const { folder } = useProject()
  const [selectedBranch, setSelectedBranch] = useState<string | undefined>()
  const branchesState = useGitBranches(folder)
  const state = useGitHistory(folder, selectedBranch)
  const resize = usePanelResize({
    defaultWidth: 288,
    minWidth: 240,
    maxWidth: 560,
  })

  const graphWidth = useMemo(() => {
    if (state.status !== 'ready') return 0
    let max = 0
    for (const c of state.data.commits) {
      for (const line of c.graphLines) {
        const cols = Math.ceil(line.raw.length / 2)
        if (cols > max) max = cols
      }
    }
    return max
  }, [state])

  if (!open) return null

  const totalCommits = state.status === 'ready' ? state.data.commits.length : 0

  return (
    <aside
      className="bg-sidebar border-sidebar-border relative flex shrink-0 flex-col border-r"
      style={{ width: resize.width }}
    >
      <div
        role="separator"
        aria-label="Resize source control panel"
        aria-orientation="vertical"
        aria-valuemin={resize.minWidth}
        aria-valuemax={resize.maxWidth}
        aria-valuenow={resize.width}
        tabIndex={0}
        onPointerDown={resize.beginResize}
        className="app-no-drag absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize touch-none outline-none before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-transparent before:transition-colors hover:before:bg-sidebar-border focus-visible:before:bg-primary"
      />
      <div className="text-muted-foreground/70 px-3 py-2 text-[11px] font-medium uppercase tracking-wider">
        Source Control
      </div>

      {branchesState.status === 'ready' && branchesState.data.current && (
        <div className="border-sidebar-border/60 flex items-center gap-1 border-b px-1.5 pb-2 pt-1">
          <BranchPicker
            branches={branchesState.data}
            selected={selectedBranch}
            onSelect={setSelectedBranch}
          />
          {state.status === 'ready' && (
            <>
              {state.data.behind > 0 && (
                <span className="text-muted-foreground/80 flex shrink-0 items-center gap-0.5 px-1 text-[11px]">
                  <ArrowDown className="size-3" strokeWidth={2} />
                  {state.data.behind}
                </span>
              )}
              {state.data.ahead > 0 && (
                <span className="text-muted-foreground/80 flex shrink-0 items-center gap-0.5 px-1 text-[11px]">
                  <ArrowUp className="size-3" strokeWidth={2} />
                  {state.data.ahead}
                </span>
              )}
            </>
          )}
        </div>
      )}

      <OverlayToggles />

      <ChangesSection />

      <div className="border-sidebar-border/60 flex items-center justify-between border-b px-3 pb-1 pt-2">
        <span className="text-muted-foreground/70 text-[10.5px] font-medium uppercase tracking-wider">
          History
        </span>
        {totalCommits > 0 && (
          <span className="text-muted-foreground/40 text-[10px] tabular-nums">
            {totalCommits} commits
          </span>
        )}
      </div>

      <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto pb-2">
        {state.status === 'idle' && (
          <div className="flex flex-col items-center gap-2 px-3 pt-8 text-center">
            <History
              className="text-muted-foreground/30 size-8"
              strokeWidth={1.2}
            />
            <span className="text-muted-foreground/50 text-[12px]">
              Open a folder to see its history
            </span>
          </div>
        )}
        {state.status === 'loading' && (
          <div className="text-muted-foreground/60 px-3 py-2 text-[12px]">
            Loading history…
          </div>
        )}
        {state.status === 'error' && (
          <div className="text-muted-foreground/60 px-3 py-2 text-[12px]">
            Failed to load git history
          </div>
        )}
        {state.status === 'ready' && state.data.commits.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-3 pt-8 text-center">
            <History
              className="text-muted-foreground/30 size-8"
              strokeWidth={1.2}
            />
            <span className="text-muted-foreground/50 text-[12px]">
              No commits yet
            </span>
          </div>
        )}
        {state.status === 'ready' &&
          state.data.commits.map((commit) => (
            <Fragment key={commit.hash}>
              <CommitItem commit={commit} graphWidth={graphWidth} />
              {commit.graphLines.slice(1).map((line, i) => (
                <GraphConnector
                  key={`${commit.hash}_c${i}`}
                  raw={line.raw}
                  graphWidth={graphWidth}
                />
              ))}
            </Fragment>
          ))}
      </div>
    </aside>
  )
}
