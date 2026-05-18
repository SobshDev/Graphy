import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import type { Edge, Node, NodeTypes } from '@xyflow/react'
import { useEffect, useState } from 'react'

import { CodeNode } from '@/modules/graph/components/code-node'
import { useGraph } from '@/modules/graph/hooks/use-graph'
import { toXYFlow } from '@/modules/graph/lib/to-xyflow'
import type { CodeNodeData } from '@/modules/graph/types'

const nodeTypes: NodeTypes = { code: CodeNode }

export function GraphCanvas() {
  const { graph, loading, error } = useGraph()
  const { fitView } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CodeNodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [layouting, setLayouting] = useState(false)
  const [layoutError, setLayoutError] = useState<Error | null>(null)

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
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.25 }}
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{
        type: 'default',
        pathOptions: { curvature: 0.55 },
      }}
      minZoom={0.2}
      maxZoom={2.5}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} />
    </ReactFlow>
  )
}
