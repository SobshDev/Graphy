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
  children?: FileNode[]
}

export interface GraphyDesktop {
  platform: NodeJS.Platform
  getInitialState: () => Promise<InitialState>
  openFolder: () => Promise<void>
  openRecent: (folder: string) => Promise<void>
  closeFolder: () => Promise<void>
  reloadGraph: () => Promise<void>
  clearRecents: () => Promise<void>
  onProject: (handler: (payload: ProjectPayload) => void) => () => void
  onGraph: (handler: (payload: GraphPayload) => void) => () => void
  readFunctionSource: (
    payload: ReadFunctionSourcePayload,
  ) => Promise<ReadFunctionSourceResult>
  writeFunctionSource: (
    payload: WriteFunctionSourcePayload,
  ) => Promise<WriteFunctionSourceResult>
  getFileTree: (opts?: { showHidden?: boolean }) => Promise<FileNode | null>
  readFile: (filePath: string) => Promise<string>
  writeFile: (filePath: string, content: string) => Promise<void>
  createFile: (filePath: string) => Promise<void>
  createDir: (dirPath: string) => Promise<void>
  moveFile: (sourcePath: string, destDir: string) => Promise<void>
  deleteFile: (filePath: string) => Promise<void>
  renameFile: (oldPath: string, newName: string) => Promise<{ newPath: string }>
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
