import type { NodeType } from '@/modules/parser'

export type NodeSummaryFacts = {
  isAsync: boolean
  isExported: boolean
  bodyLines: number
  inDegree: number
  outDegree: number
}

export type NodeSummaryRelation = {
  id: string
  displayName: string
  type: NodeType
  file: string
  line: number
}

export type NodeSummaryTarget = {
  displayName: string
  type: NodeType
  signature: string
  file: string
  line: number
  facts: NodeSummaryFacts
  overview: string[]
  callers: NodeSummaryRelation[]
  callees: NodeSummaryRelation[]
}
