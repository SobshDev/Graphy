import { Node, SyntaxKind } from 'ts-morph'
import type { SourceFile } from 'ts-morph'

import type { GraphEdge } from './core/models'

export function extractCalls(
  sourceFile: SourceFile,
  declarationMap: Map<Node, string>,
): GraphEdge[] {
  const edges: GraphEdge[] = []
  const seen = new Set<string>()

  for (const call of sourceFile.getDescendantsOfKind(
    SyntaxKind.CallExpression,
  )) {
    const targetId = resolveTargetId(call, declarationMap)
    if (!targetId) continue

    const sourceId = resolveSourceId(call, declarationMap)
    if (!sourceId) continue

    if (sourceId === targetId) continue

    const key = `${sourceId}->${targetId}`
    if (seen.has(key)) continue
    seen.add(key)

    edges.push({ source: sourceId, target: targetId, type: 'calls' })
  }

  return edges
}

function resolveTargetId(
  call: Node,
  declarationMap: Map<Node, string>,
): string | undefined {
  if (!Node.isCallExpression(call)) return undefined

  const symbol = call.getExpression().getSymbol()
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

function resolveSourceId(
  call: Node,
  declarationMap: Map<Node, string>,
): string | undefined {
  let current = call.getParent()
  while (current) {
    if (
      Node.isFunctionDeclaration(current) ||
      Node.isMethodDeclaration(current)
    ) {
      return declarationMap.get(current)
    }

    if (Node.isArrowFunction(current) || Node.isFunctionExpression(current)) {
      const parent = current.getParent()
      if (Node.isVariableDeclaration(parent)) {
        return declarationMap.get(parent)
      }
      return undefined
    }

    current = current.getParent()
  }
  return undefined
}
