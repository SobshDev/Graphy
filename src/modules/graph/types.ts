export type FileNodeData = {
  kind: 'file'
  file: string
  displayName: string
  folder: string
  symbolCount: number
  inDegree: number
  outDegree: number
}

export type SectionNodeData = {
  kind: 'section'
  label: string
  subtitle: string
  width: number
  height: number
}

export type GraphNodeData = FileNodeData | SectionNodeData
