export type FileNodeData = {
  kind: 'file'
  file: string
  displayName: string
  folder: string
  symbolCount: number
  depth: number
}

export type FolderNodeData = {
  kind: 'folder'
  path: string
  name: string
  depth: number
}

export type GraphNodeData = FileNodeData | FolderNodeData
