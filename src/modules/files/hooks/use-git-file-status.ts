import { useCallback, useEffect, useState } from 'react'

import { getDesktop } from '@/shared/lib/desktop'
import type { FileNode } from '@/shared/lib/desktop'

import { buildFileStatusMap, propagateToFolders } from '../lib/git-status-map'
import type { GitFileStatus } from '../types'

type StatusMap = Map<string, GitFileStatus>

export function useGitFileStatus(tree: FileNode | null): {
  statusMap: StatusMap
  refresh: () => void
} {
  const [statusMap, setStatusMap] = useState<StatusMap>(() => new Map())

  const load = useCallback(async (currentTree: FileNode | null) => {
    const desktop = getDesktop()
    if (!desktop || !currentTree) {
      setStatusMap(new Map())
      return
    }
    try {
      const status = await desktop.gitStatus()
      const fileMap = buildFileStatusMap(status)
      setStatusMap(propagateToFolders(currentTree, fileMap))
    } catch {
      setStatusMap(new Map())
    }
  }, [])

  useEffect(() => {
    load(tree)
  }, [tree, load])

  useEffect(() => {
    const desktop = getDesktop()
    if (!desktop) return
    return desktop.onProject(() => {
      load(tree)
    })
  }, [tree, load])

  const refresh = useCallback(() => {
    load(tree)
  }, [tree, load])

  return { statusMap, refresh }
}
