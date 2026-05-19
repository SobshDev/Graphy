import { useEffect } from 'react'
import { Check, RefreshCw } from 'lucide-react'

import { useProject } from '@/modules/graph'

import { useDiffChanges } from '../hooks/use-diff-changes'
import { setDiffOverlayActive } from '../state/diff-overlay'
import { ChangedFileRow } from './changed-file-row'

export function ChangesSection() {
  const { folder } = useProject()
  const state = useDiffChanges(folder)

  const fileCount = state.status === 'ready' ? state.data.files.length : 0

  useEffect(() => {
    if (state.status !== 'ready') return
    setDiffOverlayActive(fileCount > 0)
  }, [state.status, fileCount])

  if (state.status === 'idle') return null

  return (
    <div className="border-sidebar-border/60 border-b">
      <div className="flex items-center justify-between px-3 pb-1 pt-2">
        <span className="text-muted-foreground/70 text-[10.5px] font-medium uppercase tracking-wider">
          Changes {state.status === 'ready' ? `(${fileCount})` : ''}
        </span>
        <button
          type="button"
          onClick={state.refresh}
          className="text-muted-foreground/40 hover:text-muted-foreground/80 rounded p-0.5 transition-colors"
          aria-label="Refresh changes"
        >
          <RefreshCw className="size-3" strokeWidth={2} />
        </button>
      </div>

      {state.status === 'loading' && (
        <div className="text-muted-foreground/60 px-3 py-2 text-[12px]">
          Loading changes…
        </div>
      )}

      {state.status === 'error' && (
        <div className="text-muted-foreground/60 px-3 py-2 text-[12px]">
          Failed to load changes
        </div>
      )}

      {state.status === 'ready' && fileCount === 0 && (
        <div className="flex flex-col items-center gap-1.5 px-3 pb-3 pt-2 text-center">
          <Check
            className="text-muted-foreground/30 size-5"
            strokeWidth={1.5}
          />
          <span className="text-muted-foreground/50 text-[12px]">
            Working tree clean
          </span>
        </div>
      )}

      {state.status === 'ready' && fileCount > 0 && (
        <div className="max-h-[40vh] overflow-y-auto thin-scrollbar pb-1">
          {state.data.files.map((file) => (
            <ChangedFileRow key={file.path} file={file} />
          ))}
        </div>
      )}
    </div>
  )
}
