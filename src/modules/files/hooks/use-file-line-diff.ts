import { useEffect, useState } from 'react'

import { parseUnifiedDiff } from '@/modules/diff-viewer'
import { getDesktop } from '@/shared/lib/desktop'

import { allLinesAdded, buildLineStatusMap } from '../lib/build-line-status-map'
import type { GitFileStatus } from '../types'

type Args = {
  path: string | null
  savedContent: string
}

export function useFileLineDiff({
  path,
  savedContent,
}: Args): Map<number, GitFileStatus> {
  const [map, setMap] = useState<Map<number, GitFileStatus>>(() => new Map())

  useEffect(() => {
    setMap(new Map())
    if (!path) return

    let cancelled = false

    async function load(currentPath: string) {
      const desktop = getDesktop()
      if (!desktop) return

      try {
        const status = await desktop.gitStatus()
        const untracked = new Set(status.untracked)

        if (untracked.has(currentPath)) {
          const lineCount = Math.max(1, savedContent.split('\n').length)
          if (!cancelled) setMap(allLinesAdded(lineCount))
          return
        }

        const { diff } = await desktop.gitDiff({
          file: currentPath,
          ref: 'HEAD',
          maxBytes: 1_048_576,
        })

        if (!diff) {
          if (!cancelled) setMap(new Map())
          return
        }

        const files = parseUnifiedDiff(diff)
        const file = files.find((f) => f.path === currentPath)
        if (!file) {
          if (!cancelled) setMap(new Map())
          return
        }

        if (!cancelled) setMap(buildLineStatusMap(file.hunks))
      } catch {
        if (!cancelled) setMap(new Map())
      }
    }

    load(path)

    return () => {
      cancelled = true
    }
  }, [path, savedContent])

  useEffect(() => {
    const desktop = getDesktop()
    if (!desktop) return
    return desktop.onProject(() => {
      setMap(new Map())
    })
  }, [])

  return map
}
