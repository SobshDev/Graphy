import type { ClassInspector } from '@/modules/parser'

import type { AiTool } from '../tools.interface'

interface InspectClassInput {
  id?: string
  name?: string
}

export function createInspectClassTool(inspector: ClassInspector): AiTool {
  return {
    name: 'inspect_class',
    description:
      'Inspect a class: returns the class node, its methods (in source order), external dependencies (callees outside the class), and aggregate caller/callee/body-line counts. Pass either `id` (preferred) or `name` (matches the first class whose bare name equals it).',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description:
            'Exact class node id, formatted as "<relative-file>::<ClassName>". Wins over `name` when both are provided.',
        },
        name: {
          type: 'string',
          description:
            'Bare class name (e.g. "PostService"). Returns the first match.',
        },
      },
      additionalProperties: false,
    },
    handler: (input: unknown) => {
      const { id, name } = input as InspectClassInput
      if (!id && !name) {
        throw new Error('Provide `id` or `name`.')
      }

      const info = id
        ? inspector.findById(id)
        : name
          ? inspector.findByName(name)
          : null

      if (!info) {
        return { found: false, query: { id, name } }
      }

      return {
        found: true,
        class: info.node,
        methods: info.methods,
        externalDependencies: inspector.externalDependencies(info.node.id),
        totalCallers: info.totalCallers,
        totalCallees: info.totalCallees,
        totalLines: info.totalLines,
      }
    },
  }
}
