import type { Hunk } from '@/modules/diff-viewer'

import type { GitFileStatus } from '../types'

export function buildLineStatusMap(hunks: Hunk[]): Map<number, GitFileStatus> {
  const map = new Map<number, GitFileStatus>()

  for (const hunk of hunks) {
    const lines = hunk.lines
    let i = 0
    while (i < lines.length) {
      if (lines[i].kind === 'context') {
        i++
        continue
      }

      const runStart = i
      let hasAdd = false
      let hasDel = false
      while (i < lines.length && lines[i].kind !== 'context') {
        if (lines[i].kind === 'add') hasAdd = true
        else if (lines[i].kind === 'del') hasDel = true
        i++
      }

      if (hasAdd) {
        const kind: GitFileStatus = hasDel ? 'modified' : 'added'
        for (let k = runStart; k < i; k++) {
          const line = lines[k]
          if (line.kind === 'add' && line.newLine !== null) {
            const prev = map.get(line.newLine)
            if (prev !== 'deleted') map.set(line.newLine, kind)
          }
        }
        continue
      }

      const nextContext = i < lines.length ? lines[i].newLine : null
      let prevContext: number | null = null
      for (let k = runStart - 1; k >= 0; k--) {
        if (lines[k].newLine !== null) {
          prevContext = lines[k].newLine
          break
        }
      }
      const anchor = nextContext ?? prevContext ?? hunk.newStart
      if (!map.has(anchor)) map.set(anchor, 'deleted')
    }
  }

  return map
}

export function allLinesAdded(lineCount: number): Map<number, GitFileStatus> {
  const map = new Map<number, GitFileStatus>()
  for (let i = 1; i <= lineCount; i++) map.set(i, 'added')
  return map
}
