import { ArrowDown, ArrowUp, GitBranch } from 'lucide-react'

import { useActivePanel } from '@/shared/lib/active-panel'

import { useGitHistory } from '../hooks/use-git-history'
import { CommitItem } from './commit-item'

export function SourceControlPanel() {
  const open = useActivePanel() === 'git'
  const state = useGitHistory()

  if (!open) return null

  return (
    <aside className="bg-sidebar border-sidebar-border flex w-72 shrink-0 flex-col border-r">
      <div className="text-muted-foreground/70 px-3 py-2 text-[11px] font-medium uppercase tracking-wider">
        Source Control
      </div>

      {state.status === 'ready' && state.data.branch && (
        <div className="border-sidebar-border/60 flex items-center gap-2 border-b px-3 pb-2 pt-1">
          <GitBranch
            className="text-muted-foreground size-3.5 shrink-0"
            strokeWidth={1.8}
          />
          <span
            className="text-foreground/90 min-w-0 flex-1 truncate text-[12px] font-medium"
            title={state.data.branch}
          >
            {state.data.branch}
          </span>
          {state.data.behind > 0 && (
            <span className="text-muted-foreground/80 flex shrink-0 items-center gap-0.5 text-[11px]">
              <ArrowDown className="size-3" strokeWidth={2} />
              {state.data.behind}
            </span>
          )}
          {state.data.ahead > 0 && (
            <span className="text-muted-foreground/80 flex shrink-0 items-center gap-0.5 text-[11px]">
              <ArrowUp className="size-3" strokeWidth={2} />
              {state.data.ahead}
            </span>
          )}
        </div>
      )}

      <div className="text-muted-foreground/70 px-3 pb-1 pt-2 text-[10.5px] font-medium uppercase tracking-wider">
        History
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
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
          <div className="text-muted-foreground/60 px-3 py-2 text-[12px]">
            No commits yet
          </div>
        )}
        {state.status === 'ready' &&
          state.data.commits.map((commit) => (
            <CommitItem key={commit.hash} commit={commit} />
          ))}
      </div>
    </aside>
  )
}
