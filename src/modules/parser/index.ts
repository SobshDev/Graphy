import fs from 'node:fs'
import path from 'node:path'
import { Project, ScriptTarget } from 'ts-morph'
import type { Node, SourceFile } from 'ts-morph'

import { extractCalls } from './callExtractor'
import { extractClasses } from './classExtractor'
import { extractFunctions } from './functionExtractor'
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
export { ClassInspector, inspectClasses } from './classQuery'
export type { ClassInfo } from './classQuery'

function loadSourceFiles(root: string): SourceFile[] {
  const tsConfigPath = path.join(root, 'tsconfig.json')
  if (fs.existsSync(tsConfigPath)) {
    try {
      const project = new Project({ tsConfigFilePath: tsConfigPath })
      return project.getSourceFiles()
    } catch {
      // Fall through to glob if the project's tsconfig is unusable.
    }
  }

  const project = new Project({
    compilerOptions: { target: ScriptTarget.ES2022, rootDir: root },
    skipAddingFilesFromTsConfig: true,
  })
  return project.addSourceFilesAtPaths([
    `${root}/**/*.ts`,
    `${root}/**/*.tsx`,
    `!${root}/**/node_modules/**`,
    `!${root}/**/dist/**`,
    `!${root}/**/build/**`,
    `!${root}/**/.output/**`,
  ])
}

export function parseProject(root: string): Graph {
  const sourceFiles = loadSourceFiles(root)

  // Pass 1 — single walk: collect nodes + the ts-morph-declaration → id map
  const nodes: GraphNode[] = []
  const declarationMap = new Map<Node, string>()

  for (const sourceFile of sourceFiles) {
    const relativePath = path.relative(root, sourceFile.getFilePath())
    const collected = [
      ...extractFunctions(sourceFile, relativePath),
      ...extractClasses(sourceFile, relativePath),
    ]

    for (const { graphNode, declaration } of collected) {
      nodes.push(graphNode)
      declarationMap.set(declaration, graphNode.id)
    }
  }

  // Pass 2 — resolve call edges using the global declaration map
  const edges: GraphEdge[] = []
  for (const sourceFile of sourceFiles) {
    edges.push(...extractCalls(sourceFile, declarationMap))
  }

  // Pass 3 — annotate each node with its in/out degree
  annotateDegrees(nodes, edges)

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

function annotateDegrees(nodes: GraphNode[], edges: GraphEdge[]): void {
  const byId = new Map<string, GraphNode>()
  for (const node of nodes) byId.set(node.id, node)

  for (const edge of edges) {
    const src = byId.get(edge.source)
    const tgt = byId.get(edge.target)
    if (src) src.outDegree += 1
    if (tgt) tgt.inDegree += 1
  }
}
