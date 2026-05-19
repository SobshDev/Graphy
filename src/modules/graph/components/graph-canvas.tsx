import { ReactFlow, useNodesState, useReactFlow } from '@xyflow/react'
import type { Edge, Node, NodeTypes } from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { EmptyState } from '@/modules/graph/components/empty-state'
import { FileNode } from '@/modules/graph/components/file-node'
import { FolderNode } from '@/modules/graph/components/folder-node'
import { FunctionSheet } from '@/modules/graph/components/function-sheet'
import type { FunctionSheetTarget } from '@/modules/graph/components/function-sheet'
import { useGraph } from '@/modules/graph/hooks/use-graph'
import { useProject } from '@/modules/graph/hooks/use-project'
import { toXYFlow } from '@/modules/graph/lib/to-xyflow'
import type { GraphNodeData } from '@/modules/graph/types'
import { clearGraphFocus, useGraphFocusRequest } from '@/shared/lib/graph-focus'

const nodeTypes: NodeTypes = {
  file: FileNode,
  folder: FolderNode,
}

const OUTGOING_COLOR = '#38bdf8'
const INCOMING_COLOR = '#fbbf24'

export function GraphCanvas() {
  const { graph, folder, loading, error } = useGraph()
  const { recents, openFolder, openRecent } = useProject()
  const { fitView } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<GraphNodeData>>(
    [],
  )
  const [treeEdges, setTreeEdges] = useState<Edge[]>([])
  const [callEdges, setCallEdges] = useState<Edge[]>([])
  const [layouting, setLayouting] = useState(false)
  const [layoutError, setLayoutError] = useState<Error | null>(null)
  const [sheetTarget, setSheetTarget] = useState<FunctionSheetTarget | null>(
    null,
  )
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const focusRequest = useGraphFocusRequest()
  const lastFocusTs = useRef(0)

  const callAdjacency = useMemo(() => {
    const outgoing = new Map<string, Edge[]>()
    const incoming = new Map<string, Edge[]>()
    for (const edge of callEdges) {
      const out = outgoing.get(edge.source) ?? []
      out.push(edge)
      outgoing.set(edge.source, out)
      const inc = incoming.get(edge.target) ?? []
      inc.push(edge)
      incoming.set(edge.target, inc)
    }
    return { outgoing, incoming }
  }, [callEdges])

  const hoveredCallEdges = useMemo<Edge[]>(() => {
    if (!hoveredId) return []
    const out = (callAdjacency.outgoing.get(hoveredId) ?? []).map((edge) => ({
      ...edge,
      style: { stroke: OUTGOING_COLOR, strokeWidth: 1.5 },
      zIndex: 1000,
    }))
    const inc = (callAdjacency.incoming.get(hoveredId) ?? []).map((edge) => ({
      ...edge,
      style: { stroke: INCOMING_COLOR, strokeWidth: 1.5 },
      zIndex: 1000,
    }))
    return [...out, ...inc]
  }, [hoveredId, callAdjacency])

  const renderedEdges = useMemo(
    () => [...treeEdges, ...hoveredCallEdges],
    [treeEdges, hoveredCallEdges],
  )

  const handleNodeClick = useCallback(
    (_event: unknown, node: Node<GraphNodeData>) => {
      if (node.data.kind !== 'file') return

      setSheetTarget({
        displayName: node.data.displayName,
        file: node.data.file,
        line: 1,
      })
    },
    [],
  )

  const handleNodeMouseEnter = useCallback(
    (_event: unknown, node: Node<GraphNodeData>) => {
      if (node.data.kind !== 'file') return
      setHoveredId(node.id)
    },
    [],
  )

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredId(null)
  }, [])

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) setSheetTarget(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    let fitFrame: number | null = null

    if (!graph) {
      setNodes([])
      setTreeEdges([])
      setCallEdges([])
      setLayouting(false)
      setLayoutError(null)
      return () => {
        cancelled = true
      }
    }

    setLayouting(true)
    setLayoutError(null)

    toXYFlow(graph)
      .then((xyflow) => {
        if (cancelled) return
        setNodes(xyflow.nodes)
        setTreeEdges(xyflow.treeEdges)
        setCallEdges(xyflow.callEdges)
        fitFrame = window.requestAnimationFrame(() => {
          fitView({ padding: 0.25, duration: 220 })
        })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLayoutError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        if (!cancelled) setLayouting(false)
      })

    return () => {
      cancelled = true
      if (fitFrame !== null) window.cancelAnimationFrame(fitFrame)
    }
  }, [fitView, graph, setNodes])

  useEffect(() => {
    if (!focusRequest || focusRequest.timestamp === lastFocusTs.current) return
    lastFocusTs.current = focusRequest.timestamp
    const matching = nodes
      .filter(
        (n) => n.data.kind === 'file' && n.data.file === focusRequest.file,
      )
      .map((n) => n.id)
    if (matching.length > 0) {
      fitView({
        nodes: matching.map((id) => ({ id })),
        padding: 0.25,
        duration: 300,
      })
    }
    clearGraphFocus()
  }, [focusRequest, nodes, fitView])

  if (!folder && !loading) {
    return (
      <EmptyState
        recents={recents}
        onOpenFolder={openFolder}
        onOpenRecent={openRecent}
      />
    )
  }

  const visibleError = error ?? layoutError

  if (visibleError) {
    return (
      <div className="text-destructive flex h-full items-center justify-center p-6 font-mono text-xs">
        {visibleError.message}
      </div>
    )
  }

  if ((loading || layouting) && nodes.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center font-mono text-xs">
        {loading ? 'Parsing…' : 'Arranging…'}
      </div>
    )
  }

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={renderedEdges}
        onNodesChange={onNodesChange}
        onNodeClick={handleNodeClick}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        onlyRenderVisibleElements
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        elevateNodesOnSelect={false}
        elevateEdgesOnSelect={false}
        selectNodesOnDrag={false}
        zoomOnDoubleClick={false}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        minZoom={0.05}
        maxZoom={2.5}
      />
      <FunctionSheet
        target={sheetTarget}
        onOpenChange={handleSheetOpenChange}
      />
    </>
  )
}
