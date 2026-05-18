import type { Edge, Node } from '@xyflow/react'
import ELK from 'elkjs/lib/elk.bundled.js'
import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk.bundled.js'

import type { Graph } from '@/modules/parser'
import type { CodeNodeData } from '@/modules/graph/types'

const NODE_WIDTH = 240
const NODE_HEIGHT = 72
const UNUSED_COLUMNS = 4
const UNUSED_COLUMN_GAP = 300
const UNUSED_ROW_GAP = 120
const UNUSED_SECTION_GAP = 280

const elk = new ELK()

export interface XYFlowGraph {
  nodes: Array<Node<CodeNodeData>>
  edges: Array<Edge>
}

export async function toXYFlow(graph: Graph): Promise<XYFlowGraph> {
  const nodes = graph.nodes.map<Node<CodeNodeData>>((node) => ({
    id: node.id,
    type: 'code',
    position: { x: 0, y: 0 },
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

  const edges = graph.edges.map<Edge>((edge, index) => ({
    id: `${edge.source}->${edge.target}:${edge.type}:${index}`,
    source: edge.source,
    target: edge.target,
  }))

  if (nodes.length === 0) return { nodes, edges }

  const connectedIds = new Set<string>()
  for (const edge of edges) {
    connectedIds.add(edge.source)
    connectedIds.add(edge.target)
  }

  const connectedNodes = nodes.filter((node) => connectedIds.has(node.id))
  const unusedNodes = nodes.filter((node) => !connectedIds.has(node.id))

  if (connectedNodes.length === 0) {
    return {
      nodes: placeUnusedNodes(unusedNodes, { x: 0, y: 0 }),
      edges,
    }
  }

  const layoutedGraph = await elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': '76',
      'elk.layered.spacing.nodeNodeBetweenLayers': '150',
      'elk.layered.spacing.edgeEdgeBetweenLayers': '32',
      'elk.layered.spacing.edgeNodeBetweenLayers': '48',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.cycleBreaking.strategy': 'GREEDY',
    },
    children: connectedNodes.map<ElkNode>((node) => ({
      id: node.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: edges.map<ElkExtendedEdge>((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  })

  const layoutedById = new Map(
    layoutedGraph.children?.map((node) => [node.id, node]) ?? [],
  )
  const layoutedConnectedNodes = connectedNodes.map((node) => {
    const layoutedNode = layoutedById.get(node.id)
    return {
      ...node,
      position: {
        x: layoutedNode?.x ?? node.position.x,
        y: layoutedNode?.y ?? node.position.y,
      },
    }
  })
  const unusedOrigin = unusedShelfOrigin(layoutedConnectedNodes)

  return {
    nodes: [
      ...layoutedConnectedNodes,
      ...placeUnusedNodes(unusedNodes, unusedOrigin),
    ],
    edges,
  }
}

function placeUnusedNodes(
  nodes: Array<Node<CodeNodeData>>,
  origin: { x: number; y: number },
): Array<Node<CodeNodeData>> {
  return nodes.map((node, index) => ({
    ...node,
    position: {
      x: origin.x + (index % UNUSED_COLUMNS) * UNUSED_COLUMN_GAP,
      y: origin.y + Math.floor(index / UNUSED_COLUMNS) * UNUSED_ROW_GAP,
    },
  }))
}

function unusedShelfOrigin(nodes: Array<Node<CodeNodeData>>): {
  x: number
  y: number
} {
  const bounds = nodes.reduce(
    (acc, node) => ({
      minX: Math.min(acc.minX, node.position.x),
      maxY: Math.max(acc.maxY, node.position.y + NODE_HEIGHT),
    }),
    { minX: Infinity, maxY: -Infinity },
  )

  return {
    x: Number.isFinite(bounds.minX) ? bounds.minX : 0,
    y: Number.isFinite(bounds.maxY) ? bounds.maxY + UNUSED_SECTION_GAP : 0,
  }
}

function qualifiedName(id: string, fallback: string): string {
  const idx = id.indexOf('::')
  return idx >= 0 ? id.slice(idx + 2) : fallback
}
