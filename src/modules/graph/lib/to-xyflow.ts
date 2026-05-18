import type { Edge, Node } from '@xyflow/react'
import ELK from 'elkjs/lib/elk.bundled.js'
import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk.bundled.js'

import type { Graph } from '@/modules/parser'
import type { CodeNodeData } from '@/modules/graph/types'

const NODE_WIDTH = 240
const NODE_HEIGHT = 54
const COLUMN_X_TOLERANCE = 8
const MIN_COLUMN_NODE_GAP = 42
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
    className: 'graph-edge',
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
  const layoutedConnectedNodes = resolveColumnOverlaps(
    centerEntryNodes(
      connectedNodes.map((node) => {
        const layoutedNode = layoutedById.get(node.id)
        return {
          ...node,
          position: {
            x: layoutedNode?.x ?? node.position.x,
            y: layoutedNode?.y ?? node.position.y,
          },
        }
      }),
      edges,
    ),
  )
  const unusedOrigin = unusedShelfOrigin(layoutedConnectedNodes)

  return {
    nodes: [
      ...layoutedConnectedNodes,
      ...placeUnusedNodes(unusedNodes, unusedOrigin),
    ],
    edges,
  }
}

function resolveColumnOverlaps(
  nodes: Array<Node<CodeNodeData>>,
): Array<Node<CodeNodeData>> {
  const columns = new Map<number, Array<Node<CodeNodeData>>>()

  for (const node of nodes) {
    const columnKey =
      Math.round(node.position.x / COLUMN_X_TOLERANCE) * COLUMN_X_TOLERANCE
    const columnNodes = columns.get(columnKey) ?? []
    columnNodes.push(node)
    columns.set(columnKey, columnNodes)
  }

  const yById = new Map<string, number>()
  const minGap = NODE_HEIGHT + MIN_COLUMN_NODE_GAP

  for (const columnNodes of columns.values()) {
    if (columnNodes.length < 2) continue

    const sortedNodes = [...columnNodes].sort(
      (a, b) => a.position.y - b.position.y,
    )
    const originalTop = sortedNodes[0]?.position.y ?? 0
    const originalBottom =
      (sortedNodes[sortedNodes.length - 1]?.position.y ?? 0) + NODE_HEIGHT
    const packedPositions: number[] = []
    let previousY = -Infinity

    for (const node of sortedNodes) {
      const y = Math.max(node.position.y, previousY + minGap)
      packedPositions.push(y)
      previousY = y
    }

    const packedTop = packedPositions[0] ?? 0
    const packedBottom =
      (packedPositions[packedPositions.length - 1] ?? 0) + NODE_HEIGHT
    const offset =
      (originalTop + originalBottom) / 2 - (packedTop + packedBottom) / 2

    sortedNodes.forEach((node, index) => {
      yById.set(node.id, (packedPositions[index] ?? node.position.y) + offset)
    })
  }

  return nodes.map((node) => {
    const y = yById.get(node.id)
    if (y === undefined) return node

    return {
      ...node,
      position: {
        ...node.position,
        y,
      },
    }
  })
}

function centerEntryNodes(
  nodes: Array<Node<CodeNodeData>>,
  edges: Array<Edge>,
): Array<Node<CodeNodeData>> {
  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const incomingIds = new Set(edges.map((edge) => edge.target))
  const targetsBySource = new Map<string, string[]>()

  for (const edge of edges) {
    if (!nodesById.has(edge.source) || !nodesById.has(edge.target)) continue
    const targets = targetsBySource.get(edge.source) ?? []
    targets.push(edge.target)
    targetsBySource.set(edge.source, targets)
  }

  const entryPlacements = nodes
    .filter((node) => !incomingIds.has(node.id) && targetsBySource.has(node.id))
    .map((node) => {
      const targetCenters = (targetsBySource.get(node.id) ?? [])
        .map((targetId) => nodesById.get(targetId))
        .filter((target): target is Node<CodeNodeData> => Boolean(target))
        .map((target) => target.position.y + NODE_HEIGHT / 2)
        .sort((a, b) => a - b)
      const desiredCenter = median(targetCenters)

      return {
        id: node.id,
        y: desiredCenter - NODE_HEIGHT / 2,
      }
    })
    .sort((a, b) => a.y - b.y)

  const entryYById = new Map<string, number>()
  const minEntryGap = NODE_HEIGHT + 52
  let previousY = -Infinity

  for (const placement of entryPlacements) {
    const y = Math.max(placement.y, previousY + minEntryGap)
    entryYById.set(placement.id, y)
    previousY = y
  }

  return nodes.map((node) => {
    const y = entryYById.get(node.id)
    if (y === undefined) return node

    return {
      ...node,
      position: {
        ...node.position,
        y,
      },
    }
  })
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const middle = Math.floor(values.length / 2)
  if (values.length % 2 === 1) return values[middle] ?? 0

  return ((values[middle - 1] ?? 0) + (values[middle] ?? 0)) / 2
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
