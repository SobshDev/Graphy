import { useStore } from '@xyflow/react'
import type { Edge, Node } from '@xyflow/react'
import { useEffect, useMemo, useRef } from 'react'

import type { GraphNodeData } from '@/modules/graph/types'

const CODE_NODE_WIDTH = 240
const CODE_NODE_HEIGHT = 54

type CanvasEdgesProps = {
  edges: Edge[]
  nodes: Array<Node<GraphNodeData>>
}

type EdgeEndpoint = {
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
}

type AbsoluteNode = {
  x: number
  y: number
  width: number
  height: number
}

export function CanvasEdges({ edges, nodes }: CanvasEdgesProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const transform = useStore((state) => state.transform)
  const width = useStore((state) => state.width)
  const height = useStore((state) => state.height)
  const edgeEndpoints = useMemo(
    () => buildEdgeEndpoints(nodes, edges),
    [edges, nodes],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const frame = window.requestAnimationFrame(() => {
      const ratio = window.devicePixelRatio || 1
      const pixelWidth = Math.max(1, Math.floor(width * ratio))
      const pixelHeight = Math.max(1, Math.floor(height * ratio))

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
      }

      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, width, height)

      if (edgeEndpoints.length === 0) return

      const edgeColor = getComputedStyle(canvas).color

      context.save()
      context.translate(transform[0], transform[1])
      context.scale(transform[2], transform[2])
      context.strokeStyle = edgeColor || 'rgba(148, 163, 184, 0.46)'
      context.globalAlpha = 0.58
      context.lineWidth = Math.max(1 / transform[2], 0.7)
      context.lineCap = 'square'

      const viewLeft = -transform[0] / transform[2]
      const viewTop = -transform[1] / transform[2]
      const viewRight = viewLeft + width / transform[2]
      const viewBottom = viewTop + height / transform[2]

      context.beginPath()
      for (const endpoint of edgeEndpoints) {
        if (
          !isEdgeVisible(endpoint, viewLeft, viewTop, viewRight, viewBottom)
        ) {
          continue
        }

        context.moveTo(endpoint.sourceX, endpoint.sourceY)
        context.lineTo(endpoint.targetX, endpoint.targetY)
      }
      context.stroke()
      context.restore()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [edgeEndpoints, height, transform, width])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="graph-canvas-edges pointer-events-none absolute inset-0 z-[1]"
    />
  )
}

function buildEdgeEndpoints(
  nodes: Array<Node<GraphNodeData>>,
  edges: Edge[],
): EdgeEndpoint[] {
  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const absoluteNodes = new Map<string, AbsoluteNode>()

  for (const node of nodes) {
    resolveAbsoluteNode(node.id, nodesById, absoluteNodes)
  }

  return edges
    .map((edge) => {
      const source = absoluteNodes.get(edge.source)
      const target = absoluteNodes.get(edge.target)
      if (!source || !target) return null

      return {
        sourceX: source.x + source.width,
        sourceY: source.y + source.height / 2,
        targetX: target.x,
        targetY: target.y + target.height / 2,
      }
    })
    .filter((endpoint): endpoint is EdgeEndpoint => endpoint !== null)
}

function resolveAbsoluteNode(
  id: string,
  nodesById: Map<string, Node<GraphNodeData>>,
  absoluteNodes: Map<string, AbsoluteNode>,
): AbsoluteNode | null {
  const existing = absoluteNodes.get(id)
  if (existing) return existing

  const node = nodesById.get(id)
  if (!node) return null

  const parent = node.parentId
    ? resolveAbsoluteNode(node.parentId, nodesById, absoluteNodes)
    : null
  const absoluteNode = {
    x: node.position.x + (parent?.x ?? 0),
    y: node.position.y + (parent?.y ?? 0),
    width: nodeWidth(node),
    height: nodeHeight(node),
  }

  absoluteNodes.set(id, absoluteNode)
  return absoluteNode
}

function nodeWidth(node: Node<GraphNodeData>): number {
  return node.data.kind === 'section' ? node.data.width : CODE_NODE_WIDTH
}

function nodeHeight(node: Node<GraphNodeData>): number {
  return node.data.kind === 'section' ? node.data.height : CODE_NODE_HEIGHT
}

function isEdgeVisible(
  edge: EdgeEndpoint,
  viewLeft: number,
  viewTop: number,
  viewRight: number,
  viewBottom: number,
): boolean {
  const minX = Math.min(edge.sourceX, edge.targetX)
  const maxX = Math.max(edge.sourceX, edge.targetX)
  const minY = Math.min(edge.sourceY, edge.targetY)
  const maxY = Math.max(edge.sourceY, edge.targetY)

  return (
    maxX >= viewLeft &&
    minX <= viewRight &&
    maxY >= viewTop &&
    minY <= viewBottom
  )
}
