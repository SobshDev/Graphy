import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import type { Edge, Node, NodeTypes } from '@xyflow/react'
import { useEffect, useMemo } from 'react'

import { CodeNode } from '@/modules/graph/components/code-node'
import type { CodeNodeData } from '@/modules/graph/components/code-node'
import { useGraph } from '@/modules/graph/hooks/use-graph'
import { toXYFlow } from '@/modules/graph/lib/to-xyflow'

const nodeTypes: NodeTypes = { code: CodeNode }

export function GraphCanvas() {
  const { graph, loading, error } = useGraph()

  const xyflow = useMemo(
    () => (graph ? toXYFlow(graph) : { nodes: [], edges: [] }),
    [graph],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CodeNodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  useEffect(() => {
    setNodes(xyflow.nodes)
    setEdges(xyflow.edges)
  }, [xyflow, setNodes, setEdges])

  if (error) {
    return (
      <div className="text-destructive flex h-full items-center justify-center p-6 font-mono text-xs">
        {error.message}
      </div>
    )
  }

  if (loading && nodes.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center font-mono text-xs">
        Parsing…
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
      defaultEdgeOptions={{ type: 'smoothstep' }}
      minZoom={0.2}
      maxZoom={2.5}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} />
    </ReactFlow>
  )
}
