import { inspectClasses } from '@/modules/parser'
import type { Graph, GraphNode } from '@/modules/parser'

import type { NodeSummaryHeader, NodeSummaryRelation } from '../types'

export function getNodeMetadata(
  graph: Graph,
  nodeId: string,
): GraphNode | null {
  return graph.nodes.find((n) => n.id === nodeId) ?? null
}

export function toHeader(node: GraphNode): NodeSummaryHeader {
  return {
    displayName: node.name,
    type: node.type,
    signature: node.signature,
    file: node.file,
    line: node.line,
    endLine: node.endLine,
    facts: {
      isAsync: node.isAsync,
      isExported: node.isExported,
      bodyLines: node.bodyLines,
      inDegree: node.inDegree,
      outDegree: node.outDegree,
    },
  }
}

function toRelation(node: GraphNode): NodeSummaryRelation {
  return {
    id: node.id,
    displayName: node.name,
    type: node.type,
    file: node.file,
    line: node.line,
  }
}

export function getNeighbors(
  graph: Graph,
  nodeId: string,
): { callers: NodeSummaryRelation[]; callees: NodeSummaryRelation[] } {
  const inspector = inspectClasses(graph)
  return {
    callers: inspector.callersOf(nodeId).map(toRelation),
    callees: inspector.calleesOf(nodeId).map(toRelation),
  }
}
