import fs from 'node:fs'
import path from 'node:path'
import { Project, ScriptTarget } from 'ts-morph'
import type { Node, SourceFile } from 'ts-morph'

import { extractClasses } from './classExtractor'
import { extractFunctions } from './functionExtractor'
import { extractObjects } from './objectExtractor'
import type { Graph, GraphEdge, GraphNode } from './core/models'
import { SCHEMA_VERSION, validateGraph } from './core/schema'
import {
  classifyNode,
  extractStructuralEdges,
  makeFileNode,
} from './structureExtractor'

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
    compilerOptions: {
      target: ScriptTarget.ES2022,
      rootDir: root,
      allowJs: true,
    },
    skipAddingFilesFromTsConfig: true,
  })
  return project.addSourceFilesAtPaths([
    `${root}/**/*.ts`,
    `${root}/**/*.tsx`,
    `${root}/**/*.js`,
    `${root}/**/*.jsx`,
    `!${root}/**/node_modules/**`,
    `!${root}/**/dist/**`,
    `!${root}/**/build/**`,
    `!${root}/**/.output/**`,
  ])
}

export function parseProject(root: string): Graph {
  const sourceFiles = loadSourceFiles(root).filter(
    (sourceFile) => !sourceFile.isDeclarationFile(),
  )

  // Pass 1 — collect files, symbols, and the ts-morph-declaration → id map.
  const nodes: GraphNode[] = sourceFiles.map((sourceFile) =>
    makeFileNode(root, sourceFile),
  )
  const declarationMap = new Map<Node, string>()

  for (const sourceFile of sourceFiles) {
    const relativePath = path.relative(root, sourceFile.getFilePath())
    const collected = [
      ...extractFunctions(sourceFile, relativePath),
      ...extractClasses(sourceFile, relativePath),
      ...extractObjects(sourceFile, relativePath),
    ]

    for (const { graphNode, declaration } of collected) {
      const node = classifyNode(graphNode)
      nodes.push(node)
      declarationMap.set(declaration, node.id)
    }
  }

  // Pass 2 — resolve structure-first relationships. We intentionally do not
  // emit direct call edges here; the graph is organized by app/module shape.
  const edges: GraphEdge[] = extractStructuralEdges(
    root,
    sourceFiles,
    declarationMap,
    nodes,
  )

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

export function parseFilesIncremental(
  root: string,
  changedFiles: string[],
  previousGraph: Graph,
): Graph {
  const sourceFiles = loadSourceFiles(root).filter(
    (sourceFile) => !sourceFile.isDeclarationFile(),
  )

  const changedSet = new Set(changedFiles)
  const presentFiles = new Set<string>()

  // Pass 1 — re-extract nodes and ts-morph-declaration map for every file.
  // This is the cheap top-level scan; the expensive AST descent in pass 2 is
  // what we skip for unchanged files.
  const nodes: GraphNode[] = []
  const declarationMap = new Map<Node, string>()

  for (const sourceFile of sourceFiles) {
    const rel = path.relative(root, sourceFile.getFilePath())
    presentFiles.add(rel)
    nodes.push(makeFileNode(root, sourceFile))
    const collected = [
      ...extractFunctions(sourceFile, rel),
      ...extractClasses(sourceFile, rel),
      ...extractObjects(sourceFile, rel),
    ]
    for (const { graphNode, declaration } of collected) {
      const node = classifyNode(graphNode)
      nodes.push(node)
      declarationMap.set(declaration, node.id)
    }
  }

  const nodeIds = new Set(nodes.map((n) => n.id))

  // Pass 2a — keep cached edges that originate from unchanged files and whose
  // endpoints still exist.
  const edges: GraphEdge[] = []
  const seen = new Set<string>()

  for (const cached of previousGraph.edges) {
    const owningFile = edgeSourceFile(cached.source)
    if (owningFile === null) continue
    if (changedSet.has(owningFile)) continue
    if (!presentFiles.has(owningFile)) continue
    if (!nodeIds.has(cached.source) || !nodeIds.has(cached.target)) continue
    const key = `${cached.source}->${cached.target}:${cached.type}`
    if (seen.has(key)) continue
    seen.add(key)
    edges.push(cached)
  }

  // Pass 2b — re-extract structural edges for changed files only.
  const changedSourceFiles = sourceFiles.filter((sourceFile) =>
    changedSet.has(path.relative(root, sourceFile.getFilePath())),
  )
  const fresh = extractStructuralEdges(
    root,
    changedSourceFiles,
    declarationMap,
    nodes,
  )
  for (const edge of fresh) {
    const key = `${edge.source}->${edge.target}:${edge.type}`
    if (seen.has(key)) continue
    seen.add(key)
    edges.push(edge)
  }

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

function edgeSourceFile(source: string): string | null {
  if (!source.startsWith('file:')) return null
  const tail = source.slice('file:'.length)
  const sep = tail.indexOf('::')
  return sep === -1 ? tail : tail.slice(0, sep)
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
