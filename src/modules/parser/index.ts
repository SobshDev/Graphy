import path from 'node:path'
import type { Node } from 'ts-morph'

import { buildDeclarationMap, extractCalls } from './callExtractor'
import { extractClasses } from './classExtractor'
import { extractFunctions } from './functionExtractor'
import { loadProject } from './projectLoader'
import type { Graph, GraphEdge, GraphNode } from './core/models'
import { SCHEMA_VERSION, validateGraph } from './core/schema'

export type {
  EdgeType,
  Graph,
  GraphEdge,
  GraphNode,
  NodeType,
} from './core/models'
export { SCHEMA_VERSION, serializeGraph, validateGraph } from './core/schema'

export function parseProject(root: string): Graph {
  const project = loadProject(root)
  const sourceFiles = project.addSourceFilesAtPaths([
    `${root}/**/*.ts`,
    `${root}/**/*.tsx`,
  ])

  // Pass 1 — collect every node + a global ts-morph-declaration → node-id map
  const nodes: GraphNode[] = []
  const declarationMap = new Map<Node, string>()

  for (const sourceFile of sourceFiles) {
    const relativePath = path.relative(root, sourceFile.getFilePath())

    nodes.push(
      ...extractFunctions(sourceFile, relativePath),
      ...extractClasses(sourceFile, relativePath),
    )

    for (const [declaration, id] of buildDeclarationMap(
      sourceFile,
      relativePath,
    )) {
      declarationMap.set(declaration, id)
    }
  }

  // Pass 2 — resolve call edges using the global map
  const edges: GraphEdge[] = []
  for (const sourceFile of sourceFiles) {
    edges.push(...extractCalls(sourceFile, declarationMap))
  }

  const graph: Graph = {
    version: SCHEMA_VERSION,
    language: 'typescript',
    root,
    nodes,
    edges,
  }

  validateGraph(graph)
  return graph
}
