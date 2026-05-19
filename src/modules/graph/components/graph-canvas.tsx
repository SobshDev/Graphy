import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import type { Edge, Node, NodeTypes } from '@xyflow/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { CodeNode } from '@/modules/graph/components/code-node'
import { EmptyState } from '@/modules/graph/components/empty-state'
import { FunctionSheet } from '@/modules/graph/components/function-sheet'
import type { FunctionSheetTarget } from '@/modules/graph/components/function-sheet'
import { useGraph } from '@/modules/graph/hooks/use-graph'
import { useProject } from '@/modules/graph/hooks/use-project'
import { toXYFlow } from '@/modules/graph/lib/to-xyflow'
import type { CodeNodeData } from '@/modules/graph/types'
import { clearGraphFocus, useGraphFocusRequest } from '@/shared/lib/graph-focus'

const nodeTypes: NodeTypes = { code: CodeNode }

export function GraphCanvas() {
  const { graph, folder, loading, error } = useGraph()
  const { recents, openFolder, openRecent } = useProject()
  const { fitView } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CodeNodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [layouting, setLayouting] = useState(false)
  const [layoutError, setLayoutError] = useState<Error | null>(null)
  const [sheetTarget, setSheetTarget] = useState<FunctionSheetTarget | null>(
    null,
  )
  const focusRequest = useGraphFocusRequest()
  const lastFocusTs = useRef(0)

  const handleNodeClick = useCallback(
    (_event: unknown, node: Node<CodeNodeData>) => {
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
    let cancelled = false
    let fitFrame: number | null = null

    if (!graph) {
      setNodes([])
      setEdges([])
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
        setEdges(xyflow.edges)
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
  }, [fitView, graph, setNodes, setEdges])

  useEffect(() => {
    if (!focusRequest || focusRequest.timestamp === lastFocusTs.current) return
    lastFocusTs.current = focusRequest.timestamp
    const matching = nodes
      .filter((n) => n.data.file === focusRequest.file)
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
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'default',
          pathOptions: { curvature: 0.55 },
        }}
        minZoom={0.05}
        maxZoom={2.5}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} />
      </ReactFlow>
      <FunctionSheet
        root={graph?.root ?? null}
        target={sheetTarget}
        onOpenChange={handleSheetOpenChange}
      />
    </>
  )
}
