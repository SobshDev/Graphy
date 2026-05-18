import { inspectClasses } from '@/modules/parser'
import type { Graph } from '@/modules/parser'

import type { AiTool } from '../tools.interface'
import { createFindCalleesTool } from './find-callees.tool'
import { createFindCallersTool } from './find-callers.tool'
import { createGetNodeTool } from './get-node.tool'
import { createInspectClassTool } from './inspect-class.tool'
import { createListNodesTool } from './list-nodes.tool'

export function createGraphTools(graph: Graph | null): AiTool[] {
  if (!graph) return []
  const inspector = inspectClasses(graph)
  return [
    createListNodesTool(graph),
    createGetNodeTool(graph),
    createInspectClassTool(inspector),
    createFindCallersTool(inspector),
    createFindCalleesTool(inspector),
  ]
}
