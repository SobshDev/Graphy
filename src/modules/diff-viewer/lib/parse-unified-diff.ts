import type { ChangedFile, ChangedFileStatus, DiffLine, Hunk } from '../types'

const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)/

export function parseUnifiedDiff(raw: string): ChangedFile[] {
  const files: ChangedFile[] = []
  const lines = raw.split('\n')
  let i = 0

  while (i < lines.length) {
    if (!lines[i].startsWith('diff --git ')) {
      i++
      continue
    }

    let oldPath: string | undefined
    let newPath: string | undefined
    let status: ChangedFileStatus = 'modified'
    let renameFrom: string | undefined
    let renameTo: string | undefined

    i++

    while (i < lines.length && !lines[i].startsWith('diff --git ')) {
      const line = lines[i]

      if (line.startsWith('--- ')) {
        const p = line.slice(4)
        oldPath = p === '/dev/null' ? undefined : p.replace(/^a\//, '')
        i++
        continue
      }

      if (line.startsWith('+++ ')) {
        const p = line.slice(4)
        newPath = p === '/dev/null' ? undefined : p.replace(/^b\//, '')
        i++
        continue
      }

      if (line.startsWith('rename from ')) {
        renameFrom = line.slice(12)
        i++
        continue
      }

      if (line.startsWith('rename to ')) {
        renameTo = line.slice(10)
        i++
        continue
      }

      if (!line.startsWith('@@ ')) {
        i++
        continue
      }

      break
    }

    if (renameFrom !== undefined && renameTo !== undefined) {
      status = 'renamed'
      oldPath = renameFrom
      newPath = renameTo
    } else if (oldPath === undefined) {
      status = 'added'
    } else if (newPath === undefined) {
      status = 'deleted'
    } else {
      status = 'modified'
    }

    const path = newPath ?? oldPath ?? ''
    const hunks: Hunk[] = []
    let additions = 0
    let deletions = 0

    while (i < lines.length && !lines[i].startsWith('diff --git ')) {
      const line = lines[i]
      const hunkMatch = line.match(HUNK_HEADER)

      if (!hunkMatch) {
        i++
        continue
      }

      const oldStart = parseInt(hunkMatch[1], 10)
      const oldLinesRaw = parseInt(hunkMatch[2], 10)
      const oldLines = isNaN(oldLinesRaw) ? 1 : oldLinesRaw
      const newStart = parseInt(hunkMatch[3], 10)
      const newLinesRaw = parseInt(hunkMatch[4], 10)
      const newLines = isNaN(newLinesRaw) ? 1 : newLinesRaw
      const header = line

      i++

      const diffLines: DiffLine[] = []
      let oldCursor = oldStart
      let newCursor = newStart

      while (i < lines.length) {
        const dl = lines[i]

        if (
          dl.startsWith('diff --git ') ||
          dl.startsWith('@@ ') ||
          dl.startsWith('\\ No newline')
        ) {
          break
        }

        if (dl.startsWith('+')) {
          diffLines.push({
            kind: 'add',
            text: dl.slice(1),
            oldLine: null,
            newLine: newCursor++,
          })
          additions++
          i++
          continue
        }

        if (dl.startsWith('-')) {
          diffLines.push({
            kind: 'del',
            text: dl.slice(1),
            oldLine: oldCursor++,
            newLine: null,
          })
          deletions++
          i++
          continue
        }

        if (dl.startsWith(' ') || dl === '') {
          diffLines.push({
            kind: 'context',
            text: dl.startsWith(' ') ? dl.slice(1) : dl,
            oldLine: oldCursor++,
            newLine: newCursor++,
          })
          i++
          continue
        }

        break
      }

      hunks.push({
        oldStart,
        oldLines,
        newStart,
        newLines,
        header,
        lines: diffLines,
      })
    }

    files.push({
      path,
      ...(status === 'renamed' && oldPath ? { oldPath } : {}),
      status,
      staged: false,
      hunks,
      additions,
      deletions,
    })
  }

  return files
}
