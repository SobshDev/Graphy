import type { DiffRow, Hunk } from '../types'

export function alignHunks(hunks: Hunk[]): DiffRow[] {
  const rows: DiffRow[] = []

  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.kind === 'context') {
        rows.push({
          left: { lineNumber: line.oldLine, text: line.text, kind: 'context' },
          right: {
            lineNumber: line.newLine,
            text: line.text,
            kind: 'context',
          },
        })
      } else if (line.kind === 'del') {
        rows.push({
          left: { lineNumber: line.oldLine, text: line.text, kind: 'del' },
          right: { lineNumber: null, text: '', kind: 'empty' },
        })
      } else {
        rows.push({
          left: { lineNumber: null, text: '', kind: 'empty' },
          right: { lineNumber: line.newLine, text: line.text, kind: 'add' },
        })
      }
    }
  }

  return rows
}
