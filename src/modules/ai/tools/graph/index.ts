import { inspectClasses } from '@/modules/parser'
import type { Graph } from '@/modules/parser'

import type { AiTool } from '../tools.interface'
import { createFindCalleesTool } from './find-callees.tool'
import { createFindCallersTool } from './find-callers.tool'
import { createFindOrphansTool } from './find-orphans.tool'
import { createFindPathTool } from './find-path.tool'
import { createGetNeighborsTool } from './get-neighbors.tool'
import { createGetNodeTool } from './get-node.tool'
import { createGraphStatsTool } from './graph-stats.tool'
import { createImportedByTool } from './imported-by.tool'
import { createImportsOfTool } from './imports-of.tool'
import { createInspectClassTool } from './inspect-class.tool'
import { createListNodesTool } from './list-nodes.tool'
import { createReadNodeSourceTool } from './read-node-source.tool'
import { createTypeAtTool } from './type-at.tool'

export function createGraphTools(graph: Graph | null): AiTool[] {
  if (!graph) return []
  const inspector = inspectClasses(graph)
  return [
    createListNodesTool(graph),
    createGetNodeTool(graph),
    createInspectClassTool(inspector),
    createFindCallersTool(inspector),
    createFindCalleesTool(inspector),
    createReadNodeSourceTool(graph),
    createImportsOfTool(graph),
    createImportedByTool(graph),
    createTypeAtTool(),
    createGetNeighborsTool(graph, inspector),
    createFindPathTool(graph),
    createGraphStatsTool(graph),
    createFindOrphansTool(graph),
  ]
}
