import dagre from '@dagrejs/dagre'
import type { Edge, Node } from '@xyflow/react'

import type { EdgeType, Graph } from '@/modules/parser'
import type { FileNodeData, GraphNodeData } from '@/modules/graph/types'

const FILE_NODE_WIDTH = 240
const FILE_NODE_HEIGHT = 54

// Sugiyama-style layered layout via dagre with folder clustering.
const RANK_SEP = 220
const NODE_SEP = 60
const EDGE_SEP = 24
const CLUSTER_PAD = 16

const CALL_EDGE_TYPES: ReadonlySet<EdgeType> = new Set<EdgeType>([
  'calls',
  'references',
  'renders',
  'uses-hook',
  'instantiates',
  'extends',
  'implements',
  'passes-callback',
])

const CALL_EDGE_STYLE = {
  stroke: 'color-mix(in oklab, var(--muted-foreground) 35%, var(--canvas))',
  strokeWidth: 2,
}

export interface XYFlowCallGraph {
  nodes: Array<Node<GraphNodeData>>
  treeEdges: Edge[]
  callEdges: Edge[]
}

function clusterId(folder: string): string {
  return `cluster:${folder || '/'}`
}

export async function toXYFlowCalls(graph: Graph): Promise<XYFlowCallGraph> {
  const { files, edges } = collectFileGraph(graph)
  if (files.length === 0) {
    return { nodes: [], treeEdges: [], callEdges: [] }
  }

  const folders = new Set<string>()
  for (const file of files) folders.add(file.data.folder)

  const g = new dagre.graphlib.Graph({
    directed: true,
    multigraph: false,
    compound: true,
  })
  g.setGraph({
    rankdir: 'LR',
    ranksep: RANK_SEP,
    nodesep: NODE_SEP,
    edgesep: EDGE_SEP,
    marginx: 40,
    marginy: 40,
    acyclicer: 'greedy',
    ranker: 'tight-tree',
  })
  g.setDefaultEdgeLabel(() => ({}))

  for (const folder of folders) {
    g.setNode(clusterId(folder), {
      label: folder || '/',
      clusterLabelPos: 'top',
      paddingTop: CLUSTER_PAD + 12,
      paddingBottom: CLUSTER_PAD,
      paddingLeft: CLUSTER_PAD,
      paddingRight: CLUSTER_PAD,
    })
  }

  for (const file of files) {
    g.setNode(file.id, { width: FILE_NODE_WIDTH, height: FILE_NODE_HEIGHT })
    g.setParent(file.id, clusterId(file.data.folder))
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  const fileNodes: Array<Node<FileNodeData>> = files.map((file) => {
    const placed = g.node(file.id)
    return {
      id: file.id,
      type: 'file',
      position: {
        x: (placed?.x ?? 0) - FILE_NODE_WIDTH / 2,
        y: (placed?.y ?? 0) - FILE_NODE_HEIGHT / 2,
      },
      width: FILE_NODE_WIDTH,
      height: FILE_NODE_HEIGHT,
      data: file.data,
    }
  })

  const callEdges: Edge[] = edges.map((e) => ({
    id: `call:${e.source}->${e.target}`,
    source: e.source,
    target: e.target,
    type: 'straight',
    style: CALL_EDGE_STYLE,
  }))

  return { nodes: fileNodes, treeEdges: [], callEdges }
}

function collectFileGraph(graph: Graph): {
  files: Array<{ id: string; data: FileNodeData }>
  edges: Array<{ source: string; target: string }>
} {
  const fileBySymbolId = new Map<string, string>()
  const fileSet = new Set<string>()

  for (const node of graph.nodes) {
    fileBySymbolId.set(node.id, node.file)
    fileSet.add(node.file)
  }

  const edgeKeys = new Set<string>()
  const edges: Array<{ source: string; target: string }> = []
  const callsOut = new Map<string, number>()
  const callsIn = new Map<string, number>()

  for (const edge of graph.edges) {
    if (!CALL_EDGE_TYPES.has(edge.type)) continue
    const source = fileBySymbolId.get(edge.source)
    const target = fileBySymbolId.get(edge.target)
    if (!source || !target || source === target) continue

    const key = `${source}->${target}`
    if (edgeKeys.has(key)) continue
    edgeKeys.add(key)

    callsOut.set(source, (callsOut.get(source) ?? 0) + 1)
    callsIn.set(target, (callsIn.get(target) ?? 0) + 1)
    edges.push({ source, target })
  }

  const connected = new Set<string>()
  for (const e of edges) {
    connected.add(e.source)
    connected.add(e.target)
  }

  const files = Array.from(fileSet)
    .filter((f) => connected.has(f) || fileSet.size <= 1)
    .map((file) => {
      const parts = file.split('/')
      const displayName = parts[parts.length - 1] ?? file
      const folder = parts.slice(0, -1).join('/')
      return {
        id: file,
        data: {
          kind: 'file' as const,
          file,
          displayName,
          folder,
          callsOut: callsOut.get(file) ?? 0,
          callsIn: callsIn.get(file) ?? 0,
          depth: 0,
          layout: 'tree' as const,
        },
      }
    })

  return { files, edges }
}
