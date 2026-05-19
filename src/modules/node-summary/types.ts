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

export type NodeSummaryHeader = {
  displayName: string
  type: NodeType
  signature: string
  file: string
  line: number
  endLine: number
  facts: NodeSummaryFacts
}

export type SummaryStatus =
  | 'idle'
  | 'loading'
  | 'validating'
  | 'streaming'
  | 'ready'
  | 'error'
  | 'no-key'

export type {
  CachedSummary,
  CachedSummaryFingerprint,
} from '@/shared/lib/desktop'
