import type { NodeType } from '@/modules/parser'

export type CodeNodeData = {
  displayName: string
  type: NodeType
  signature: string
  file: string
  line: number
  isAsync: boolean
  isExported: boolean
  isStatic: boolean
  bodyLines: number
  inDegree: number
  outDegree: number
}
