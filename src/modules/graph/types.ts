import type { NodeType } from '@/modules/parser'

export type CodeNodeData = {
  kind: 'code'
  displayName: string
  type: NodeType
  signature: string
  file: string
  line: number
  endLine: number
  isAsync: boolean
  isExported: boolean
  isStatic: boolean
  bodyLines: number
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

export type GraphNodeData = CodeNodeData | SectionNodeData
