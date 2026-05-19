import type { EditorView } from '@codemirror/view'
import { X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useProject } from '@/modules/graph'
import { getDesktop } from '@/shared/lib/desktop'
import { setActiveView } from '@/shared/lib/active-view'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/shared/ui/resizable'

import { useDiffChanges } from '../hooks/use-diff-changes'
import { alignHunks } from '../lib/align-lines'
import { getGitShow } from '../services/git-diff'
import { closeDiff, useOpenDiff } from '../state/open-diff'
import type { ChangedFile, DiffRow } from '../types'
import { DiffPane } from './diff-pane'

function findChangedFile(
  files: ChangedFile[],
  path: string,
): ChangedFile | null {
  return files.find((f) => f.path === path) ?? null
}

function fullFileRows(content: string, side: 'left' | 'right'): DiffRow[] {
  const lines = content.length === 0 ? [] : content.split('\n')
  return lines.map((text, i) => {
    const lineNumber = i + 1
    if (side === 'right') {
      return {
        left: { lineNumber: null, text: '', kind: 'empty' as const },
        right: { lineNumber, text, kind: 'add' as const },
      }
    }
    return {
      left: { lineNumber, text, kind: 'del' as const },
      right: { lineNumber: null, text: '', kind: 'empty' as const },
    }
  })
}

export function DiffView() {
  const path = useOpenDiff()
  const { folder } = useProject()
  const diffChanges = useDiffChanges(folder)

  const [loading, setLoading] = useState(false)
  const [headContent, setHeadContent] = useState<string | null>(null)
  const [workingContent, setWorkingContent] = useState<string | null>(null)

  const [scrollY, setScrollY] = useState(0)
  const leftViewRef = useRef<EditorView | null>(null)
  const rightViewRef = useRef<EditorView | null>(null)

  const changedFile: ChangedFile | null =
    diffChanges.status === 'ready' && path
      ? findChangedFile(diffChanges.data.files, path)
      : null

  useEffect(() => {
    if (!path || !folder) {
      setHeadContent(null)
      setWorkingContent(null)
      return
    }

    let cancelled = false
    setLoading(true)

    const desktop = getDesktop()
    const wtPromise = desktop
      ? desktop.readFile(`${folder}/${path}`).catch(() => '')
      : Promise.resolve('')

    Promise.all([getGitShow(path), wtPromise])
      .then(([gitShow, wt]) => {
        if (cancelled) return
        setHeadContent(gitShow.exists ? gitShow.content : '')
        setWorkingContent(wt)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setHeadContent('')
        setWorkingContent('')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [path, folder])

  const rows: DiffRow[] = useMemo(() => {
    if (!changedFile) return []
    if (changedFile.hunks.length > 0) return alignHunks(changedFile.hunks)
    if (
      changedFile.status === 'added' ||
      changedFile.status === 'untracked' ||
      changedFile.status === 'renamed'
    ) {
      return fullFileRows(workingContent ?? '', 'right')
    }
    if (changedFile.status === 'deleted') {
      return fullFileRows(headContent ?? '', 'left')
    }
    return []
  }, [changedFile, headContent, workingContent])

  const handleClose = useCallback(() => {
    closeDiff()
    setActiveView('graph')
  }, [])

  const handleScrollLeft = useCallback((y: number) => {
    setScrollY(y)
  }, [])

  const handleScrollRight = useCallback((y: number) => {
    setScrollY(y)
  }, [])

  if (!path) return null

  const fileName = path.split('/').pop() ?? path
  const additions = changedFile?.additions ?? 0
  const deletions = changedFile?.deletions ?? 0
  const status = changedFile?.status ?? 'modified'

  const statusColors: Record<string, string> = {
    added: 'text-green-400',
    deleted: 'text-red-400',
    modified: 'text-yellow-400',
    renamed: 'text-blue-400',
    untracked: 'text-green-400',
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="bg-sidebar flex h-10 shrink-0 items-center gap-3 border-b px-4">
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
          {path}
        </span>
        {!loading && changedFile && (
          <>
            <span className="shrink-0 text-xs text-green-400">
              +{additions}
            </span>
            <span className="shrink-0 text-xs text-red-400">-{deletions}</span>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-xs uppercase ${statusColors[status] ?? 'text-muted-foreground'}`}
            >
              {status}
            </span>
          </>
        )}
        <button
          onClick={handleClose}
          className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
          aria-label="Close diff"
        >
          <X size={14} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          No diff to display
        </div>
      ) : (
        <ResizablePanelGroup orientation="horizontal" className="flex-1">
          <ResizablePanel defaultSize={50} minSize={20}>
            <DiffPane
              side="left"
              rows={rows}
              fileName={fileName}
              viewRef={leftViewRef}
              onScrollY={handleScrollLeft}
              scrollY={scrollY}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={20}>
            <DiffPane
              side="right"
              rows={rows}
              fileName={fileName}
              viewRef={rightViewRef}
              onScrollY={handleScrollRight}
              scrollY={scrollY}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  )
}
