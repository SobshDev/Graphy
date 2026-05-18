import type { Edge, Node } from '@xyflow/react'

import type { Graph } from '@/modules/parser'
import type { CodeNodeData } from '@/modules/graph/components/code-node'

const COLUMN_GAP = 320
const ROW_GAP = 160
const COLUMNS = 5

export interface XYFlowGraph {
  nodes: Array<Node<CodeNodeData>>
  edges: Array<Edge>
}

export function toXYFlow(graph: Graph): XYFlowGraph {
  const nodes = graph.nodes.map<Node<CodeNodeData>>((node, index) => ({
    id: node.id,
    type: 'code',
    position: gridPosition(index),
    data: {
      displayName: qualifiedName(node.id, node.name),
      type: node.type,
      signature: node.signature,
      file: node.file,
      line: node.line,
      isAsync: node.isAsync,
      isExported: node.isExported,
      isStatic: node.isStatic,
      bodyLines: node.bodyLines,
      inDegree: node.inDegree,
      outDegree: node.outDegree,
    },
  }))

  const edges = graph.edges.map<Edge>((edge) => ({
    id: `${edge.source}->${edge.target}`,
    source: edge.source,
    target: edge.target,
  }))

  return { nodes, edges }
}

function gridPosition(index: number): { x: number; y: number } {
  return {
    x: (index % COLUMNS) * COLUMN_GAP,
    y: Math.floor(index / COLUMNS) * ROW_GAP,
  }
}

function qualifiedName(id: string, fallback: string): string {
  const idx = id.indexOf('::')
  return idx >= 0 ? id.slice(idx + 2) : fallback
}
