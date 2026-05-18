import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import type { Edge, Node, NodeTypes } from '@xyflow/react'

import { CodeNode } from '@/components/graph/code-node'
import type { CodeNodeData } from '@/components/graph/code-node'

const nodeTypes: NodeTypes = { code: CodeNode }

const seedNodes: Array<Node<CodeNodeData>> = [
  {
    id: 'a',
    type: 'code',
    position: { x: 0, y: 0 },
    data: { label: 'parseInput', kind: 'function' },
  },
  {
    id: 'b',
    type: 'code',
    position: { x: 260, y: -60 },
    data: { label: 'normalize', kind: 'function' },
  },
  {
    id: 'c',
    type: 'code',
    position: { x: 260, y: 90 },
    data: { label: 'validate', kind: 'function' },
  },
  {
    id: 'd',
    type: 'code',
    position: { x: 540, y: 20 },
    data: { label: 'render', kind: 'function' },
  },
]

const seedEdges: Array<Edge> = [
  { id: 'a-b', source: 'a', target: 'b' },
  { id: 'a-c', source: 'a', target: 'c' },
  { id: 'b-d', source: 'b', target: 'd' },
  { id: 'c-d', source: 'c', target: 'd' },
]

export function GraphCanvas() {
  const [nodes, , onNodesChange] = useNodesState<Node<CodeNodeData>>(seedNodes)
  const [edges, , onEdgesChange] = useEdgesState<Edge>(seedEdges)

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
