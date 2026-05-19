export type DiffLineKind = 'context' | 'add' | 'del'

export type DiffLine = {
  kind: DiffLineKind
  text: string
  oldLine: number | null
  newLine: number | null
}

export type Hunk = {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  header: string
  lines: DiffLine[]
}

export type ChangedFileStatus =
  | 'added'
  | 'modified'
  | 'deleted'
  | 'renamed'
  | 'untracked'

export type ChangedFile = {
  path: string
  oldPath?: string
  status: ChangedFileStatus
  staged: boolean
  hunks: Hunk[]
  additions: number
  deletions: number
}

export type DiffRowSide = {
  lineNumber: number | null
  text: string
  kind: DiffLineKind | 'empty'
}

export type DiffRow = {
  left: DiffRowSide
  right: DiffRowSide
}

export type NodeDiffStatus = {
  status: 'added' | 'modified' | 'unchanged'
  impact: 'caller' | 'callee' | null
}

export type DiffOverlayState = {
  active: boolean
  changed: boolean
  callers: boolean
  callees: boolean
  dimOthers: boolean
}
