import { useCallback, useEffect, useState } from 'react'

import type { ChangedFile } from '../types'
import { parseUnifiedDiff } from '../lib/parse-unified-diff'
import { getGitDiff, getGitStatus } from '../services/git-diff'

type Data = { files: ChangedFile[] }

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: Data }
  | { status: 'error' }

type HookResult = State & { refresh: () => void }

export function useDiffChanges(folder: string | null): HookResult {
  const [state, setState] = useState<State>({ status: 'idle' })
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!folder) {
      setState({ status: 'idle' })
      return
    }

    let cancelled = false
    setState({ status: 'loading' })

    async function load() {
      const gitStatus = await getGitStatus()

      const hasChanges =
        gitStatus.staged.length > 0 ||
        gitStatus.unstaged.length > 0 ||
        gitStatus.untracked.length > 0

      if (!hasChanges) {
        if (!cancelled) setState({ status: 'ready', data: { files: [] } })
        return
      }

      const [unstagedResult, stagedResult] = await Promise.all([
        getGitDiff(undefined, false),
        getGitDiff(undefined, true),
      ])

      const unstagedFiles = parseUnifiedDiff(unstagedResult.diff)
      const stagedFiles = parseUnifiedDiff(stagedResult.diff).map((f) => ({
        ...f,
        staged: true,
      }))

      const fileMap = new Map<string, ChangedFile>()

      for (const file of unstagedFiles) {
        fileMap.set(file.path, { ...file, staged: false })
      }

      for (const file of stagedFiles) {
        const existing = fileMap.get(file.path)
        if (existing) {
          fileMap.set(file.path, {
            ...existing,
            staged: true,
            hunks: [...existing.hunks, ...file.hunks],
            additions: existing.additions + file.additions,
            deletions: existing.deletions + file.deletions,
          })
        } else {
          fileMap.set(file.path, file)
        }
      }

      for (const untrackedPath of gitStatus.untracked) {
        if (!fileMap.has(untrackedPath)) {
          fileMap.set(untrackedPath, {
            path: untrackedPath,
            status: 'added',
            staged: false,
            hunks: [],
            additions: 0,
            deletions: 0,
          })
        }
      }

      if (!cancelled) {
        setState({
          status: 'ready',
          data: { files: Array.from(fileMap.values()) },
        })
      }
    }

    load().catch(() => {
      if (!cancelled) setState({ status: 'error' })
    })

    return () => {
      cancelled = true
    }
  }, [folder, tick])

  return { ...state, refresh }
}
