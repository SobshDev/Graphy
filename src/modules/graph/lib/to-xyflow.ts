import type { Edge, Node } from '@xyflow/react'

import type { Graph } from '@/modules/parser'
import type {
  FileNodeData,
  FolderNodeData,
  GraphNodeData,
} from '@/modules/graph/types'

const FILE_NODE_WIDTH = 240
const FILE_NODE_HEIGHT = 54
const FOLDER_NODE_WIDTH = 160
const FOLDER_NODE_HEIGHT = 32
const COL_CLEARANCE = 80
const ROW_GAP = 78
const SUBTREE_GAP = 96

const TREE_EDGE_STYLE = {
  stroke: 'var(--muted-foreground)',
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

export async function toXYFlow(graph: Graph): Promise<XYFlowGraph> {
  const { files, callEdges } = collectFiles(graph)
  if (files.length === 0) {
    return { nodes: [], treeEdges: [], callEdges }
  }

  const root = buildFolderTree(files)
  const columnX = computeColumnX(root)
  const placements = layoutTidyTree(root, columnX)
  const { nodes, treeEdges } = emitTree(root, placements)

  return { nodes, treeEdges, callEdges }
}

function computeColumnX(root: FolderTree): number[] {
  // Per-depth max node width: folders contribute FOLDER_NODE_WIDTH at their
  // depth, files contribute FILE_NODE_WIDTH at parent_depth + 1.
  const widths: number[] = []

  function walk(folder: FolderTree, depth: number): void {
    widths[depth] = Math.max(widths[depth] ?? 0, FOLDER_NODE_WIDTH)
    if (folder.files.length > 0) {
      const fileDepth = depth + 1
      widths[fileDepth] = Math.max(widths[fileDepth] ?? 0, FILE_NODE_WIDTH)
    }
    for (const sub of folder.subfolders) walk(sub, depth + 1)
  }
  walk(root, 0)

  const xs: number[] = []
  let cursor = 0
  for (let i = 0; i < widths.length; i++) {
    xs[i] = cursor
    cursor += (widths[i] ?? FOLDER_NODE_WIDTH) + COL_CLEARANCE
  }
  return xs
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

function layoutTidyTree(
  root: FolderTree,
  columnX: number[],
): Map<string, Placed> {
  // Tracks each node's *center* y. Top-left positions are derived at
  // emit time using each node kind's own height, so slim folder nodes
  // stay visually aligned with the taller file cards.
  const placements = new Map<string, Placed>()
  let nextCenterY = FILE_NODE_HEIGHT / 2

  function place(folder: FolderTree, depth: number): number {
    const x = columnX[depth] ?? 0
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
        x: columnX[depth + 1] ?? 0,
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
      x,
      y: centerY,
    })
    return centerY
  }

  place(root, 0)
  return placements
}

function emitTree(
  root: FolderTree,
  placements: Map<string, Placed>,
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
        x: fileCenter.x,
        y: fileCenter.y - FILE_NODE_HEIGHT / 2,
      },
      width: FILE_NODE_WIDTH,
      height: FILE_NODE_HEIGHT,
      data: { ...file.data, depth },
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
    }
    nodes.push({
      id,
      type: 'folder',
      position: {
        x: center.x,
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
        type: 'smoothstep',
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
        type: 'smoothstep',
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

function collectFiles(graph: Graph): {
  files: Array<{ id: string; data: FileNodeData }>
  callEdges: Edge[]
} {
  const fileBySymbolId = new Map<string, string>()
  const fileSymbolCount = new Map<string, number>()

  for (const node of graph.nodes) {
    fileBySymbolId.set(node.id, node.file)
    fileSymbolCount.set(node.file, (fileSymbolCount.get(node.file) ?? 0) + 1)
  }

  const edgeKeys = new Set<string>()
  const callEdges: Edge[] = []

  for (const edge of graph.edges) {
    const source = fileBySymbolId.get(edge.source)
    const target = fileBySymbolId.get(edge.target)
    if (!source || !target || source === target) continue

    const key = `${source}->${target}`
    if (edgeKeys.has(key)) continue
    edgeKeys.add(key)

    callEdges.push({
      id: `call:${key}`,
      source,
      target,
      type: 'smoothstep',
    })
  }

  const files = Array.from(fileSymbolCount.entries()).map(
    ([file, symbolCount]) => {
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
          symbolCount,
          depth: 0,
        },
      }
    },
  )

  return { files, callEdges }
}
