import type { Edge, Node } from '@xyflow/react'
import ELK from 'elkjs/lib/elk.bundled.js'
import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk.bundled.js'

import type { Graph } from '@/modules/parser'
import type { GraphNodeData, SectionNodeData } from '@/modules/graph/types'

const NODE_WIDTH = 240
const NODE_HEIGHT = 54
const COLUMN_X_TOLERANCE = 8
const MIN_COLUMN_NODE_GAP = 18
const COMPONENT_ROW_WIDTH = 3600
const COMPONENT_GAP_X = 220
const COMPONENT_GAP_Y = 160
const SECTION_PADDING_X = 48
const SECTION_PADDING_TOP = 42
const SECTION_PADDING_BOTTOM = 42
const SECTION_MIN_WIDTH = 420
const SECTION_MIN_HEIGHT = 180
const UNUSED_COLUMNS = 6
const UNUSED_COLUMN_GAP = 300
const UNUSED_ROW_GAP = 92
const UNUSED_SECTION_GAP = 180

const elk = new ELK()

export interface XYFlowGraph {
  nodes: Array<Node<GraphNodeData>>
  edges: Array<Edge>
}

export async function toXYFlow(graph: Graph): Promise<XYFlowGraph> {
  const { nodes, edges } = graphToFlow(graph)

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

  const layoutedConnectedNodes = packComponents(
    await Promise.all(
      splitConnectedComponents(connectedNodes, edges).map((component) =>
        layoutComponent(component.nodes, component.edges),
      ),
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

interface ConnectedComponent {
  nodes: Array<Node<GraphNodeData>>
  edges: Array<Edge>
}

interface LayoutedComponent {
  nodes: Array<Node<GraphNodeData>>
  width: number
  height: number
}

function splitConnectedComponents(
  nodes: Array<Node<GraphNodeData>>,
  edges: Array<Edge>,
): ConnectedComponent[] {
  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const adjacency = new Map<string, Set<string>>()

  for (const node of nodes) adjacency.set(node.id, new Set())

  for (const edge of edges) {
    if (!nodesById.has(edge.source) || !nodesById.has(edge.target)) continue
    adjacency.get(edge.source)?.add(edge.target)
    adjacency.get(edge.target)?.add(edge.source)
  }

  const visited = new Set<string>()
  const components: ConnectedComponent[] = []

  for (const node of nodes) {
    if (visited.has(node.id)) continue

    const stack = [node.id]
    const componentIds = new Set<string>()

    while (stack.length > 0) {
      const id = stack.pop()
      if (!id || visited.has(id)) continue

      visited.add(id)
      componentIds.add(id)

      for (const next of adjacency.get(id) ?? []) {
        if (!visited.has(next)) stack.push(next)
      }
    }

    components.push({
      nodes: nodes.filter((candidate) => componentIds.has(candidate.id)),
      edges: edges.filter(
        (edge) =>
          componentIds.has(edge.source) && componentIds.has(edge.target),
      ),
    })
  }

  return components.sort((a, b) => b.nodes.length - a.nodes.length)
}

async function layoutComponent(
  nodes: Array<Node<GraphNodeData>>,
  edges: Array<Edge>,
): Promise<LayoutedComponent> {
  if (nodes.length === 0) return { nodes: [], width: 0, height: 0 }

  if (nodes.length === 1) {
    const node = nodes[0]
    const framed = frameComponent([node], edges)

    return {
      nodes: framed.nodes,
      width: framed.width,
      height: framed.height,
    }
  }

  const layoutedGraph = await elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': '44',
      'elk.layered.spacing.nodeNodeBetweenLayers': '135',
      'elk.layered.spacing.edgeEdgeBetweenLayers': '18',
      'elk.layered.spacing.edgeNodeBetweenLayers': '28',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.cycleBreaking.strategy': 'GREEDY',
    },
    children: nodes.map<ElkNode>((node) => ({
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
  const layoutedNodes = normalizeNodes(
    resolveColumnOverlaps(
      centerEntryNodes(
        nodes.map((node) => {
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
    ),
  )
  const bounds = nodeBounds(layoutedNodes)
  const framed = frameComponent(layoutedNodes, edges)

  return {
    nodes: framed.nodes,
    width: Math.max(bounds.width, framed.width),
    height: Math.max(bounds.height, framed.height),
  }
}

function frameComponent(
  nodes: Array<Node<GraphNodeData>>,
  edges: Array<Edge>,
): LayoutedComponent {
  const bounds = nodeBounds(nodes)
  const contentWidth = bounds.width + SECTION_PADDING_X * 2
  const contentHeight =
    bounds.height + SECTION_PADDING_TOP + SECTION_PADDING_BOTTOM
  const width = Math.max(contentWidth, SECTION_MIN_WIDTH)
  const height = Math.max(contentHeight, SECTION_MIN_HEIGHT)
  const extraX = Math.max(0, width - contentWidth) / 2
  const extraY = Math.max(0, height - contentHeight) / 2
  const sectionId = `section:${entryNodeIds(nodes, edges).join('|') || nodes[0]?.id || 'empty'}`
  const label = sectionLabel(nodes, edges)
  const childNodes = nodes.map((node) => ({
    ...node,
    parentId: sectionId,
    extent: 'parent' as const,
    position: {
      x: node.position.x + SECTION_PADDING_X + extraX,
      y: node.position.y + SECTION_PADDING_TOP + extraY,
    },
  }))
  const sectionNode: Node<SectionNodeData> = {
    id: sectionId,
    type: 'section',
    position: { x: 0, y: 0 },
    selectable: false,
    draggable: false,
    data: {
      kind: 'section',
      label: label.title,
      subtitle: label.subtitle,
      width,
      height,
    },
    style: { width, height },
  }

  return {
    nodes: [sectionNode, ...childNodes],
    width,
    height,
  }
}

function entryNodeIds(
  nodes: Array<Node<GraphNodeData>>,
  edges: Array<Edge>,
): string[] {
  const ids = new Set(nodes.map((node) => node.id))
  const incomingIds = new Set(
    edges
      .filter((edge) => ids.has(edge.source) && ids.has(edge.target))
      .map((edge) => edge.target),
  )
  const outgoingIds = new Set(
    edges
      .filter((edge) => ids.has(edge.source) && ids.has(edge.target))
      .map((edge) => edge.source),
  )

  return nodes
    .filter((node) => !incomingIds.has(node.id) && outgoingIds.has(node.id))
    .map((node) => node.id)
    .sort()
}

function sectionLabel(
  nodes: Array<Node<GraphNodeData>>,
  edges: Array<Edge>,
): { title: string; subtitle: string } {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const entries = entryNodeIds(nodes, edges)
    .map((id) => byId.get(id))
    .filter((node): node is Node<GraphNodeData> => Boolean(node))
  const firstEntry = entries.length > 0 ? entries[0] : undefined
  let title = 'Entry flow'
  if (firstEntry?.data.kind === 'code') title = firstEntry.data.displayName
  const suffix = entries.length > 1 ? ` + ${entries.length - 1} more` : ''

  return {
    title: `${title}${suffix}`,
    subtitle: `${nodes.length} symbols`,
  }
}

function packComponents(
  components: LayoutedComponent[],
): Array<Node<GraphNodeData>> {
  const packedNodes: Array<Node<GraphNodeData>> = []
  let x = 0
  let y = 0
  let rowHeight = 0

  for (const component of components) {
    if (x > 0 && x + component.width > COMPONENT_ROW_WIDTH) {
      x = 0
      y += rowHeight + COMPONENT_GAP_Y
      rowHeight = 0
    }

    packedNodes.push(
      ...component.nodes.map((node) => ({
        ...node,
        position: {
          x: node.parentId ? node.position.x : node.position.x + x,
          y: node.parentId ? node.position.y : node.position.y + y,
        },
      })),
    )

    x += component.width + COMPONENT_GAP_X
    rowHeight = Math.max(rowHeight, component.height)
  }

  return packedNodes
}

function resolveColumnOverlaps(
  nodes: Array<Node<GraphNodeData>>,
): Array<Node<GraphNodeData>> {
  const columns = new Map<number, Array<Node<GraphNodeData>>>()

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
  nodes: Array<Node<GraphNodeData>>,
  edges: Array<Edge>,
): Array<Node<GraphNodeData>> {
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
        .filter((target): target is Node<GraphNodeData> => Boolean(target))
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

function normalizeNodes(
  nodes: Array<Node<GraphNodeData>>,
): Array<Node<GraphNodeData>> {
  const bounds = nodeBounds(nodes)

  return nodes.map((node) => ({
    ...node,
    position: {
      x: node.position.x - bounds.minX,
      y: node.position.y - bounds.minY,
    },
  }))
}

function nodeBounds(nodes: Array<Node<GraphNodeData>>): {
  minX: number
  minY: number
  width: number
  height: number
} {
  const bounds = nodes.reduce(
    (acc, node) => ({
      minX: Math.min(acc.minX, node.position.x),
      minY: Math.min(acc.minY, node.position.y),
      maxX: Math.max(acc.maxX, node.position.x + NODE_WIDTH),
      maxY: Math.max(acc.maxY, node.position.y + NODE_HEIGHT),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  )

  if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.minY)) {
    return { minX: 0, minY: 0, width: 0, height: 0 }
  }

  return {
    minX: bounds.minX,
    minY: bounds.minY,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  }
}

function placeUnusedNodes(
  nodes: Array<Node<GraphNodeData>>,
  origin: { x: number; y: number },
): Array<Node<GraphNodeData>> {
  return nodes.map((node, index) => ({
    ...node,
    position: {
      x: origin.x + (index % UNUSED_COLUMNS) * UNUSED_COLUMN_GAP,
      y: origin.y + Math.floor(index / UNUSED_COLUMNS) * UNUSED_ROW_GAP,
    },
  }))
}

function unusedShelfOrigin(nodes: Array<Node<GraphNodeData>>): {
  x: number
  y: number
} {
  const bounds = nodes.reduce(
    (acc, node) => ({
      minX: Math.min(acc.minX, node.position.x),
      maxY: Math.max(acc.maxY, node.position.y + nodeHeight(node)),
    }),
    { minX: Infinity, maxY: -Infinity },
  )

  return {
    x: Number.isFinite(bounds.minX) ? bounds.minX : 0,
    y: Number.isFinite(bounds.maxY) ? bounds.maxY + UNUSED_SECTION_GAP : 0,
  }
}

function nodeHeight(node: Node<GraphNodeData>): number {
  return node.data.kind === 'section' ? node.data.height : NODE_HEIGHT
}

function qualifiedName(id: string, fallback: string): string {
  const idx = id.indexOf('::')
  return idx >= 0 ? id.slice(idx + 2) : fallback
}

function graphToFlow(graph: Graph): XYFlowGraph {
  const nodes: Array<Node<GraphNodeData>> = graph.nodes.map((node) => ({
    id: node.id,
    type: 'code',
    position: { x: 0, y: 0 },
    data: {
      kind: 'code',
      displayName: qualifiedName(node.id, node.name),
      type: node.type,
      signature: node.signature,
      file: node.file,
      line: node.line,
      endLine: node.endLine,
      isAsync: node.isAsync,
      isExported: node.isExported,
      isStatic: node.isStatic,
      bodyLines: node.bodyLines,
      inDegree: node.inDegree,
      outDegree: node.outDegree,
    },
  }))

  const edgeKeys = new Set<string>()
  const edges: Edge[] = []

  for (const edge of graph.edges) {
    if (edge.source === edge.target) continue
    const key = `${edge.source}->${edge.target}`
    if (edgeKeys.has(key)) continue
    edgeKeys.add(key)

    edges.push({
      id: key,
      source: edge.source,
      target: edge.target,
      type: 'straight',
    })
  }

  return { nodes, edges }
}
