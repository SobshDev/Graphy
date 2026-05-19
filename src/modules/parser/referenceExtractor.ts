import { SyntaxKind } from 'ts-morph'
import type { SourceFile, Node } from 'ts-morph'

import type { GraphEdge } from './core/models'

export function extractReferences(
  sourceFile: SourceFile,
  declarationMap: Map<Node, string>,
): GraphEdge[] {
  const edges: GraphEdge[] = []
  const seen = new Set<string>()

  for (const identifier of sourceFile.getDescendantsOfKind(
    SyntaxKind.Identifier,
  )) {
    let targetId: string | undefined
    let sourceId: string | undefined
    try {
      targetId = resolveTargetId(identifier, declarationMap)
      if (!targetId) continue
      sourceId = resolveReferenceSourceId(identifier, declarationMap)
    } catch {
      // ts-morph's checker can throw on partially-resolved symbols. Skip.
      continue
    }
    if (!sourceId || sourceId === targetId) continue

    const key = `${sourceId}->${targetId}`
    if (seen.has(key)) continue
    seen.add(key)

    edges.push({ source: sourceId, target: targetId, type: 'references' })
  }

  return edges
}

function resolveTargetId(
  identifier: Node,
  declarationMap: Map<Node, string>,
): string | undefined {
  const symbol = identifier.getSymbol()
  if (!symbol) return undefined

  const candidates = [symbol]
  const aliased = symbol.getAliasedSymbol()
  if (aliased) candidates.push(aliased)

  for (const candidate of candidates) {
    for (const declaration of candidate.getDeclarations()) {
      const id = declarationMap.get(declaration)
      if (id) return id
    }
  }
  return undefined
}

function resolveReferenceSourceId(
  node: Node,
  declarationMap: Map<Node, string>,
): string | undefined {
  let current = node.getParent()
  while (current) {
    const id = declarationMap.get(current)
    if (id) return id
    current = current.getParent()
  }
  return undefined
}
