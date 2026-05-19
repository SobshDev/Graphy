import path from 'node:path'
import type { Node, SourceFile } from 'ts-morph'

import type { GraphEdge, GraphNode } from './core/models'

export function extractImports(
  sourceFiles: SourceFile[],
  nodes: GraphNode[],
  declarationMap: Map<Node, string>,
  root: string,
): GraphEdge[] {
  const edges: GraphEdge[] = []
  const seen = new Set<string>()

  const nodesByFile = new Map<string, GraphNode[]>()
  for (const node of nodes) {
    const list = nodesByFile.get(node.file)
    if (list) list.push(node)
    else nodesByFile.set(node.file, [node])
  }

  for (const sourceFile of sourceFiles) {
    const relSource = path.relative(root, sourceFile.getFilePath())
    const sourceNodes = nodesByFile.get(relSource)
    if (!sourceNodes || sourceNodes.length === 0) continue

    for (const importDecl of sourceFile.getImportDeclarations()) {
      const targetIds = new Set<string>()

      for (const namedImport of importDecl.getNamedImports()) {
        const nameNode = namedImport.getNameNode()
        const symbol = nameNode.getSymbol()
        if (!symbol) continue
        const candidates = [symbol]
        const aliased = symbol.getAliasedSymbol()
        if (aliased) candidates.push(aliased)
        for (const candidate of candidates) {
          for (const declaration of candidate.getDeclarations()) {
            const id = declarationMap.get(declaration)
            if (id) targetIds.add(id)
          }
        }
      }

      const defaultImport = importDecl.getDefaultImport()
      if (defaultImport) {
        const symbol = defaultImport.getSymbol()
        if (symbol) {
          const candidates = [symbol]
          const aliased = symbol.getAliasedSymbol()
          if (aliased) candidates.push(aliased)
          for (const candidate of candidates) {
            for (const declaration of candidate.getDeclarations()) {
              const id = declarationMap.get(declaration)
              if (id) targetIds.add(id)
            }
          }
        }
      }

      if (targetIds.size === 0) continue

      for (const sourceNode of sourceNodes) {
        for (const targetId of targetIds) {
          if (sourceNode.id === targetId) continue
          const key = `${sourceNode.id}->${targetId}`
          if (seen.has(key)) continue
          seen.add(key)
          edges.push({
            source: sourceNode.id,
            target: targetId,
            type: 'imports',
          })
        }
      }
    }
  }

  return edges
}
