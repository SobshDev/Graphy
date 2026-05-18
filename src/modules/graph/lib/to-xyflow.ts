import type { Edge, Node } from '@xyflow/react'

import type { Graph } from '@/modules/parser'
import type { CodeNodeData } from '@/modules/graph/components/code-node'

const COLUMN_GAP = 280
const ROW_GAP = 140
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
      name: node.name,
      type: node.type,
      signature: node.signature,
      file: node.file,
      line: node.line,
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
