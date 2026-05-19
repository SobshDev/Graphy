import { ReactFlow, useNodesState, useReactFlow } from '@xyflow/react'
import type { Edge, Node, NodeTypes } from '@xyflow/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { CanvasEdges } from '@/modules/graph/components/canvas-edges'
import { CodeNode } from '@/modules/graph/components/code-node'
import { EmptyState } from '@/modules/graph/components/empty-state'
import { FunctionSheet } from '@/modules/graph/components/function-sheet'
import type { FunctionSheetTarget } from '@/modules/graph/components/function-sheet'
import { SectionNode } from '@/modules/graph/components/section-node'
import { SummaryNode } from '@/modules/graph/components/summary-node'
import { useGraph } from '@/modules/graph/hooks/use-graph'
import { useProject } from '@/modules/graph/hooks/use-project'
import { toXYFlow } from '@/modules/graph/lib/to-xyflow'
import type { XYFlowGraph } from '@/modules/graph/lib/to-xyflow'
import type { GraphNodeData } from '@/modules/graph/types'
import { getDesktop } from '@/shared/lib/desktop'
import { clearGraphFocus, useGraphFocusRequest } from '@/shared/lib/graph-focus'
import { DiffBootstrap } from '@/modules/diff-viewer'

const nodeTypes: NodeTypes = {
  code: CodeNode,
  section: SectionNode,
  summary: SummaryNode,
}

export function GraphCanvas() {
  const { graph, folder, loading, error, layout: rawLayout } = useGraph()
  const cachedLayout = rawLayout as XYFlowGraph | null
  const { recents, openFolder, openRecent } = useProject()
  const { fitView } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<GraphNodeData>>(
    [],
  )
  const [layoutEdges, setLayoutEdges] = useState<Edge[]>([])
  const [layouting, setLayouting] = useState(false)
  const [layoutError, setLayoutError] = useState<Error | null>(null)
  const [sheetTarget, setSheetTarget] = useState<FunctionSheetTarget | null>(
    null,
  )
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(),
  )
  const focusRequest = useGraphFocusRequest()
  const lastFocusTs = useRef(0)

  const handleNodeClick = useCallback(
    (_event: unknown, node: Node<GraphNodeData>) => {
      if (node.data.kind === 'summary') {
        setExpandedGroups((current) => {
          const next = new Set(current)
          next.add(node.id)
          return next
        })
        return
      }
      if (node.data.kind === 'section') return

      setSheetTarget({
        displayName: node.data.displayName,
        file: node.data.file,
        startLine: node.data.line,
        endLine: node.data.endLine,
      })
    },
    [],
  )

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) setSheetTarget(null)
  }, [])

  useEffect(() => {
    setExpandedGroups(new Set())
  }, [graph])

  useEffect(() => {
    let cancelled = false
    let fitFrame: number | null = null

    if (!graph) {
      setNodes([])
      setLayoutEdges([])
      setLayouting(false)
      setLayoutError(null)
      return () => {
        cancelled = true
      }
    }

    if (cachedLayout && expandedGroups.size === 0) {
      setNodes(cachedLayout.nodes)
      setLayoutEdges(cachedLayout.edges)
      setLayouting(false)
      setLayoutError(null)
      fitFrame = window.requestAnimationFrame(() => {
        fitView({ padding: 0.25, duration: 220 })
      })
      return () => {
        if (fitFrame !== null) window.cancelAnimationFrame(fitFrame)
      }
    }

    setLayouting(true)
    setLayoutError(null)

    toXYFlow(graph, { expandedGroups })
      .then((xyflow) => {
        if (cancelled) return
        setNodes(xyflow.nodes)
        setLayoutEdges(xyflow.edges)
        fitFrame = window.requestAnimationFrame(() => {
          fitView({ padding: 0.25, duration: 220 })
        })
        if (expandedGroups.size === 0) getDesktop()?.cacheLayout(xyflow)
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
  }, [expandedGroups, fitView, graph, cachedLayout, setNodes])

  useEffect(() => {
    if (!focusRequest || focusRequest.timestamp === lastFocusTs.current) return
    lastFocusTs.current = focusRequest.timestamp
    const matching = nodes
      .filter(
        (n) => n.data.kind === 'code' && n.data.file === focusRequest.file,
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

  if ((loading || layouting) && nodes.length === 0 && !cachedLayout) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center font-mono text-xs">
        {loading ? 'Parsing…' : 'Arranging…'}
      </div>
    )
  }

  return (
    <>
      <DiffBootstrap />
      <ReactFlow
        nodes={nodes}
        edges={[]}
        onNodesChange={onNodesChange}
        onNodeClick={handleNodeClick}
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
        defaultEdgeOptions={{
          type: 'straight',
          interactionWidth: 0,
          selectable: false,
        }}
        minZoom={0.05}
        maxZoom={2.5}
      >
        <CanvasEdges edges={layoutEdges} nodes={nodes} />
      </ReactFlow>
      <FunctionSheet
        root={graph?.root ?? null}
        target={sheetTarget}
        onOpenChange={handleSheetOpenChange}
      />
    </>
  )
}
