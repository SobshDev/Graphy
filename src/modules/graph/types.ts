export type GraphLayout = 'tree' | 'radial'

export type FileNodeData = {
  kind: 'file'
  file: string
  displayName: string
  folder: string
  callsOut: number
  callsIn: number
  depth: number
  layout: GraphLayout
}

export type FolderNodeData = {
  kind: 'folder'
  path: string
  name: string
  depth: number
  layout: GraphLayout
}

export type GraphNodeData = FileNodeData | FolderNodeData
