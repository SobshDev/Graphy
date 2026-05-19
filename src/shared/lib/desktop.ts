import type { Graph } from '@/modules/parser'

export interface ProjectPayload {
  folder: string | null
  recents: string[]
}

export interface GraphPayload {
  folder: string | null
  graph: Graph | null
  error: string | null
  loading: boolean
  layout: unknown
}

export interface InitialState extends ProjectPayload, GraphPayload {}

export interface ReadFunctionSourcePayload {
  root: string
  file: string
  startLine: number
  endLine: number
}

export interface ReadFunctionSourceResult {
  source: string
  startLine: number
  endLine: number
}

export interface WriteFunctionSourcePayload extends ReadFunctionSourcePayload {
  source: string
}

export interface WriteFunctionSourceResult {
  endLine: number
}

export interface FileNode {
  name: string
  path: string
  kind: 'file' | 'dir'
  ignored?: boolean
  children?: FileNode[]
}

export interface SearchMatch {
  file: string
  line: number
  column: number
  content: string
}

export interface ReadFilePayload {
  path: string
  startLine?: number
  endLine?: number
  maxBytes?: number
}

export type ReadFileResult =
  | {
      found: true
      path: string
      startLine: number
      endLine: number
      source: string
      truncated: boolean
    }
  | { found: false; path: string }

export interface SearchCodePayload {
  query: string
  regex: boolean
  filePattern?: string
  maxResults: number
}

export interface SearchHit {
  file: string
  line: number
  match: string
  preview: string
}

export interface SearchCodeResult {
  results: SearchHit[]
  truncated: boolean
}

export interface ListFilesPayload {
  pattern?: string
  dir?: string
  maxResults: number
}

export interface ListFilesResult {
  files: string[]
  truncated: boolean
}

export interface ApplyEditPayload {
  file: string
  oldString: string
  newString: string
  replaceAll: boolean
}

export interface ApplyEditResult {
  applied: boolean
  file: string
  replacements: number
}

export interface RenameSymbolPayload {
  id: string
  newName: string
}

export type RenameSymbolResult =
  | { applied: true; id: string; newId: string; affectedFiles: string[] }
  | { applied: false; id: string; reason: string }

export interface RunCommandPayload {
  command: string
  args?: string[]
  timeoutMs?: number
}

export interface RunCommandResult {
  exitCode: number
  stdout: string
  stderr: string
  truncated: boolean
}

export interface GitStatusResult {
  branch: string | null
  staged: string[]
  modified: string[]
  deleted: string[]
  renamed: { from: string; to: string }[]
  untracked: string[]
}

export interface GitDiffPayload {
  file?: string
  staged?: boolean
  ref?: string
  maxBytes?: number
}

export interface GitDiffResult {
  diff: string
  truncated: boolean
}

export interface GitShowPayload {
  file: string
  ref?: string
  maxBytes?: number
}

export interface GitShowResult {
  content: string
  truncated: boolean
  exists: boolean
}

export interface GitBlamePayload {
  file: string
  line?: number
  contextLines?: number
}

export interface GitBlameLine {
  line: number
  sha: string
  author: string
  date: string
  content: string
}

export interface GitBlameResult {
  lines: GitBlameLine[]
}

export interface FocusNodePayload {
  id: string
}

export interface FocusNodeResult {
  ok: boolean
  id: string
}

export interface TsTypeAtPayload {
  file: string
  line: number
  column?: number
}

export type TsTypeAtResult =
  | {
      found: true
      file: string
      line: number
      column: number
      name: string
      type: string
      kind: string
    }
  | { found: false }

export interface WebFetchPayload {
  url: string
  maxBytes?: number
}

export type WebFetchResult =
  | { ok: true; contentType: string; body: string; truncated: boolean }
  | { ok: false; reason: string }

export interface GraphyDesktop {
  platform: NodeJS.Platform
  getInitialState: () => Promise<InitialState>
  openFolder: () => Promise<void>
  openRecent: (folder: string) => Promise<void>
  closeFolder: () => Promise<void>
  reloadGraph: () => Promise<void>
  clearRecents: () => Promise<void>
  cacheLayout: (layout: unknown) => Promise<void>
  onProject: (handler: (payload: ProjectPayload) => void) => () => void
  onGraph: (handler: (payload: GraphPayload) => void) => () => void
  readFunctionSource: (
    payload: ReadFunctionSourcePayload,
  ) => Promise<ReadFunctionSourceResult>
  writeFunctionSource: (
    payload: WriteFunctionSourcePayload,
  ) => Promise<WriteFunctionSourceResult>
  getFileTree: () => Promise<FileNode | null>
  readFile: (filePath: string) => Promise<string>
  writeFile: (filePath: string, content: string) => Promise<void>
  createFile: (filePath: string) => Promise<void>
  createDir: (dirPath: string) => Promise<void>
  moveFile: (sourcePath: string, destDir: string) => Promise<void>
  deleteFile: (filePath: string) => Promise<void>
  renameFile: (oldPath: string, newName: string) => Promise<{ newPath: string }>
  searchText: (query: string) => Promise<SearchMatch[]>
  readProjectFile: (payload: ReadFilePayload) => Promise<ReadFileResult>
  searchProject: (payload: SearchCodePayload) => Promise<SearchCodeResult>
  listProjectFiles: (payload: ListFilesPayload) => Promise<ListFilesResult>
  applyEdit: (payload: ApplyEditPayload) => Promise<ApplyEditResult>
  renameSymbol: (payload: RenameSymbolPayload) => Promise<RenameSymbolResult>
  reparseProject: () => Promise<{ ok: true }>
  runCommand: (payload: RunCommandPayload) => Promise<RunCommandResult>
  gitStatus: () => Promise<GitStatusResult>
  gitDiff: (payload: GitDiffPayload) => Promise<GitDiffResult>
  gitShow: (payload: GitShowPayload) => Promise<GitShowResult>
  gitBlame: (payload: GitBlamePayload) => Promise<GitBlameResult>
  focusNode: (payload: FocusNodePayload) => Promise<FocusNodeResult>
  tsTypeAt: (payload: TsTypeAtPayload) => Promise<TsTypeAtResult>
  webFetch: (payload: WebFetchPayload) => Promise<WebFetchResult>
  onFocusNode: (handler: (payload: FocusNodePayload) => void) => () => void
}

declare global {
  interface Window {
    graphyDesktop?: GraphyDesktop
  }
}

export function getDesktop(): GraphyDesktop | null {
  if (typeof window === 'undefined') return null
  return window.graphyDesktop ?? null
}
