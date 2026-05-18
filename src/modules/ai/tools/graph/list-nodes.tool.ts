import type { Graph, GraphNode, NodeType } from '@/modules/parser'

import type { AiTool } from '../tools.interface'

const NODE_TYPES: NodeType[] = ['function', 'method', 'arrow', 'class']

interface ListNodesInput {
  type?: NodeType
  filePattern?: string
  namePattern?: string
  limit?: number
}

interface ListedNode {
  id: string
  name: string
  type: NodeType
  file: string
  line: number
  signature: string
}

const DEFAULT_LIMIT = 50

function slim(node: GraphNode): ListedNode {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    file: node.file,
    line: node.line,
    signature: node.signature,
  }
}

export function createListNodesTool(graph: Graph): AiTool {
  return {
    name: 'list_nodes',
    description:
      'List nodes in the parsed code graph. Each node is a function, method, arrow function, or class. Filters are optional and combine with AND. Use this to discover what exists before asking for details with `get_node` or `inspect_class`.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: NODE_TYPES,
          description: 'Restrict results to a single node type.',
        },
        filePattern: {
          type: 'string',
          description:
            'Case-insensitive substring match against the node file path (relative to the project root).',
        },
        namePattern: {
          type: 'string',
          description:
            'Case-insensitive substring match against the node name.',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 200,
          description: `Maximum number of results to return. Defaults to ${DEFAULT_LIMIT}.`,
        },
      },
      additionalProperties: false,
    },
    handler: (input: unknown) => {
      const { type, filePattern, namePattern, limit } = input as ListNodesInput
      const fileNeedle = filePattern?.toLowerCase()
      const nameNeedle = namePattern?.toLowerCase()
      const cap = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), 200)

      const matches: ListedNode[] = []
      for (const node of graph.nodes) {
        if (type && node.type !== type) continue
        if (fileNeedle && !node.file.toLowerCase().includes(fileNeedle))
          continue
        if (nameNeedle && !node.name.toLowerCase().includes(nameNeedle))
          continue
        matches.push(slim(node))
        if (matches.length >= cap) break
      }

      return {
        totalReturned: matches.length,
        truncated: matches.length >= cap,
        nodes: matches,
      }
    },
  }
}
