import { createContext, useContext } from 'react'

import type { FileNode } from '@/shared/lib/desktop'

import type { GitFileStatus } from '../types'

export type ContextMenuState = {
  node: FileNode
  x: number
  y: number
} | null

type FileTreeActions = {
  refresh: () => void
  openContextMenu: (e: React.MouseEvent, node: FileNode) => void
  renamingPath: string | null
  startRename: (path: string) => void
  clearRename: () => void
  moveNode: (sourcePath: string, destDir: string) => Promise<void>
  expandAll: number
  collapseAll: number
  gitStatusMap: Map<string, GitFileStatus>
}

export const FileTreeContext = createContext<FileTreeActions>({
  refresh: () => {},
  openContextMenu: () => {},
  renamingPath: null,
  startRename: () => {},
  clearRename: () => {},
  moveNode: async () => {},
  expandAll: 0,
  collapseAll: 0,
  gitStatusMap: new Map(),
})

export function useFileTreeActions() {
  return useContext(FileTreeContext)
}
