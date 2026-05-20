import type { Edge, Node } from '@xyflow/react'

import type { Graph } from '@/modules/parser'
import type {
  FileNodeData,
  FolderNodeData,
  GraphLayout,
  GraphNodeData,
} from '@/modules/graph/types'

const FILE_NODE_WIDTH = 240
const FILE_NODE_HEIGHT = 54
const FOLDER_NODE_WIDTH = 160
const FOLDER_NODE_HEIGHT = 32

const RING_BASE = 220
const RING_STEP = 240
const MIN_ARC = 170

const COL_CLEARANCE = 80
const ROW_GAP = 78
const SUBTREE_GAP = 96

const TREE_EDGE_STYLE = {
  stroke: 'color-mix(in oklab, var(--muted-foreground) 35%, var(--canvas))',
  strokeWidth: 2,
}

export interface XYFlowGraph {
  nodes: Array<Node<GraphNodeData>>
  treeEdges: Edge[]
  callEdges: Edge[]
}

interface FolderTree {
  path: string
  name: string
  subfolders: FolderTree[]
  files: Array<{ id: string; data: FileNodeData }>
}

interface Placed {
  id: string
  x: number
  y: number
}

export async function toXYFlow(
  graph: Graph,
  layout: GraphLayout = 'tree',
): Promise<XYFlowGraph> {
  const edgeType = layout === 'radial' ? 'straight' : 'smoothstep'
  const { files, callEdges } = collectFiles(graph, edgeType, layout)
  if (files.length === 0) {
    return { nodes: [], treeEdges: [], callEdges }
  }

  const root = buildFolderTree(files)
  const placements =
    layout === 'radial' ? layoutRadial(root) : layoutTidyTree(root)
  const { nodes, treeEdges } = emitTree(root, placements, layout, edgeType)

  return { nodes, treeEdges, callEdges }
}

function radiusForDepth(depth: number): number {
  if (depth < 0) return 0
  return RING_BASE + depth * RING_STEP
}

function buildFolderTree(
  files: Array<{ id: string; data: FileNodeData }>,
): FolderTree {
  const root: FolderTree = {
    path: '',
    name: '/',
    subfolders: [],
    files: [],
  }
  const byPath = new Map<string, FolderTree>([['', root]])

  function ensure(folderPath: string): FolderTree {
    const existing = byPath.get(folderPath)
    if (existing) return existing

    const parts = folderPath.split('/')
    const name = parts[parts.length - 1] ?? folderPath
    const parentPath = parts.slice(0, -1).join('/')
    const parent = ensure(parentPath)
    const folder: FolderTree = {
      path: folderPath,
      name,
      subfolders: [],
      files: [],
    }
    parent.subfolders.push(folder)
    byPath.set(folderPath, folder)
    return folder
  }

  for (const file of files) {
    ensure(file.data.folder).files.push(file)
  }

  sortTree(root)
  return root
}

function sortTree(folder: FolderTree): void {
  folder.subfolders.sort((a, b) => a.name.localeCompare(b.name))
  folder.files.sort((a, b) =>
    a.data.displayName.localeCompare(b.data.displayName),
  )
  for (const sub of folder.subfolders) sortTree(sub)
}

function layoutTidyTree(root: FolderTree): Map<string, Placed> {
  // Columns left-to-right, one per depth. All nodes in a column share the
  // same left edge so folders and files line up vertically even though they
  // have different widths. Children stack vertically inside their parent's
  // sub-range; placements store node *centers* (per-node, width-aware).
  const widths: number[] = []
  function walkWidth(folder: FolderTree, depth: number): void {
    widths[depth] = Math.max(widths[depth] ?? 0, FOLDER_NODE_WIDTH)
    if (folder.files.length > 0) {
      widths[depth + 1] = Math.max(widths[depth + 1] ?? 0, FILE_NODE_WIDTH)
    }
    for (const sub of folder.subfolders) walkWidth(sub, depth + 1)
  }
  walkWidth(root, 0)

  const columnLefts: number[] = []
  let xCursor = 0
  for (let i = 0; i < widths.length; i++) {
    const w = widths[i] ?? FOLDER_NODE_WIDTH
    columnLefts[i] = xCursor
    xCursor += w + COL_CLEARANCE
  }

  const placements = new Map<string, Placed>()
  let nextCenterY = FILE_NODE_HEIGHT / 2

  function place(folder: FolderTree, depth: number): number {
    const folderCenterX = (columnLefts[depth] ?? 0) + FOLDER_NODE_WIDTH / 2
    const fileCenterX = (columnLefts[depth + 1] ?? 0) + FILE_NODE_WIDTH / 2
    const childCenters: number[] = []

    folder.subfolders.forEach((sub, idx) => {
      if (idx > 0) nextCenterY += SUBTREE_GAP
      childCenters.push(place(sub, depth + 1))
    })

    if (folder.subfolders.length > 0 && folder.files.length > 0) {
      nextCenterY += SUBTREE_GAP
    }

    for (const file of folder.files) {
      const centerY = nextCenterY
      nextCenterY += ROW_GAP
      placements.set(file.id, {
        id: file.id,
        x: fileCenterX,
        y: centerY,
      })
      childCenters.push(centerY)
    }

    let centerY: number
    if (childCenters.length === 0) {
      centerY = nextCenterY
      nextCenterY += ROW_GAP
    } else {
      const first = childCenters[0] ?? 0
      const last = childCenters[childCenters.length - 1] ?? 0
      centerY = (first + last) / 2
    }
    placements.set(folderId(folder.path), {
      id: folderId(folder.path),
      x: folderCenterX,
      y: centerY,
    })
    return centerY
  }

  place(root, 0)
  return placements
}

function layoutRadial(root: FolderTree): Map<string, Placed> {
  // Each node requires a minimum arc length (MIN_ARC) at its ring; an
  // internal folder needs at least the sum of its children's required
  // angles. The whole tree is uniformly scaled so root's required angle
  // fits inside 2π.
  const placements = new Map<string, Placed>()
  const angleCache = new Map<FolderTree, number>()

  function requiredAngle(folder: FolderTree, depth: number): number {
    const cached = angleCache.get(folder)
    if (cached !== undefined) return cached

    let sum = 0
    for (const sub of folder.subfolders) {
      sum += requiredAngle(sub, depth + 1)
    }
    if (folder.files.length > 0) {
      sum += (folder.files.length * MIN_ARC) / radiusForDepth(depth + 1)
    }
    if (sum === 0) {
      sum = MIN_ARC / Math.max(radiusForDepth(depth), 1)
    }
    angleCache.set(folder, sum)
    return sum
  }

  let rootTotal = 0
  for (const sub of root.subfolders) rootTotal += requiredAngle(sub, 0)
  if (root.files.length > 0) {
    rootTotal += (root.files.length * MIN_ARC) / radiusForDepth(0)
  }
  const scale = Math.max(1, rootTotal / (2 * Math.PI))

  function ringRadius(depth: number): number {
    if (depth < 0) return 0
    return scale * radiusForDepth(depth)
  }

  function placeSubtree(
    folder: FolderTree,
    depth: number,
    start: number,
  ): void {
    const span = requiredAngle(folder, depth) / scale
    const angle = start + span / 2
    const r = ringRadius(depth)
    placements.set(folderId(folder.path), {
      id: folderId(folder.path),
      x: r * Math.cos(angle),
      y: r * Math.sin(angle),
    })

    let cursor = start
    for (const sub of folder.subfolders) {
      const subSpan = requiredAngle(sub, depth + 1) / scale
      placeSubtree(sub, depth + 1, cursor)
      cursor += subSpan
    }
    for (const file of folder.files) {
      const fileSpan = MIN_ARC / radiusForDepth(depth + 1) / scale
      const fileAngle = cursor + fileSpan / 2
      const fr = ringRadius(depth + 1)
      placements.set(file.id, {
        id: file.id,
        x: fr * Math.cos(fileAngle),
        y: fr * Math.sin(fileAngle),
      })
      cursor += fileSpan
    }
  }

  let cursor = -Math.PI / 2
  for (const sub of root.subfolders) {
    placeSubtree(sub, 0, cursor)
    cursor += requiredAngle(sub, 0) / scale
  }
  for (const file of root.files) {
    const fileSpan = MIN_ARC / radiusForDepth(0) / scale
    const fileAngle = cursor + fileSpan / 2
    const fr = ringRadius(0)
    placements.set(file.id, {
      id: file.id,
      x: fr * Math.cos(fileAngle),
      y: fr * Math.sin(fileAngle),
    })
    cursor += fileSpan
  }

  return placements
}

function emitTree(
  root: FolderTree,
  placements: Map<string, Placed>,
  layout: GraphLayout,
  edgeType: 'straight' | 'smoothstep',
): { nodes: Array<Node<GraphNodeData>>; treeEdges: Edge[] } {
  const nodes: Array<Node<GraphNodeData>> = []
  const treeEdges: Edge[] = []

  function pushFile(
    file: { id: string; data: FileNodeData },
    depth: number,
  ): void {
    const fileCenter = placements.get(file.id) ?? { x: 0, y: 0 }
    nodes.push({
      id: file.id,
      type: 'file',
      position: {
        x: fileCenter.x - FILE_NODE_WIDTH / 2,
        y: fileCenter.y - FILE_NODE_HEIGHT / 2,
      },
      width: FILE_NODE_WIDTH,
      height: FILE_NODE_HEIGHT,
      data: { ...file.data, depth, layout },
    })
  }

  function visit(folder: FolderTree, depth: number): void {
    const id = folderId(folder.path)
    const center = placements.get(id) ?? { x: 0, y: 0 }
    const folderData: FolderNodeData = {
      kind: 'folder',
      path: folder.path,
      name: folder.name,
      depth,
      layout,
    }
    nodes.push({
      id,
      type: 'folder',
      position: {
        x: center.x - FOLDER_NODE_WIDTH / 2,
        y: center.y - FOLDER_NODE_HEIGHT / 2,
      },
      width: FOLDER_NODE_WIDTH,
      height: FOLDER_NODE_HEIGHT,
      selectable: false,
      draggable: false,
      data: folderData,
    })

    for (const sub of folder.subfolders) {
      const childId = folderId(sub.path)
      treeEdges.push({
        id: `tree:${id}->${childId}`,
        source: id,
        target: childId,
        type: edgeType,
        style: TREE_EDGE_STYLE,
      })
      visit(sub, depth + 1)
    }

    for (const file of folder.files) {
      pushFile(file, depth + 1)
      treeEdges.push({
        id: `tree:${id}->${file.id}`,
        source: id,
        target: file.id,
        type: edgeType,
        style: TREE_EDGE_STYLE,
      })
    }
  }

  for (const sub of root.subfolders) visit(sub, 0)
  for (const file of root.files) pushFile(file, 0)

  return { nodes, treeEdges }
}

function folderId(folderPath: string): string {
  return `dir:${folderPath || '/'}`
}

function collectFiles(
  graph: Graph,
  edgeType: 'straight' | 'smoothstep',
  layout: GraphLayout,
): {
  files: Array<{ id: string; data: FileNodeData }>
  callEdges: Edge[]
} {
  const fileBySymbolId = new Map<string, string>()
  const fileSet = new Set<string>()

  for (const node of graph.nodes) {
    fileBySymbolId.set(node.id, node.file)
    fileSet.add(node.file)
  }

  const edgeKeys = new Set<string>()
  const callEdges: Edge[] = []
  const callsOut = new Map<string, number>()
  const callsIn = new Map<string, number>()

  for (const edge of graph.edges) {
    const source = fileBySymbolId.get(edge.source)
    const target = fileBySymbolId.get(edge.target)
    if (!source || !target || source === target) continue

    const key = `${source}->${target}`
    if (edgeKeys.has(key)) continue
    edgeKeys.add(key)

    callsOut.set(source, (callsOut.get(source) ?? 0) + 1)
    callsIn.set(target, (callsIn.get(target) ?? 0) + 1)

    callEdges.push({
      id: `call:${key}`,
      source,
      target,
      type: edgeType,
    })
  }

  const files = Array.from(fileSet).map((file) => {
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
        layout,
      },
    }
  })

  return { files, callEdges }
}
